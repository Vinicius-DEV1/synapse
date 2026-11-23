package com.synapse.features.notifications.platform

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import com.synapse.MainActivity
import com.synapse.NavItem
import com.synapse.R
import androidx.core.content.ContextCompat
import com.synapse.core.SynapseCalendarStore
import com.synapse.core.SynapseNotificationsStore
import com.synapse.data.SynapseDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class NotificationAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val notificationId = intent.getStringExtra(EXTRA_NOTIFICATION_ID) ?: return
        val title = intent.getStringExtra(EXTRA_NOTIFICATION_TITLE) ?: return
        val message = intent.getStringExtra(EXTRA_NOTIFICATION_MESSAGE) ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) return

        val pendingResult = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                try {
                    markReminderDelivered(context, notificationId, intent)
                } catch (error: Exception) {
                    Log.e(TAG, "Could not mark reminder delivery in the Core database: $notificationId", error)
                }
                try {
                    AndroidNotificationScheduler(context).consumeScheduled(notificationId)
                } catch (error: Exception) {
                    Log.e(TAG, "Could not clear delivered reminder alarm state: $notificationId", error)
                }
                postNotification(context, intent, notificationId, title, message)
            } catch (error: SecurityException) {
                Log.e(TAG, "Android rejected notification delivery: $notificationId", error)
            } catch (error: Exception) {
                Log.e(TAG, "Failed to deliver notification: $notificationId", error)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun markReminderDelivered(context: Context, notificationId: String, intent: Intent) {
        val databasePath = SynapseDatabase.path(context.applicationContext)
        val notificationsStore = SynapseNotificationsStore.open(databasePath)
        val delivered = try {
            notificationsStore.markDelivered(notificationId)
        } finally {
            notificationsStore.close()
        }
        val eventId = intent.getStringExtra(EXTRA_NOTIFICATION_EVENT_ID)
        val reminderMinutes = intent.takeIf { it.hasExtra(EXTRA_NOTIFICATION_REMINDER_MINUTES) }
            ?.getIntExtra(EXTRA_NOTIFICATION_REMINDER_MINUTES, 0)
        if (!delivered || eventId.isNullOrBlank() || reminderMinutes == null) return

        val calendarStore = SynapseCalendarStore.open(databasePath)
        try {
            calendarStore.markReminderNotified(eventId, reminderMinutes)
        } finally {
            calendarStore.close()
        }
    }

    private fun postNotification(
        context: Context,
        intent: Intent,
        notificationId: String,
        title: String,
        message: String,
    ) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        createChannel(context, manager)
        val contentIntent = PendingIntent.getActivity(
            context,
            notificationId.hashCode(),
            Intent(context, MainActivity::class.java)
                .putExtra(MainActivity.EXTRA_INITIAL_MODULE, NavItem.NOTIFICATIONS.name)
                .putExtra(MainActivity.EXTRA_NOTIFICATION_PAGE_ID, intent.getStringExtra(EXTRA_NOTIFICATION_PAGE_ID))
                .putExtra(MainActivity.EXTRA_NOTIFICATION_EVENT_ID, intent.getStringExtra(EXTRA_NOTIFICATION_EVENT_ID)),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .build()
        manager.notify(notificationId.hashCode(), notification)
    }

    private fun createChannel(context: Context, manager: NotificationManager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.notifications_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = context.getString(R.string.notifications_channel_description)
            },
        )
    }

    private companion object {
        const val TAG = "SynapseNotification"
    }
}
