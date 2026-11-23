package com.synapse.features.calendar.ui.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.ui.res.stringResource
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.calendar.model.CalendarEventItem
import com.synapse.features.calendar.ui.dialogs.CalendarEventTypePicker
import com.synapse.features.calendar.ui.dialogs.CalendarRecurrencePicker
import com.synapse.features.calendar.ui.dialogs.CalendarReminderPicker
import com.synapse.features.calendar.ui.dialogs.CalendarDateTimeFields
import com.synapse.features.calendar.ui.dialogs.DEFAULT_CALENDAR_REMINDERS
import com.synapse.R
import com.synapse.ui.theme.*
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewEventSheet(
    event: CalendarEventItem?,
    colorOptions: List<Color>,
    isSaving: Boolean,
    errorMessage: String?,
    onOpenNote: (String) -> Unit,
    onDismiss: () -> Unit,
    onSave: (String, String, String, String, String, String, Color, List<Int>, String, String) -> Unit,
) {
    var title by remember(event?.id) { mutableStateOf(event?.title.orEmpty()) }
    var description by remember(event?.id) { mutableStateOf(event?.description.orEmpty()) }
    val now = remember(event?.id) { LocalDateTime.now().withSecond(0).withNano(0) }
    var date by remember(event?.id) {
        mutableStateOf(event?.date ?: now.toLocalDate().format(DateTimeFormatter.ISO_DATE))
    }
    var time by remember(event?.id) {
        mutableStateOf(event?.time ?: now.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm")))
    }
    var endDate by remember(event?.id) {
        mutableStateOf(event?.endDate ?: now.plusHours(1).toLocalDate().format(DateTimeFormatter.ISO_DATE))
    }
    var endTime by remember(event?.id) {
        mutableStateOf(event?.endTime ?: now.plusHours(1).toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm")))
    }
    var isAllDay by remember(event?.id) {
        mutableStateOf(event?.time == "00:00" && event.endTime == "23:59")
    }
    var eventType by remember(event?.id) { mutableStateOf(event?.eventType ?: "event") }
    var selectedColor by remember(event?.id) { mutableStateOf(event?.color ?: BrandIndigo) }
    var selectedReminders by remember(event?.id) {
        mutableStateOf((event?.reminders ?: DEFAULT_CALENDAR_REMINDERS).toSet())
    }
    var recurrence by remember(event?.id) { mutableStateOf("none") }

    ModalBottomSheet(
        onDismissRequest = { if (!isSaving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        dragHandle = { BottomSheetDefaults.DragHandle(color = TextSecondary) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text(
                text = if (event == null) "Novo Compromisso na Agenda" else "Editar Compromisso",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            CalendarEventTypePicker(eventType) { eventType = it }
            event?.pageId?.let { pageId ->
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = BrandIndigo.copy(alpha = 0.10f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BrandIndigo.copy(alpha = 0.24f)),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                    ) {
                        Text("Página vinculada", color = BrandIndigoLight, fontSize = 13.sp)
                        TextButton(onClick = { onOpenNote(pageId) }, enabled = !isSaving) {
                            Text("Abrir página")
                        }
                    }
                }
            }
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Título do Evento") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedBorderColor = BrandIndigo,
                    unfocusedBorderColor = DarkBorder
                )
            )
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Descrição (opcional)") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedBorderColor = BrandIndigo,
                    unfocusedBorderColor = DarkBorder
                )
            )
            CalendarDateTimeFields(
                dateLabel = "Data de início",
                timeLabel = "Hora de início",
                date = date,
                time = time,
                allDay = isAllDay,
                onDateChange = { date = it },
                onTimeChange = { time = it },
            )
            CalendarDateTimeFields(
                dateLabel = "Data de término",
                timeLabel = "Hora de término",
                date = endDate,
                time = endTime,
                allDay = isAllDay,
                onDateChange = { endDate = it },
                onTimeChange = { endTime = it },
            )
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Checkbox(checked = isAllDay, onCheckedChange = { isAllDay = it })
                Text(stringResource(R.string.calendar_all_day), color = TextPrimary, fontSize = 14.sp)
            }
            Text(text = "Etiqueta de Cor", fontSize = 13.sp, color = TextSecondary)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                colorOptions.forEach { color ->
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(color, CircleShape)
                            .border(
                                2.dp,
                                if (selectedColor == color) Color.White else Color.Transparent,
                                CircleShape
                            )
                            .clickable { selectedColor = color }
                    )
                }
            }
            CalendarReminderPicker(selectedReminders) { selectedReminders = it }
            if (event == null) {
                CalendarRecurrencePicker(recurrence, enabled = !isSaving) { recurrence = it }
            }
            if (errorMessage != null) {
                Text(errorMessage, fontSize = 12.sp, color = IncorrectRoseText)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = {
                    onSave(
                        title,
                        description,
                        date,
                        if (isAllDay) "00:00" else time,
                        endDate,
                        if (isAllDay) "23:59" else endTime,
                        selectedColor,
                        selectedReminders.sortedDescending(),
                        recurrence,
                        eventType,
                    )
                },
                enabled = !isSaving && title.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text(
                    when {
                        isSaving -> "Salvando…"
                        event == null -> "Salvar Compromisso"
                        else -> "Salvar Alterações"
                    },
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}
