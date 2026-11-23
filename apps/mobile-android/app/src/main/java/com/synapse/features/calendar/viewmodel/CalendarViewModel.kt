package com.synapse.features.calendar.viewmodel

import android.content.Context
import android.util.Log
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.calendar.data.CalendarRepository
import com.synapse.features.calendar.model.CalendarEventItem
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CalendarUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val error: String? = null,
    val events: List<CalendarEventItem> = emptyList(),
    val mutationVersion: Long = 0,
)

class CalendarViewModel(context: Context) : ViewModel() {
    private val repository = CalendarRepository(context)
    private val mutableState = MutableStateFlow(CalendarUiState())
    private var generation = 0L
    val state: StateFlow<CalendarUiState> = mutableState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        val request = ++generation
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(loading = true, error = null)
            try {
                val events = repository.load()
                if (request == generation) {
                    mutableState.value = mutableState.value.copy(loading = false, events = events)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure("load calendar events", error)
            }
        }
    }

    fun create(
        title: String,
        description: String,
        date: String,
        time: String,
        endDate: String,
        endTime: String,
        color: Color,
        eventType: String,
        reminders: List<Int>,
        recurrence: String,
    ) {
        mutate {
            repository.create(title, description, date, time, endDate, endTime, color, eventType, reminders, recurrence)
        }
    }

    fun update(
        event: CalendarEventItem,
        title: String,
        description: String,
        date: String,
        time: String,
        endDate: String,
        endTime: String,
        color: Color,
        eventType: String,
        reminders: List<Int>,
    ) {
        mutate {
            repository.update(
                event.id,
                title,
                description,
                date,
                time,
                endDate,
                endTime,
                color,
                eventType,
                reminders,
            )
        }
    }

    fun toggleStatus(event: CalendarEventItem) {
        mutate { repository.toggleStatus(event.id) }
    }

    fun delete(event: CalendarEventItem, deleteSeries: Boolean = false) {
        mutate { repository.delete(event.id, deleteSeries) }
    }

    private fun mutate(operation: suspend () -> Unit) {
        if (mutableState.value.saving) return
        val request = ++generation
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                operation()
                if (request == generation) {
                    mutableState.value = mutableState.value.copy(
                        mutationVersion = mutableState.value.mutationVersion + 1,
                    )
                }
                val events = repository.load()
                if (request == generation) {
                    mutableState.value = mutableState.value.copy(saving = false, events = events)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure("save calendar data", error)
            }
        }
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            saving = false,
            error = error.message ?: "Não foi possível acessar os dados da agenda.",
        )
    }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseCalendar"
    }
}
