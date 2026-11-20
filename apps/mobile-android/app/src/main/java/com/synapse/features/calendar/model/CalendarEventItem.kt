package com.synapse.features.calendar.model

import androidx.compose.ui.graphics.Color
import com.synapse.ui.theme.BrandIndigo

data class CalendarEventItem(
    val id: String,
    val title: String,
    val description: String = "",
    val date: String,
    val time: String = "09:00",
    val color: Color = BrandIndigo,
    val isCompleted: Boolean = false
)
