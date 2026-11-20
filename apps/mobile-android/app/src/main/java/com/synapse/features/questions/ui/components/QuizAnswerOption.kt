package com.synapse.features.questions.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.CorrectEmerald
import com.synapse.ui.theme.CorrectEmeraldBg
import com.synapse.ui.theme.CorrectEmeraldText
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRose
import com.synapse.ui.theme.IncorrectRoseBg
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun QuizAnswerOption(
    index: Int,
    text: String,
    selected: Boolean,
    correct: Boolean,
    confirmed: Boolean,
    onClick: () -> Unit,
) {
    val cardBackground = when {
        !confirmed -> if (selected) DarkSurfaceElevated else DarkSurface
        correct -> CorrectEmeraldBg
        selected -> IncorrectRoseBg
        else -> DarkSurface
    }
    val cardBorder = when {
        !confirmed -> if (selected) BrandIndigo else DarkBorder
        correct -> CorrectEmerald
        selected -> IncorrectRose
        else -> DarkBorder
    }
    val textColor = when {
        !confirmed -> if (selected) Color.White else TextPrimary
        correct -> CorrectEmeraldText
        selected -> IncorrectRoseText
        else -> TextSecondary
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(cardBackground)
            .border(1.dp, cardBorder, RoundedCornerShape(10.dp))
            .clickable(enabled = !confirmed, onClick = onClick)
            .padding(16.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(if (selected) BrandIndigo else Color(0x26FFFFFF)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = ('A'.code + index).toChar().toString(),
                    color = if (selected) Color.White else TextSecondary,
                    fontSize = 13.sp,
                )
            }
            Text(
                text = text,
                color = textColor,
                fontSize = 15.sp,
                lineHeight = 22.sp,
                modifier = Modifier.weight(1f),
            )
        }
    }
}
