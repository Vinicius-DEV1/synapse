package com.synapse.features.calendar.ui.dialogs

import android.app.TimePickerDialog
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.DatePickerDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneOffset
import java.util.Locale
import com.synapse.R
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

internal val DEFAULT_CALENDAR_REMINDERS = setOf(1440, 120, 15, 0)

@Composable
internal fun CalendarEventTypePicker(value: String, onChange: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("event" to R.string.calendar_type_event, "task" to R.string.calendar_type_task)
            .forEach { (type, labelId) ->
                FilterChip(
                    selected = value == type,
                    onClick = { onChange(type) },
                    label = { Text(stringResource(labelId)) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = BrandIndigo,
                        selectedLabelColor = Color.White,
                    ),
                )
            }
    }
}

@Composable
internal fun CalendarReminderPicker(
    selectedReminders: Set<Int>,
    onChange: (Set<Int>) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(stringResource(R.string.calendar_reminders_title), fontSize = 13.sp, color = TextSecondary)
        CALENDAR_REMINDER_OPTIONS.forEach { (minutes, labelId) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        onChange(if (minutes in selectedReminders) selectedReminders - minutes else selectedReminders + minutes)
                    },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(
                    checked = minutes in selectedReminders,
                    onCheckedChange = { checked ->
                        onChange(if (checked) selectedReminders + minutes else selectedReminders - minutes)
                    },
                    colors = CheckboxDefaults.colors(checkedColor = BrandIndigo),
                )
                Text(stringResource(labelId), color = TextPrimary, fontSize = 14.sp)
            }
        }
    }
}

@Composable
internal fun CalendarRecurrencePicker(
    recurrence: String,
    enabled: Boolean,
    onChange: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(stringResource(R.string.calendar_recurrence_title), fontSize = 13.sp, color = TextSecondary)
        Box {
            OutlinedButton(onClick = { expanded = true }, enabled = enabled) {
                Text(stringResource(recurrenceLabel(recurrence)), color = TextPrimary)
            }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                CALENDAR_RECURRENCE_OPTIONS.forEach { (value, labelId) ->
                    DropdownMenuItem(
                        text = { Text(stringResource(labelId)) },
                        onClick = {
                            onChange(value)
                            expanded = false
                        },
                    )
                }
            }
        }
    }
}

@Composable
internal fun CalendarDateTimeFields(
    dateLabel: String,
    timeLabel: String,
    date: String,
    time: String,
    allDay: Boolean,
    onDateChange: (String) -> Unit,
    onTimeChange: (String) -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        CalendarDateField(date, dateLabel, onDateChange, Modifier.weight(if (allDay) 2f else 1f))
        if (!allDay) {
            CalendarTimeField(time, timeLabel, onTimeChange, Modifier.weight(1f))
        }
    }
}

@Composable
private fun CalendarDateField(
    value: String,
    label: String,
    onChange: (String) -> Unit,
    modifier: Modifier,
) {
    var pickerVisible by remember(value) { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = {},
        label = { Text(label) },
        readOnly = true,
        singleLine = true,
        modifier = modifier.clickable { pickerVisible = true },
        trailingIcon = {
            IconButton(onClick = { pickerVisible = true }) {
                Icon(Icons.Default.CalendarMonth, contentDescription = label)
            }
        },
    )
    if (pickerVisible) {
        CalendarDatePickerDialog(
            value = value,
            onDismiss = { pickerVisible = false },
            onSelect = {
                onChange(it.toString())
                pickerVisible = false
            },
        )
    }
}

@Composable
private fun CalendarTimeField(
    value: String,
    label: String,
    onChange: (String) -> Unit,
    modifier: Modifier,
) {
    val context = LocalContext.current
    val time = runCatching { LocalTime.parse(value) }.getOrDefault(LocalTime.of(9, 0))
    val openTimePicker = {
        TimePickerDialog(context, { _, hour, minute ->
            onChange(String.format(Locale.ROOT, "%02d:%02d", hour, minute))
        }, time.hour, time.minute, true).show()
    }
    OutlinedTextField(
        value = value,
        onValueChange = {},
        label = { Text(label) },
        readOnly = true,
        singleLine = true,
        modifier = modifier.clickable { openTimePicker() },
        trailingIcon = {
            IconButton(onClick = openTimePicker) {
                Icon(Icons.Default.AccessTime, contentDescription = label)
            }
        },
    )
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
private fun CalendarDatePickerDialog(
    value: String,
    onDismiss: () -> Unit,
    onSelect: (LocalDate) -> Unit,
) {
    val initialDate = remember(value) { runCatching { LocalDate.parse(value.take(10)) }.getOrNull() }
    val pickerState = rememberDatePickerState(
        initialSelectedDateMillis = initialDate?.atStartOfDay(ZoneOffset.UTC)?.toInstant()?.toEpochMilli(),
    )
    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                enabled = pickerState.selectedDateMillis != null,
                onClick = {
                    pickerState.selectedDateMillis?.let { millis ->
                        onSelect(Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate())
                    }
                },
            ) { Text(stringResource(R.string.general_select)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.general_cancel)) } },
        colors = DatePickerDefaults.colors(containerColor = com.synapse.ui.theme.DarkSurfaceElevated),
    ) {
        DatePicker(state = pickerState, showModeToggle = false)
    }
}

private val CALENDAR_REMINDER_OPTIONS = listOf(
    1440 to R.string.calendar_reminder_one_day,
    120 to R.string.calendar_reminder_two_hours,
    15 to R.string.calendar_reminder_fifteen_minutes,
    0 to R.string.calendar_reminder_at_time,
)

private val CALENDAR_RECURRENCE_OPTIONS = listOf(
    "none" to R.string.calendar_recurrence_none,
    "daily" to R.string.calendar_recurrence_daily,
    "weekly" to R.string.calendar_recurrence_weekly,
    "monthly" to R.string.calendar_recurrence_monthly,
    "yearly" to R.string.calendar_recurrence_yearly,
)

private fun recurrenceLabel(value: String): Int =
    CALENDAR_RECURRENCE_OPTIONS.firstOrNull { it.first == value }?.second ?: R.string.calendar_recurrence_none
