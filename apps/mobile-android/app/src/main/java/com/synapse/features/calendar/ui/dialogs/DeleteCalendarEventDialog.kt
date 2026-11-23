package com.synapse.features.calendar.ui.dialogs

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import com.synapse.R
import androidx.compose.ui.text.font.FontWeight
import com.synapse.features.calendar.model.CalendarEventItem
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun DeleteCalendarEventDialog(
    event: CalendarEventItem,
    saving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    onConfirmSeries: () -> Unit,
) {
    val hasSeries = event.recurrenceRule?.startsWith("group_") == true
    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = { Text("Excluir compromisso?", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            Text(
                stringResource(if (hasSeries) R.string.calendar_delete_series_prompt else R.string.calendar_delete_event_prompt, event.title),
                color = TextSecondary,
            )
        },
        confirmButton = {
            Row(horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onConfirm, enabled = !saving) {
                    Text(stringResource(if (hasSeries) R.string.calendar_delete_this_event else R.string.calendar_delete_action), color = IncorrectRoseText)
                }
                if (hasSeries) {
                    TextButton(onClick = onConfirmSeries, enabled = !saving) {
                        Text(stringResource(R.string.calendar_delete_series), color = IncorrectRoseText)
                    }
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !saving) {
                Text("Cancelar", color = TextSecondary)
            }
        },
    )
}
