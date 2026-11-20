package com.synapse.features.culture.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.culture.model.CultureMediaItem
import com.synapse.ui.theme.*

@Composable
fun CultureMediaCard(
    item: CultureMediaItem,
    onOpenDetails: () -> Unit,
    onDecrementProgress: () -> Unit,
    onIncrementProgress: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onOpenDetails),
        color = DarkSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(DarkSurfaceElevated)
                    .border(1.dp, DarkBorder, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = when (item.type) {
                        "movie" -> "🎬"
                        "series" -> "📺"
                        "anime" -> "🎌"
                        else -> "📖"
                    },
                    fontSize = 24.sp
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("★ ${item.score}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = AmberWarningText)
                    Text("${item.currentProgress}/${item.totalProgress} ep", fontSize = 12.sp, color = TextSecondary)
                    Text(
                        text = when (item.status) {
                            "watching" -> "Assistindo"
                            "completed" -> "Concluído"
                            else -> "Planejado"
                        },
                        fontSize = 11.sp,
                        color = when (item.status) {
                            "completed" -> CorrectEmeraldText
                            "watching" -> AmberWarningText
                            else -> TextMuted
                        }
                    )
                }
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                ProgressButton(label = "-", onClick = onDecrementProgress)
                ProgressButton(label = "+", onClick = onIncrementProgress)
            }
        }
    }
}

@Composable
private fun ProgressButton(label: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(28.dp)
            .clip(CircleShape)
            .background(DarkSurfaceElevated)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(label, color = TextPrimary, fontWeight = FontWeight.Bold)
    }
}
