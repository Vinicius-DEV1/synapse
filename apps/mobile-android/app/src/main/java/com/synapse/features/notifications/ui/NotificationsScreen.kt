package com.synapse.features.notifications.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.core.content.ContextCompat
import com.synapse.R
import com.synapse.features.notifications.ui.components.NotificationCard
import com.synapse.features.notifications.model.NotificationItem
import com.synapse.features.notifications.viewmodel.NotificationsViewModel
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun NotificationsScreen(onOpenTarget: (String?, String?) -> Unit = { _, _ -> }) {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = NotificationsViewModel(context) as T
        }
    }
    val viewModel: NotificationsViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    var showUnreadOnly by remember { mutableStateOf(false) }
    var pendingSnoozeItem by remember { mutableStateOf<NotificationItem?>(null) }
    var notificationPermissionDenied by remember { mutableStateOf(false) }
    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        val item = pendingSnoozeItem
        pendingSnoozeItem = null
        if (granted && item != null) {
            notificationPermissionDenied = false
            viewModel.snooze(item, context.getString(R.string.notifications_snooze_suffix))
        } else {
            notificationPermissionDenied = true
        }
    }
    val visibleItems = remember(state.items, showUnreadOnly) {
        if (showUnreadOnly) state.items.filterNot { it.isRead } else state.items
    }

    Scaffold(containerColor = DarkCanvas) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            Spacer(Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text("Notificações", color = TextPrimary, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text("${state.unreadCount} não lidas", color = TextSecondary, fontSize = 13.sp)
                }
                TextButton(onClick = viewModel::markAllRead, enabled = state.unreadCount > 0 && !state.saving) {
                    Text("Ler todas", color = TextSecondary)
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = { showUnreadOnly = false }) {
                    Text("Todas", color = if (showUnreadOnly) TextSecondary else TextPrimary)
                }
                TextButton(onClick = { showUnreadOnly = true }) {
                    Text("Não lidas", color = if (showUnreadOnly) TextPrimary else TextSecondary)
                }
                TextButton(onClick = viewModel::refresh, enabled = !state.loading && !state.saving) {
                    Text("Atualizar", color = TextSecondary)
                }
            }

            if (notificationPermissionDenied) {
                Text(
                    stringResource(R.string.notifications_permission_denied),
                    color = IncorrectRoseText,
                    fontSize = 12.sp,
                )
            }

            if (state.error != null) {
                Column {
                    Text(state.error.orEmpty(), color = IncorrectRoseText, fontSize = 13.sp)
                    TextButton(onClick = viewModel::refresh, enabled = !state.loading && !state.saving) {
                        Text("Tentar novamente", color = TextSecondary)
                    }
                }
            }

            when {
                state.loading && state.items.isEmpty() -> CircularProgressIndicator(
                    modifier = Modifier.padding(top = 32.dp).align(Alignment.CenterHorizontally),
                )
                visibleItems.isEmpty() -> Text(
                    if (showUnreadOnly) "Não há notificações não lidas." else "Você não tem notificações.",
                    modifier = Modifier.fillMaxWidth().weight(1f).padding(top = 24.dp),
                    color = TextMuted,
                )
                else -> LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(visibleItems, key = { it.id }) { item ->
                        NotificationCard(
                            item = item,
                            saving = state.saving,
                            onMarkRead = { viewModel.markRead(item) },
                            onOpenPage = { onOpenTarget(item.targetPageId, null) },
                            onOpenEvent = { onOpenTarget(null, item.eventId) },
                            onSnooze = {
                                val canPostNotifications = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                                    ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
                                    PackageManager.PERMISSION_GRANTED
                                if (canPostNotifications) {
                                    notificationPermissionDenied = false
                                    viewModel.snooze(item, context.getString(R.string.notifications_snooze_suffix))
                                } else {
                                    pendingSnoozeItem = item
                                    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                                }
                            },
                            onDelete = { viewModel.delete(item) },
                        )
                    }
                }
            }
        }
    }
}
