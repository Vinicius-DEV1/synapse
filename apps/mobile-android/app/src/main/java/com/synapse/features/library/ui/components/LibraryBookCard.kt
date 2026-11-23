package com.synapse.features.library.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.library.model.BookItem
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.CorrectEmeraldBg
import com.synapse.ui.theme.CorrectEmeraldText
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun LibraryBookCard(
    book: BookItem,
    enabled: Boolean,
    onAdjustProgress: (Int) -> Unit,
    onManage: () -> Unit,
) {
    val progressRatio = if (book.totalPages > 0) book.currentPage.toFloat() / book.totalPages else 0f
    val percentage = (progressRatio * 100).toInt()

    Surface(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)),
        color = DarkSurface,
        border = BorderStroke(1.dp, DarkBorder),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(text = book.coverEmoji, fontSize = 26.sp)
                    Column {
                        Text(book.title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(book.author, fontSize = 12.sp, color = TextMuted)
                    }
                }
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = when (book.status) {
                        "Concluído" -> CorrectEmeraldBg
                        "Lendo" -> BrandIndigo.copy(alpha = 0.2f)
                        else -> DarkSurfaceElevated
                    },
                ) {
                    Text(
                        text = book.status,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = when (book.status) {
                            "Concluído" -> CorrectEmeraldText
                            "Lendo" -> BrandIndigoLight
                            else -> TextMuted
                        },
                    )
                }
                IconButton(onClick = onManage) {
                    Icon(Icons.Default.MoreVert, contentDescription = "Gerenciar livro", tint = TextSecondary)
                }
            }

            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { progressRatio.coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                color = BrandIndigo,
                trackColor = DarkSurfaceElevated,
            )
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Pág. ${book.currentPage} de ${book.totalPages} ($percentage%)", fontSize = 11.sp, color = TextSecondary)
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    ProgressAction("-1", enabled, DarkSurfaceElevated, TextSecondary) { onAdjustProgress(-1) }
                    ProgressAction("+1", enabled, BrandIndigo.copy(alpha = 0.3f), BrandIndigoLight, true) {
                        onAdjustProgress(1)
                    }
                    ProgressAction("+5", enabled, BrandIndigo.copy(alpha = 0.3f), BrandIndigoLight, true) {
                        onAdjustProgress(5)
                    }
                }
            }
        }
    }
}

@Composable
private fun ProgressAction(
    label: String,
    enabled: Boolean,
    background: Color,
    foreground: Color,
    emphasized: Boolean = false,
    onClick: () -> Unit,
) {
    Surface(
        modifier = Modifier.clip(RoundedCornerShape(6.dp)).clickable(enabled = enabled, onClick = onClick),
        color = background,
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
            fontSize = 11.sp,
            color = foreground,
            fontWeight = if (emphasized) FontWeight.Bold else FontWeight.Normal,
        )
    }
}
