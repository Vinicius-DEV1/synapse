package com.synapse.features.notifications.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.MarkEmailRead
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Snooze
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.notifications.model.NotificationItem
import com.synapse.R
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun NotificationCard(
    item: NotificationItem,
    saving: Boolean,
    onMarkRead: () -> Unit,
    onOpenPage: () -> Unit,
    onOpenEvent: () -> Unit,
    onSnooze: () -> Unit,
    onDelete: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = DarkSurface,
        border = BorderStroke(1.dp, if (item.isRead) DarkBorder else BrandIndigoLight.copy(alpha = 0.35f)),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        item.title,
                        modifier = Modifier.weight(1f),
                        color = TextPrimary,
                        fontWeight = if (item.isRead) FontWeight.Medium else FontWeight.Bold,
                        fontSize = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (!item.isRead) {
                        Text("NOVA", color = BrandIndigoLight, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Text(item.message, color = TextSecondary, fontSize = 12.sp, maxLines = 3, overflow = TextOverflow.Ellipsis)
                Text("${item.type} · ${item.scheduledFor ?: item.createdAt}", color = TextSecondary.copy(alpha = 0.75f), fontSize = 10.sp, maxLines = 1)
            }
            Spacer(Modifier.width(4.dp))
            if (item.targetPageId != null) {
                IconButton(onClick = onOpenPage, enabled = !saving) {
                    Icon(
                        Icons.AutoMirrored.Filled.MenuBook,
                        contentDescription = stringResource(R.string.notifications_open_page),
                        tint = BrandIndigoLight,
                    )
                }
            }
            if (item.eventId != null) {
                IconButton(onClick = onOpenEvent, enabled = !saving) {
                    Icon(
                        Icons.Default.CalendarMonth,
                        contentDescription = stringResource(R.string.notifications_open_event),
                        tint = BrandIndigoLight,
                    )
                }
            }
            if (!item.isRead) {
                IconButton(onClick = onSnooze, enabled = !saving) {
                    Icon(
                        Icons.Default.Snooze,
                        contentDescription = stringResource(R.string.notifications_snooze_15),
                        tint = BrandIndigoLight,
                    )
                }
                IconButton(onClick = onMarkRead, enabled = !saving) {
                    Icon(Icons.Default.MarkEmailRead, contentDescription = "Marcar como lida", tint = BrandIndigoLight)
                }
            }
            IconButton(onClick = onDelete, enabled = !saving) {
                Icon(Icons.Default.DeleteOutline, contentDescription = "Mover para a lixeira", tint = IncorrectRoseText)
            }
        }
    }
}
