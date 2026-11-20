package com.synapse.features.calendar.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.calendar.model.CalendarEventItem
import com.synapse.ui.theme.*

@Composable
fun CalendarEventCard(
    event: CalendarEventItem,
    onToggleComplete: () -> Unit,
    onDelete: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = DarkSurface,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (event.isCompleted) CorrectEmerald.copy(alpha = 0.2f) else DarkBorder
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(38.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(event.color)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = event.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (event.isCompleted) TextMuted else TextPrimary,
                    textDecoration = if (event.isCompleted) TextDecoration.LineThrough else null
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "${event.date} às ${event.time}" +
                        if (event.description.isNotBlank()) " • ${event.description}" else "",
                    fontSize = 12.sp,
                    color = TextSecondary,
                    maxLines = 1
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(if (event.isCompleted) CorrectEmeraldBg else DarkSurfaceElevated)
                    .border(
                        1.dp,
                        if (event.isCompleted) CorrectEmerald else DarkBorder,
                        CircleShape
                    )
                    .clickable(onClick = onToggleComplete),
                contentAlignment = Alignment.Center
            ) {
                if (event.isCompleted) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = "Concluído",
                        tint = CorrectEmeraldText,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.width(6.dp))
            IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Excluir",
                    tint = TextMuted,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}
