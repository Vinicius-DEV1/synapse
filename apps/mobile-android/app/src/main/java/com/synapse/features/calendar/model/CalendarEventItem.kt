package com.synapse.features.calendar.model

import androidx.compose.ui.graphics.Color
import com.synapse.ui.theme.BrandIndigo
import java.time.Instant

data class CalendarEventItem(
    val id: String,
    val title: String,
    val description: String = "",
    val date: String,
    val time: String = "09:00",
    val endDate: String = date,
    val endTime: String = time,
    val color: Color = BrandIndigo,
    val isCompleted: Boolean = false,
    val eventType: String = "event",
    val pageId: String? = null,
    val recurrenceRule: String? = null,
    val reminders: List<Int> = emptyList(),
    val notifiedReminders: List<Int> = emptyList(),
    val startInstant: Instant? = null,
)
