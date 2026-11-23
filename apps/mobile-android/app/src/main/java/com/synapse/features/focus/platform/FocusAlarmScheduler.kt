package com.synapse.features.focus.platform

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.synapse.core.SynapseFocusStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.focus.model.FocusAlarmItem
import java.time.LocalDateTime
import java.time.LocalTime

internal class FocusAlarmScheduler(context: Context) {
    private val appContext = context.applicationContext
    private val preferences = appContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    fun reconcile(alarms: List<FocusAlarmItem>) {
        val tracked = preferences.getStringSet(KEY_ALARM_IDS, emptySet()).orEmpty().toSet()
        tracked.forEach(::cancelPending)
        if (!canPostNotifications()) {
            saveTrackedIds(emptySet())
            return
        }

        val activeIds = alarms.filter { it.enabled }.mapTo(mutableSetOf()) { it.id }
        alarms.filter { it.enabled }.forEach(::schedule)
        saveTrackedIds(activeIds)
    }

    fun restoreFromCore() {
        if (!canPostNotifications()) return
        val store = SynapseFocusStore.open(SynapseDatabase.path(appContext))
        val alarms = try {
            store.getAlarms().map { record ->
                FocusAlarmItem(
                    id = record.id,
                    time = record.time,
                    label = record.label.orEmpty(),
                    enabled = record.enabled == 1,
                )
            }
        } finally {
            store.close()
        }
        reconcile(alarms)
    }

    fun consume(id: String) {
        val tracked = preferences.getStringSet(KEY_ALARM_IDS, emptySet()).orEmpty().toMutableSet()
        tracked.remove(id)
        saveTrackedIds(tracked)
    }

    private fun schedule(alarm: FocusAlarmItem) {
        val time = runCatching { LocalTime.parse(alarm.time) }.getOrElse { error ->
            Log.e(TAG, "Skipping focus alarm with invalid time: ${alarm.id}", error)
            return
        }
        val now = LocalDateTime.now()
        var next = LocalDateTime.of(now.toLocalDate(), time)
        if (!next.isAfter(now)) next = next.plusDays(1)
        val manager = appContext.getSystemService(AlarmManager::class.java) ?: return
        try {
            manager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                next.atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli(),
                alarmIntent(alarm),
            )
        } catch (error: SecurityException) {
            Log.e(TAG, "Android rejected scheduling focus alarm ${alarm.id}", error)
        }
    }

    private fun cancelPending(id: String) {
        val manager = appContext.getSystemService(AlarmManager::class.java) ?: return
        val pendingIntent = pendingIntent(id, null, null)
        manager.cancel(pendingIntent)
        pendingIntent.cancel()
    }

    private fun alarmIntent(alarm: FocusAlarmItem): PendingIntent = pendingIntent(alarm.id, alarm.time, alarm.label)

    private fun pendingIntent(id: String, time: String?, label: String?): PendingIntent = PendingIntent.getBroadcast(
        appContext,
        id.hashCode(),
        Intent(appContext, FocusAlarmReceiver::class.java).apply {
            action = ACTION_FOCUS_ALARM
            data = Uri.parse("synapse://focus/alarms/$id")
            putExtra(EXTRA_ALARM_ID, id)
            if (time != null) putExtra(EXTRA_ALARM_TIME, time)
            if (label != null) putExtra(EXTRA_ALARM_LABEL, label)
        },
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    private fun saveTrackedIds(ids: Set<String>) {
        if (!preferences.edit().putStringSet(KEY_ALARM_IDS, ids).commit()) {
            Log.e(TAG, "Could not persist focus alarm IDs for reboot restoration")
        }
    }

    private fun canPostNotifications(): Boolean = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        ContextCompat.checkSelfPermission(appContext, Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED

    private companion object {
        const val TAG = "SynapseFocusAlarm"
        const val PREFERENCES = "synapse_focus_alarms"
        const val KEY_ALARM_IDS = "scheduled_ids"
    }
}

internal const val ACTION_FOCUS_ALARM = "com.synapse.focus.SHOW_ALARM"
internal const val EXTRA_ALARM_ID = "focus_alarm_id"
internal const val EXTRA_ALARM_TIME = "focus_alarm_time"
internal const val EXTRA_ALARM_LABEL = "focus_alarm_label"
