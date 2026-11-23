package com.synapse.features.calendar.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.calendar.model.CalendarEventItem
import com.synapse.features.calendar.ui.components.CalendarEventCard
import com.synapse.features.calendar.ui.components.CalendarHeader
import com.synapse.features.calendar.ui.components.CalendarLaunchHandler
import com.synapse.features.calendar.ui.components.CalendarMonthGrid
import com.synapse.features.calendar.ui.components.rememberCalendarReminderPermissionRequester
import com.synapse.features.calendar.ui.components.CalendarStatusFilter
import com.synapse.features.calendar.ui.dialogs.CalendarDialogsHost
import com.synapse.features.calendar.viewmodel.CalendarViewModel
import com.synapse.R
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.synapse.ui.theme.*
import java.time.LocalDate
import java.time.YearMonth
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarScreen(
    onOpenNote: (String) -> Unit,
    initialEventId: String? = null,
    onLaunchActionConsumed: () -> Unit = {},
) {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                require(modelClass.isAssignableFrom(CalendarViewModel::class.java))
                return modelClass.cast(CalendarViewModel(context))
            }
        }
    }
    val viewModel: CalendarViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val requestReminderPermission = rememberCalendarReminderPermissionRequester(context, state.saving) {
        scope.launch {
            snackbarHostState.showSnackbar(context.getString(R.string.notifications_permission_denied))
        }
    }
    val events = state.events
    var selectedTab by remember { mutableStateOf("Todos") }
    var searchQuery by remember { mutableStateOf("") }
    var currentMonth by remember { mutableStateOf(YearMonth.now()) }
    var selectedDate by remember { mutableStateOf<LocalDate?>(null) }
    var isEventEditorOpen by remember { mutableStateOf(false) }
    var editingEvent by remember { mutableStateOf<CalendarEventItem?>(null) }
    var editorOpenedAtVersion by remember { mutableLongStateOf(0L) }
    var eventPendingDeletion by remember { mutableStateOf<CalendarEventItem?>(null) }

    LaunchedEffect(state.mutationVersion) {
        if (isEventEditorOpen && state.mutationVersion > editorOpenedAtVersion) {
            isEventEditorOpen = false
            editingEvent = null
        }
    }

    CalendarLaunchHandler(
        eventId = initialEventId,
        events = events,
        loading = state.loading,
        error = state.error,
        mutationVersion = state.mutationVersion,
        onEventSelected = { event, version ->
            selectedDate = runCatching { LocalDate.parse(event.date) }.getOrNull()
            selectedDate?.let { currentMonth = YearMonth.from(it) }
            selectedTab = "Todos"
            searchQuery = ""
            editingEvent = event
            editorOpenedAtVersion = version
            isEventEditorOpen = true
        },
        onActionConsumed = onLaunchActionConsumed,
    )

    val colorOptions = listOf(BrandIndigo, CorrectEmerald, AmberWarning, BrandPurple, IncorrectRose)

    val filteredEvents = remember(events, selectedTab, searchQuery, selectedDate) {
        events.filter { ev ->
            val matchesTab = when (selectedTab) {
                "Pendentes" -> !ev.isCompleted
                "Concluídos" -> ev.isCompleted
                else -> true
            }
            val matchesSearch = searchQuery.isBlank() ||
                ev.title.contains(searchQuery, ignoreCase = true) ||
                ev.description.contains(searchQuery, ignoreCase = true)
            val matchesDate = selectedDate == null || ev.date == selectedDate.toString()
            matchesTab && matchesSearch && matchesDate
        }
    }

    val totalPending = remember(events) { events.count { !it.isCompleted } }
    val totalCompleted = remember(events) { events.count { it.isCompleted } }

    Scaffold(
        containerColor = DarkCanvas,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    if (!state.saving) {
                        editingEvent = null
                        editorOpenedAtVersion = state.mutationVersion
                        isEventEditorOpen = true
                    }
                },
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
            CalendarHeader(totalPending, totalCompleted)

            Spacer(modifier = Modifier.height(16.dp))

            CalendarStatusFilter(selectedTab, onSelected = { selectedTab = it })

            Spacer(modifier = Modifier.height(16.dp))

            CalendarMonthGrid(
                month = currentMonth,
                selectedDate = selectedDate,
                events = events,
                onMonthChange = {
                    currentMonth = it
                    selectedDate = null
                },
                onDateSelected = { selectedDate = it },
                onClearDate = { selectedDate = null },
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                placeholder = { Text("Buscar compromissos...", color = TextMuted) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextSecondary) },
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedBorderColor = BrandIndigo,
                    unfocusedBorderColor = DarkBorder,
                    cursorColor = BrandIndigoLight,
                ),
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Event List
            if (state.error != null) {
                Column(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(state.error.orEmpty(), color = IncorrectRoseText, fontSize = 13.sp)
                    TextButton(onClick = viewModel::refresh) { Text("Tentar novamente") }
                }
            } else if (state.loading && events.isEmpty()) {
                Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BrandIndigoLight)
                }
            } else if (filteredEvents.isEmpty()) {
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
                        CalendarEventCard(
                            event = item,
                            onToggleComplete = { viewModel.toggleStatus(item) },
                            onOpenNote = onOpenNote,
                            onEdit = {
                                editingEvent = item
                                editorOpenedAtVersion = state.mutationVersion
                                isEventEditorOpen = true
                            },
                            onDelete = { eventPendingDeletion = item }
                        )
                    }
                }
            }
        }

        CalendarDialogsHost(
            editorOpen = isEventEditorOpen,
            editingEvent = editingEvent,
            eventPendingDeletion = eventPendingDeletion,
            colorOptions = colorOptions,
            saving = state.saving,
            errorMessage = state.error,
            onOpenNote = onOpenNote,
            onDismissEditor = {
                isEventEditorOpen = false
                editingEvent = null
            },
            onSaveEvent = { event, title, description, date, time, endDate, endTime, color, reminders, recurrence, eventType ->
                if (title.isNotBlank() && !state.saving) {
                    event?.let {
                        viewModel.update(
                            it,
                            title.trim(),
                            description.trim(),
                            date.trim(),
                            time.trim(),
                            endDate.trim(),
                            endTime.trim(),
                            color,
                            eventType,
                            reminders,
                        )
                    } ?: viewModel.create(
                        title.trim(),
                        description.trim(),
                        date.trim(),
                        time.trim(),
                        endDate.trim(),
                        endTime.trim(),
                        color,
                        eventType,
                        reminders,
                        recurrence,
                    )
                    if (reminders.isNotEmpty()) requestReminderPermission()
                }
            },
            onDismissDelete = { eventPendingDeletion = null },
            onConfirmDelete = { event, deleteSeries ->
                viewModel.delete(event, deleteSeries)
                eventPendingDeletion = null
            },
        )
    }
}
