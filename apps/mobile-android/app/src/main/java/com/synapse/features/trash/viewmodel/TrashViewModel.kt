package com.synapse.features.trash.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.trash.data.TrashRepository
import com.synapse.features.trash.model.TrashedItem
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TrashUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val error: String? = null,
    val items: List<TrashedItem> = emptyList(),
    val mutationVersion: Long = 0,
)

class TrashViewModel(context: Context) : ViewModel() {
    private val repository = TrashRepository(context)
    private val mutableState = MutableStateFlow(TrashUiState())
    private var generation = 0L
    val state: StateFlow<TrashUiState> = mutableState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        if (mutableState.value.saving) return
        val request = ++generation
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(loading = true, error = null)
            try {
                val items = repository.load()
                if (request == generation) {
                    mutableState.value = mutableState.value.copy(loading = false, items = items)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure("load deleted items", error)
            }
        }
    }

    fun restore(item: TrashedItem) = mutate("restore trash item") { repository.restore(item) }

    fun deletePermanently(item: TrashedItem) = mutate("permanently delete trash item") {
        repository.deletePermanently(item)
    }

    fun empty() = mutate("empty trash") { repository.empty() }

    private fun mutate(action: String, operation: suspend () -> Unit) {
        if (mutableState.value.saving || mutableState.value.loading) return
        val request = ++generation
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                operation()
                val items = repository.load()
                if (request == generation) {
                    val current = mutableState.value
                    mutableState.value = current.copy(
                        saving = false,
                        items = items,
                        mutationVersion = current.mutationVersion + 1,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) {
                    try {
                        val items = repository.load()
                        Log.e(TAG, "Failed to $action", error)
                        mutableState.value = mutableState.value.copy(
                            loading = false,
                            saving = false,
                            items = items,
                            error = error.message ?: "Não foi possível completar esta ação.",
                        )
                    } catch (refreshError: Exception) {
                        error.addSuppressed(refreshError)
                        reportFailure(action, error)
                    }
                }
            }
        }
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            saving = false,
            error = error.message ?: "Não foi possível acessar a lixeira.",
        )
    }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseTrash"
    }
}
