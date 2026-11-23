package com.synapse.features.habits.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.habits.data.HabitRepository
import com.synapse.features.habits.model.HabitItem
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HabitsUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val error: String? = null,
    val habits: List<HabitItem> = emptyList(),
    val mutationVersion: Long = 0,
)

class HabitViewModel(context: Context) : ViewModel() {
    private val repository = HabitRepository(context)
    private val mutableState = MutableStateFlow(HabitsUiState())
    private var generation = 0L
    val state: StateFlow<HabitsUiState> = mutableState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        val request = ++generation
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(loading = true, error = null)
            try {
                val habits = repository.load()
                if (request == generation) {
                    mutableState.value = mutableState.value.copy(loading = false, habits = habits)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure("load habits", error)
            }
        }
    }

    fun create(name: String, category: String) = mutate { repository.create(name, category) }

    fun toggleCheckin(habitId: String, date: String) = mutate { repository.toggleCheckin(habitId, date) }

    fun delete(habit: HabitItem) = mutate { repository.delete(habit.id) }

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
                val habits = repository.load()
                if (request == generation) {
                    mutableState.value = mutableState.value.copy(saving = false, habits = habits)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure("save habit data", error)
            }
        }
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            saving = false,
            error = error.message ?: "Não foi possível acessar os dados de hábitos.",
        )
    }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseHabits"
    }
}
