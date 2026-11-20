package com.synapse.features.calendar.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.calendar.model.CalendarEventItem
import com.synapse.features.calendar.ui.dialogs.NewEventSheet
import com.synapse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarScreen(
    initialEvents: List<CalendarEventItem> = emptyList()
) {
    var events by remember { mutableStateOf(initialEvents) }
    var selectedTab by remember { mutableStateOf("Todos") }
    var searchQuery by remember { mutableStateOf("") }
    var isAddingEvent by remember { mutableStateOf(false) }

    var newTitle by remember { mutableStateOf("") }
    var newDesc by remember { mutableStateOf("") }
    var newDate by remember { mutableStateOf("Hoje") }
    var newTime by remember { mutableStateOf("10:00") }
    var selectedColor by remember { mutableStateOf(BrandIndigo) }

    val colorOptions = listOf(BrandIndigo, CorrectEmerald, AmberWarning, BrandPurple, IncorrectRose)

    val filteredEvents = remember(events, selectedTab, searchQuery) {
        events.filter { ev ->
            val matchesTab = when (selectedTab) {
                "Pendentes" -> !ev.isCompleted
                "Concluídos" -> ev.isCompleted
                else -> true
            }
            val matchesSearch = searchQuery.isBlank() ||
                ev.title.contains(searchQuery, ignoreCase = true) ||
                ev.description.contains(searchQuery, ignoreCase = true)
            matchesTab && matchesSearch
        }
    }

    val totalPending = remember(events) { events.count { !it.isCompleted } }
    val totalCompleted = remember(events) { events.count { it.isCompleted } }

    Scaffold(
        containerColor = DarkCanvas,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { isAddingEvent = true },
                containerColor = BrandIndigo,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Novo Evento")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Agenda & Compromissos",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "$totalPending pendentes • $totalCompleted concluídos",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                }
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = DarkSurfaceElevated,
                    border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
                    modifier = Modifier.padding(4.dp)
                ) {
                    Icon(
                        Icons.Default.CalendarMonth,
                        contentDescription = "Calendário",
                        tint = BrandIndigoLight,
                        modifier = Modifier.padding(8.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Filter Tabs
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(DarkSurface)
                    .border(1.dp, DarkBorder, RoundedCornerShape(10.dp))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                listOf("Todos", "Pendentes", "Concluídos").forEach { tab ->
                    val isSelected = selectedTab == tab
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSelected) DarkSurfaceElevated else Color.Transparent)
                            .clickable { selectedTab = tab }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = tab,
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) Color.White else TextSecondary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Event List
            if (filteredEvents.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Nenhum compromisso encontrado.",
                        color = TextMuted,
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredEvents, key = { it.id }) { item ->
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            color = DarkSurface,
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (item.isCompleted) CorrectEmerald.copy(alpha = 0.2f) else DarkBorder
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Color Stripe
                                Box(
                                    modifier = Modifier
                                        .width(4.dp)
                                        .height(38.dp)
                                        .clip(RoundedCornerShape(2.dp))
                                        .background(item.color)
                                )

                                Spacer(modifier = Modifier.width(12.dp))

                                // Details
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = item.title,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (item.isCompleted) TextMuted else TextPrimary,
                                        textDecoration = if (item.isCompleted) TextDecoration.LineThrough else null
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "${item.date} às ${item.time}" +
                                            if (item.description.isNotBlank()) " • ${item.description}" else "",
                                        fontSize = 12.sp,
                                        color = TextSecondary,
                                        maxLines = 1
                                    )
                                }

                                Spacer(modifier = Modifier.width(8.dp))

                                // Checkbox Toggle
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape)
                                        .background(if (item.isCompleted) CorrectEmeraldBg else DarkSurfaceElevated)
                                        .border(
                                            1.dp,
                                            if (item.isCompleted) CorrectEmerald else DarkBorder,
                                            CircleShape
                                        )
                                        .clickable {
                                            events = events.map {
                                                if (it.id == item.id) it.copy(isCompleted = !it.isCompleted) else it
                                            }
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (item.isCompleted) {
                                        Icon(
                                            Icons.Default.Check,
                                            contentDescription = "Concluído",
                                            tint = CorrectEmeraldText,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(6.dp))

                                // Delete Button
                                IconButton(
                                    onClick = {
                                        events = events.filter { it.id != item.id }
                                    },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Delete,
                                        contentDescription = "Excluir",
                                        tint = TextMuted,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (isAddingEvent) {
            NewEventSheet(
                title = newTitle,
                description = newDesc,
                date = newDate,
                time = newTime,
                selectedColor = selectedColor,
                colorOptions = colorOptions,
                onTitleChange = { newTitle = it },
                onDescriptionChange = { newDesc = it },
                onDateChange = { newDate = it },
                onTimeChange = { newTime = it },
                onColorChange = { selectedColor = it },
                onDismiss = { isAddingEvent = false },
                onSave = {
                    if (newTitle.isNotBlank()) {
                        events = events + CalendarEventItem(
                            id = java.util.UUID.randomUUID().toString(),
                            title = newTitle.trim(),
                            description = newDesc.trim(),
                            date = newDate.trim(),
                            time = newTime.trim(),
                            color = selectedColor
                        )
                        newTitle = ""
                        newDesc = ""
                        isAddingEvent = false
                    }
                }
            )
        }
    }
}
