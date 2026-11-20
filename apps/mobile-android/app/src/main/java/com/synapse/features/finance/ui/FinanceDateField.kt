package com.synapse.features.finance.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.TextSecondary
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

@Composable
internal fun FinanceDateField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    optional: Boolean = false,
) {
    var pickerVisible by remember { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = {},
        label = { Text(label) },
        singleLine = true,
        readOnly = true,
        modifier = Modifier.fillMaxWidth().clickable { pickerVisible = true },
        trailingIcon = {
            IconButton(onClick = { pickerVisible = true }) {
                Icon(Icons.Default.CalendarMonth, contentDescription = "Selecionar data", tint = TextSecondary)
            }
        },
    )
    if (optional && value.isNotBlank()) {
        TextButton(onClick = { onValueChange("") }) { Text("Limpar data", color = TextSecondary) }
    }
    if (pickerVisible) {
        FinanceDatePickerDialog(
            currentValue = value,
            onDismiss = { pickerVisible = false },
            onSelect = { selected ->
                onValueChange(selected.toString())
                pickerVisible = false
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FinanceDatePickerDialog(currentValue: String, onDismiss: () -> Unit, onSelect: (LocalDate) -> Unit) {
    val initialDate = remember(currentValue) {
        runCatching { LocalDate.parse(currentValue.take(10)) }.getOrNull()
    }
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
            ) { Text("Selecionar") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
        colors = androidx.compose.material3.DatePickerDefaults.colors(containerColor = DarkSurfaceElevated),
    ) {
        DatePicker(state = pickerState, showModeToggle = false)
    }
}
