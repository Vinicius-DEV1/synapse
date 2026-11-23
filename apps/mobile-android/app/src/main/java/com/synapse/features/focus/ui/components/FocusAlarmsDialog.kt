package com.synapse.features.focus.ui.components

import android.app.TimePickerDialog
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddAlarm
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.R
import com.synapse.features.focus.model.FocusAlarmItem
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary
import java.time.LocalTime
import java.util.Locale

@Composable
internal fun FocusAlarmsDialog(
    alarms: List<FocusAlarmItem>,
    saving: Boolean,
    onDismiss: () -> Unit,
    onCreate: (String, String) -> Unit,
    onToggle: (String, Boolean) -> Unit,
    onDelete: (String) -> Unit,
) {
    var editorVisible by remember { mutableStateOf(false) }
    var alarmToDelete by remember { mutableStateOf<FocusAlarmItem?>(null) }

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = { Text(stringResource(R.string.focus_alarms_title), color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (alarms.isEmpty()) {
                    Text(stringResource(R.string.focus_alarm_empty), color = TextSecondary)
                } else {
                    LazyColumn(modifier = Modifier.heightIn(max = 360.dp)) {
                        items(alarms, key = FocusAlarmItem::id) { alarm ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(alarm.time, color = TextPrimary, fontSize = 22.sp)
                                    Text(alarm.label.ifBlank { stringResource(R.string.focus_alarm_default) }, color = TextSecondary)
                                }
                                Switch(
                                    checked = alarm.enabled,
                                    onCheckedChange = { onToggle(alarm.id, !alarm.enabled) },
                                    enabled = !saving,
                                )
                                IconButton(onClick = { alarmToDelete = alarm }, enabled = !saving) {
                                    Icon(Icons.Default.DeleteOutline, contentDescription = stringResource(R.string.focus_alarm_delete), tint = TextSecondary)
                                }
                            }
                        }
                    }
                }
                Button(onClick = { editorVisible = true }, enabled = !saving, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.AddAlarm, contentDescription = null)
                    Text(stringResource(R.string.focus_alarm_new), modifier = Modifier.padding(start = 8.dp))
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text(stringResource(R.string.general_close)) } },
    )

    if (editorVisible) {
        FocusAlarmEditorDialog(
            onDismiss = { editorVisible = false },
            onSave = { time, label ->
                onCreate(time, label)
                editorVisible = false
            },
        )
    }

    alarmToDelete?.let { alarm ->
        AlertDialog(
            onDismissRequest = { if (!saving) alarmToDelete = null },
            containerColor = DarkSurfaceElevated,
            title = { Text(stringResource(R.string.focus_alarm_delete), color = TextPrimary) },
            text = { Text(stringResource(R.string.focus_alarm_delete_prompt), color = TextSecondary) },
            confirmButton = {
                TextButton(onClick = {
                    onDelete(alarm.id)
                    alarmToDelete = null
                }, enabled = !saving) { Text(stringResource(R.string.calendar_delete_action)) }
            },
            dismissButton = { TextButton(onClick = { alarmToDelete = null }) { Text(stringResource(R.string.general_cancel)) } },
        )
    }
}

@Composable
private fun FocusAlarmEditorDialog(
    onDismiss: () -> Unit,
    onSave: (String, String) -> Unit,
) {
    val context = LocalContext.current
    var time by remember { mutableStateOf("12:00") }
    var label by remember { mutableStateOf("") }
    val parsedTime = remember(time) { runCatching { LocalTime.parse(time) }.getOrDefault(LocalTime.NOON) }
    val openTimePicker = {
        TimePickerDialog(context, { _, hour, minute ->
            time = String.format(Locale.ROOT, "%02d:%02d", hour, minute)
        }, parsedTime.hour, parsedTime.minute, true).show()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurfaceElevated,
        title = { Text(stringResource(R.string.focus_alarm_new), color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = time,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(stringResource(R.string.focus_alarm_time)) },
                    modifier = Modifier.fillMaxWidth().clickable(onClick = openTimePicker),
                    trailingIcon = {
                        IconButton(onClick = openTimePicker) {
                            Icon(Icons.Default.AccessTime, contentDescription = stringResource(R.string.focus_alarm_time), tint = BrandIndigo)
                        }
                    },
                )
                OutlinedTextField(
                    value = label,
                    onValueChange = { label = it.take(MAX_ALARM_LABEL_LENGTH) },
                    label = { Text(stringResource(R.string.focus_alarm_label)) },
                    placeholder = { Text(stringResource(R.string.focus_alarm_label_hint)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onSave(time, label.trim()) }) {
                Text(stringResource(R.string.focus_alarm_save))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.general_cancel)) } },
    )
}

private const val MAX_ALARM_LABEL_LENGTH = 30
