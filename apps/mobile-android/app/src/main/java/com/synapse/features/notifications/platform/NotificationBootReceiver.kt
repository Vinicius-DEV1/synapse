package com.synapse.features.notifications.platform

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.synapse.features.focus.platform.FocusAlarmScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class NotificationBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val pendingResult = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                AndroidNotificationScheduler(context).restoreScheduled()
                FocusAlarmScheduler(context).restoreFromCore()
            } catch (error: Exception) {
                Log.e(TAG, "Failed to restore scheduled notifications after reboot", error)
            } finally {
                pendingResult.finish()
            }
        }
    }

    private companion object {
        const val TAG = "SynapseNotificationBoot"
    }
}
