package com.synapse.features.notifications.platform

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.synapse.R
import com.synapse.features.notifications.model.NotificationItem
import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.time.OffsetDateTime
import java.util.Base64

internal class AndroidNotificationScheduler(context: Context) {
    private val appContext = context.applicationContext
    private val reminders = appContext.getSharedPreferences(REMINDERS_PREFERENCES, Context.MODE_PRIVATE)

    fun canPostNotifications(): Boolean = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        ContextCompat.checkSelfPermission(appContext, Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED

    fun schedule(item: NotificationItem) {
        val scheduledFor = item.scheduledFor ?: return
        val triggerAtMillis = try {
            OffsetDateTime.parse(scheduledFor).toInstant().toEpochMilli()
        } catch (error: Exception) {
            Log.e(TAG, "Cannot schedule notification with an invalid timestamp: ${item.id}", error)
            return
        }
        val effectiveTriggerAtMillis = maxOf(triggerAtMillis, System.currentTimeMillis() + IMMEDIATE_TRIGGER_DELAY_MILLIS)

        persistReminder(item, effectiveTriggerAtMillis)
        if (!canPostNotifications()) return
        createNotificationChannel()
        scheduleAlarm(item, effectiveTriggerAtMillis)
    }

    fun restoreScheduled() {
        if (!canPostNotifications()) return
        reminders.all.forEach { (key, rawValue) ->
            if (!key.startsWith(REMINDER_PREFIX) || rawValue !is String) return@forEach
            val reminder = runCatching { JSONObject(rawValue) }.getOrElse { error ->
                Log.e(TAG, "Cannot restore a malformed scheduled reminder", error)
                reminders.edit().remove(key).commit()
                return@forEach
            }
            val id = reminder.optString(FIELD_ID).takeIf(String::isNotBlank) ?: run {
                reminders.edit().remove(key).commit()
                return@forEach
            }
            val item = NotificationItem(
                id = id,
                title = reminder.optString(FIELD_TITLE),
                message = reminder.optString(FIELD_MESSAGE),
                type = "",
                targetPageId = reminder.optString(FIELD_PAGE_ID).takeIf(String::isNotBlank),
                eventId = reminder.optString(FIELD_EVENT_ID).takeIf(String::isNotBlank),
                scheduledFor = null,
                firedAt = "",
                isRead = false,
                createdAt = "",
                eventReminderMinutes = reminder.takeIf { it.has(FIELD_EVENT_REMINDER_MINUTES) }
                    ?.optInt(FIELD_EVENT_REMINDER_MINUTES),
            )
            val triggerAtMillis = reminder.optLong(FIELD_TRIGGER_AT, 0L)
            val effectiveTriggerAtMillis = maxOf(
                triggerAtMillis,
                System.currentTimeMillis() + IMMEDIATE_TRIGGER_DELAY_MILLIS,
            )
            if (effectiveTriggerAtMillis != triggerAtMillis) {
                reminder.put(FIELD_TRIGGER_AT, effectiveTriggerAtMillis)
                if (!reminders.edit().putString(key, reminder.toString()).commit()) {
                    Log.e(TAG, "Could not persist a restored reminder trigger time: $id")
                }
            }
            createNotificationChannel()
            scheduleAlarm(item, effectiveTriggerAtMillis)
        }
    }

    private fun scheduleAlarm(item: NotificationItem, triggerAtMillis: Long) {
        val alarmManager = appContext.getSystemService(AlarmManager::class.java) ?: return
        val pendingIntent = notificationIntent(item)
        try {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        } catch (error: SecurityException) {
            Log.e(TAG, "Android rejected scheduling notification ${item.id}", error)
        }
    }

    fun cancel(notificationId: String) {
        reminders.edit().remove(reminderKey(notificationId)).commit()
        val alarmManager = appContext.getSystemService(AlarmManager::class.java) ?: return
        val pendingIntent = PendingIntent.getBroadcast(
            appContext,
            notificationId.hashCode(),
            Intent(appContext, NotificationAlarmReceiver::class.java).apply {
                action = ACTION_SHOW_NOTIFICATION
                data = notificationUri(notificationId)
            },
            PENDING_INTENT_FLAGS,
        )
        alarmManager.cancel(pendingIntent)
        pendingIntent.cancel()
        appContext.getSystemService(NotificationManager::class.java)?.cancel(notificationId.hashCode())
    }

    fun consumeScheduled(notificationId: String) {
        reminders.edit().remove(reminderKey(notificationId)).commit()
    }

    private fun persistReminder(item: NotificationItem, triggerAtMillis: Long) {
        val value = JSONObject()
            .put(FIELD_ID, item.id)
            .put(FIELD_TITLE, item.title)
            .put(FIELD_MESSAGE, item.message)
            .put(FIELD_PAGE_ID, item.targetPageId)
            .put(FIELD_EVENT_ID, item.eventId)
            .put(FIELD_EVENT_REMINDER_MINUTES, item.eventReminderMinutes)
            .put(FIELD_TRIGGER_AT, triggerAtMillis)
            .toString()
        if (!reminders.edit().putString(reminderKey(item.id), value).commit()) {
            Log.e(TAG, "Could not persist scheduled reminder ${item.id} for reboot restoration")
        }
    }

    private fun reminderKey(notificationId: String): String = REMINDER_PREFIX + Base64.getUrlEncoder()
        .withoutPadding()
        .encodeToString(notificationId.toByteArray(StandardCharsets.UTF_8))

    private fun notificationIntent(item: NotificationItem): PendingIntent = PendingIntent.getBroadcast(
        appContext,
        item.id.hashCode(),
        Intent(appContext, NotificationAlarmReceiver::class.java).apply {
            action = ACTION_SHOW_NOTIFICATION
            data = notificationUri(item.id)
            putExtra(EXTRA_NOTIFICATION_ID, item.id)
            putExtra(EXTRA_NOTIFICATION_TITLE, item.title)
            putExtra(EXTRA_NOTIFICATION_MESSAGE, item.message)
            item.targetPageId?.let { putExtra(EXTRA_NOTIFICATION_PAGE_ID, it) }
            item.eventId?.let { putExtra(EXTRA_NOTIFICATION_EVENT_ID, it) }
            item.eventReminderMinutes?.let { putExtra(EXTRA_NOTIFICATION_REMINDER_MINUTES, it) }
        },
        PENDING_INTENT_FLAGS,
    )

    private fun notificationUri(notificationId: String): Uri = Uri.parse("synapse://notifications/$notificationId")

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = appContext.getSystemService(NotificationManager::class.java) ?: return
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                appContext.getString(R.string.notifications_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = appContext.getString(R.string.notifications_channel_description)
            },
        )
    }

    private companion object {
        const val TAG = "SynapseNotification"
        const val PENDING_INTENT_FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        const val REMINDERS_PREFERENCES = "synapse_scheduled_reminders"
        const val REMINDER_PREFIX = "reminder_"
        const val FIELD_ID = "id"
        const val FIELD_TITLE = "title"
        const val FIELD_MESSAGE = "message"
        const val FIELD_PAGE_ID = "pageId"
        const val FIELD_EVENT_ID = "eventId"
        const val FIELD_EVENT_REMINDER_MINUTES = "eventReminderMinutes"
        const val FIELD_TRIGGER_AT = "triggerAtMillis"
        const val IMMEDIATE_TRIGGER_DELAY_MILLIS = 2_000L
    }
}

internal const val CHANNEL_ID = "synapse-reminders"
internal const val ACTION_SHOW_NOTIFICATION = "com.synapse.notifications.SHOW"
internal const val EXTRA_NOTIFICATION_ID = "notification_id"
internal const val EXTRA_NOTIFICATION_TITLE = "notification_title"
internal const val EXTRA_NOTIFICATION_MESSAGE = "notification_message"
internal const val EXTRA_NOTIFICATION_PAGE_ID = "notification_page_id"
internal const val EXTRA_NOTIFICATION_EVENT_ID = "notification_event_id"
internal const val EXTRA_NOTIFICATION_REMINDER_MINUTES = "notification_reminder_minutes"
