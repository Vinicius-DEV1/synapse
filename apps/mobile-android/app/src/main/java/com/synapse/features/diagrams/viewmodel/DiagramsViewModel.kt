package com.synapse.features.diagrams.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.diagrams.data.DiagramsRepository
import com.synapse.features.diagrams.model.DiagramItem
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DiagramsUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val openingDiagram: Boolean = false,
    val error: String? = null,
    val items: List<DiagramItem> = emptyList(),
    val selectedDiagram: DiagramItem? = null,
    val unsupportedContent: Boolean = false,
)

class DiagramsViewModel(context: Context) : ViewModel() {
    private val repository = DiagramsRepository(context)
    private val mutableState = MutableStateFlow(DiagramsUiState())
    private var requestGeneration = 0L
    val state: StateFlow<DiagramsUiState> = mutableState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        val request = ++requestGeneration
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(loading = true, error = null)
            try {
                val items = repository.load()
                if (request == requestGeneration) {
                    mutableState.value = mutableState.value.copy(loading = false, items = items)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == requestGeneration) reportFailure("load diagrams", error)
            }
        }
    }

    fun open(item: DiagramItem) {
        if (mutableState.value.openingDiagram) return
        val request = ++requestGeneration
        mutableState.value = mutableState.value.copy(openingDiagram = true, error = null, unsupportedContent = false)
        viewModelScope.launch {
            try {
                val editable = repository.hasNativeEditableContent(item)
                if (request == requestGeneration) {
                    mutableState.value = mutableState.value.copy(
                        openingDiagram = false,
                        selectedDiagram = item.takeIf { editable },
                        unsupportedContent = !editable,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == requestGeneration) reportFailure("open diagram", error)
            }
        }
    }

    fun closeEditor() {
        mutableState.value = mutableState.value.copy(selectedDiagram = null)
    }

    fun dismissUnsupportedContent() {
        mutableState.value = mutableState.value.copy(unsupportedContent = false)
    }

    fun create(title: String, defaultTitle: String) {
        if (mutableState.value.saving) return
        mutate("create diagram") {
            val created = repository.create(title.trim().ifBlank { defaultTitle }, DEFAULT_ICON)
            mutableState.value = mutableState.value.copy(selectedDiagram = created)
        }
    }

    fun delete(item: DiagramItem) {
        if (mutableState.value.saving) return
        mutate("delete diagram") {
            repository.delete(item)
            if (mutableState.value.selectedDiagram?.id == item.id) closeEditor()
        }
    }

    fun dismissError() {
        mutableState.value = mutableState.value.copy(error = null)
    }

    private fun mutate(action: String, operation: suspend () -> Unit) {
        val request = ++requestGeneration
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                operation()
                val items = repository.load()
                if (request == requestGeneration) {
                    mutableState.value = mutableState.value.copy(saving = false, items = items)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == requestGeneration) reportFailure(action, error)
            }
        }
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            saving = false,
            openingDiagram = false,
            error = error.message ?: "Could not access diagram data.",
        )
    }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseDiagrams"
        const val DEFAULT_ICON = "🎨"
    }
}
