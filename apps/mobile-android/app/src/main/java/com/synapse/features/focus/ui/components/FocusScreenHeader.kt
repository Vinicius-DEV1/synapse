package com.synapse.features.focus.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.R
import com.synapse.features.focus.data.FocusDailyStats
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
internal fun FocusScreenHeader(
    stats: FocusDailyStats,
    onOpenLofi: () -> Unit,
    onOpenHelp: () -> Unit,
    onOpenAlarms: () -> Unit,
    onOpenHistory: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            Text("Foco & Lo-Fi Pomodoro", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text(
                "${stats.completedSessions} ciclos concluídos hoje (${stats.completedMinutes} min)",
                fontSize = 13.sp,
                color = TextSecondary,
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onOpenHelp) {
                Icon(Icons.AutoMirrored.Filled.HelpOutline, contentDescription = stringResource(R.string.focus_help_action), tint = TextSecondary)
            }
            IconButton(onClick = onOpenLofi) {
                Icon(Icons.Default.MusicNote, contentDescription = stringResource(R.string.focus_lofi_action), tint = TextSecondary)
            }
            IconButton(onClick = onOpenAlarms) {
                Icon(Icons.Default.Alarm, contentDescription = stringResource(R.string.focus_alarms_action), tint = TextSecondary)
            }
            IconButton(onClick = onOpenHistory) {
                Icon(Icons.Default.History, contentDescription = stringResource(R.string.focus_history_action), tint = TextSecondary)
            }
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = DarkSurfaceElevated,
                border = BorderStroke(1.dp, DarkBorder),
                modifier = Modifier.padding(4.dp),
            ) {
                Icon(
                    Icons.Default.HourglassTop,
                    contentDescription = "Foco",
                    tint = BrandIndigoLight,
                    modifier = Modifier.padding(8.dp),
                )
            }
        }
    }
}
