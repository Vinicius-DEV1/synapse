package com.synapse.features.focus.platform

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
import androidx.core.content.ContextCompat
import com.synapse.MainActivity
import com.synapse.NavItem
import com.synapse.R
import com.synapse.core.SynapseFocusStore
import com.synapse.data.SynapseDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class FocusAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(EXTRA_ALARM_ID) ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) return

        val pendingResult = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                val store = SynapseFocusStore.open(SynapseDatabase.path(context.applicationContext))
                val isActive = try {
                    store.disableAlarm(id)
                } finally {
                    store.close()
                }
                FocusAlarmScheduler(context).consume(id)
                if (isActive) postAlarm(context, id, intent)
            } catch (error: Exception) {
                Log.e(TAG, "Failed to deliver focus alarm $id", error)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private fun postAlarm(context: Context, id: String, intent: Intent) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        createChannel(context, manager)
        val time = intent.getStringExtra(EXTRA_ALARM_TIME).orEmpty()
        val label = intent.getStringExtra(EXTRA_ALARM_LABEL).orEmpty().ifBlank { context.getString(R.string.focus_alarm_default) }
        val contentIntent = PendingIntent.getActivity(
            context,
            id.hashCode(),
            Intent(context, MainActivity::class.java).putExtra(MainActivity.EXTRA_INITIAL_MODULE, NavItem.FOCUS.name),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        manager.notify(
            id.hashCode(),
            Notification.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(label)
                .setContentText(context.getString(R.string.focus_alarm_notification_message, time))
                .setCategory(Notification.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(contentIntent)
                .build(),
        )
    }

    private fun createChannel(context: Context, manager: NotificationManager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.focus_alarm_channel_name),
                NotificationManager.IMPORTANCE_HIGH,
            ).apply { description = context.getString(R.string.focus_alarm_channel_description) },
        )
    }

    private companion object {
        const val TAG = "SynapseFocusAlarm"
        const val CHANNEL_ID = "synapse-focus-alarms"
    }
}
