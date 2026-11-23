package com.synapse.features.calendar.ui.dialogs

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.synapse.features.calendar.model.CalendarEventItem

@Composable
internal fun CalendarDialogsHost(
    editorOpen: Boolean,
    editingEvent: CalendarEventItem?,
    eventPendingDeletion: CalendarEventItem?,
    colorOptions: List<Color>,
    saving: Boolean,
    errorMessage: String?,
    onOpenNote: (String) -> Unit,
    onDismissEditor: () -> Unit,
    onSaveEvent: (CalendarEventItem?, String, String, String, String, String, String, Color, List<Int>, String, String) -> Unit,
    onDismissDelete: () -> Unit,
    onConfirmDelete: (CalendarEventItem, Boolean) -> Unit,
) {
    if (editorOpen) {
        NewEventSheet(
            event = editingEvent,
            colorOptions = colorOptions,
            isSaving = saving,
            errorMessage = errorMessage,
            onOpenNote = onOpenNote,
            onDismiss = onDismissEditor,
            onSave = { title, description, date, time, endDate, endTime, color, reminders, recurrence, eventType ->
                onSaveEvent(editingEvent, title, description, date, time, endDate, endTime, color, reminders, recurrence, eventType)
            },
        )
    }

    eventPendingDeletion?.let { event ->
        DeleteCalendarEventDialog(
            event = event,
            saving = saving,
            onDismiss = onDismissDelete,
            onConfirm = { onConfirmDelete(event, false) },
            onConfirmSeries = { onConfirmDelete(event, true) },
        )
    }
}
