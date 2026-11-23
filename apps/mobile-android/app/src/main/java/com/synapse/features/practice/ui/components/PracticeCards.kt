package com.synapse.features.practice.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.practice.model.PracticeMemory
import com.synapse.features.practice.model.PracticeMessage
import com.synapse.features.practice.model.PracticeSession
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun PracticeSessionCard(
    session: PracticeSession,
    selected: Boolean,
    enabled: Boolean,
    onSelect: () -> Unit,
    onDelete: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(enabled = enabled, onClick = onSelect),
        shape = RoundedCornerShape(14.dp),
        color = if (selected) BrandIndigo.copy(alpha = 0.15f) else DarkSurface,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (selected) BrandIndigo.copy(alpha = 0.45f) else DarkBorder,
        ),
    ) {
        Row(
            modifier = Modifier.padding(start = 14.dp, top = 12.dp, end = 4.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(session.title, color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(session.startedAt, color = TextMuted, fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
            }
            IconButton(onClick = onDelete, enabled = enabled) {
                Icon(Icons.Default.DeleteOutline, contentDescription = "Excluir sessão", tint = TextSecondary)
            }
        }
    }
}

@Composable
fun PracticeMessageCard(message: PracticeMessage) {
    val isUser = message.role == "user"
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = if (isUser) BrandIndigo.copy(alpha = 0.12f) else DarkSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = when (message.role) {
                    "user" -> "Você"
                    "model", "assistant" -> "Assistente"
                    else -> message.role
                },
                color = if (isUser) TextPrimary else TextSecondary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
            )
            Text(
                text = message.text,
                color = TextPrimary,
                fontSize = 14.sp,
                lineHeight = 20.sp,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
    }
}

@Composable
fun PracticeMemoryCard(memory: PracticeMemory, enabled: Boolean, onDelete: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = DarkSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
    ) {
        Row(
            modifier = Modifier.padding(start = 14.dp, top = 12.dp, end = 4.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(memory.category, color = TextSecondary, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                Text(memory.fact, color = TextPrimary, fontSize = 14.sp, modifier = Modifier.padding(top = 5.dp))
            }
            IconButton(onClick = onDelete, enabled = enabled) {
                Icon(Icons.Default.DeleteOutline, contentDescription = "Excluir memória", tint = TextSecondary)
            }
        }
    }
}
