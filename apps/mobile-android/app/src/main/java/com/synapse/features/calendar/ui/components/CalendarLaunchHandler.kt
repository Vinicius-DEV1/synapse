package com.synapse.features.calendar.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import com.synapse.features.calendar.model.CalendarEventItem

@Composable
internal fun CalendarLaunchHandler(
    eventId: String?,
    events: List<CalendarEventItem>,
    loading: Boolean,
    error: String?,
    mutationVersion: Long,
    onEventSelected: (CalendarEventItem, Long) -> Unit,
    onActionConsumed: () -> Unit,
) {
    LaunchedEffect(eventId, events, loading, error, mutationVersion) {
        val targetId = eventId ?: return@LaunchedEffect
        if (loading || error != null) return@LaunchedEffect
        events.firstOrNull { it.id == targetId }?.let { event ->
            onEventSelected(event, mutationVersion)
        }
        onActionConsumed()
    }
}
