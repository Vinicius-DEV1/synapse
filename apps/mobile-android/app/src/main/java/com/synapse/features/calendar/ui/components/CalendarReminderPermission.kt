package com.synapse.features.calendar.ui.components

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import com.synapse.features.notifications.platform.AndroidNotificationScheduler

@Composable
internal fun rememberCalendarReminderPermissionRequester(
    context: Context,
    isSaving: Boolean,
    onDenied: () -> Unit,
): () -> Unit {
    var restoreScheduledAfterPermission by remember { mutableStateOf(false) }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) restoreScheduledAfterPermission = true else onDenied()
    }
    LaunchedEffect(isSaving, restoreScheduledAfterPermission) {
        if (!isSaving && restoreScheduledAfterPermission) {
            AndroidNotificationScheduler(context).restoreScheduled()
            restoreScheduledAfterPermission = false
        }
    }
    return remember(context, permissionLauncher) {
        {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
}
