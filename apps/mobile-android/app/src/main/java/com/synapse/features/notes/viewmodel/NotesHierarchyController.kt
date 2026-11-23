package com.synapse.features.notes.viewmodel

import android.util.Log
import com.synapse.features.notes.data.NotesRepository
import com.synapse.features.notes.model.NotesUiState
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

class NotesHierarchyController(
    private val repository: NotesRepository,
    private val scope: CoroutineScope,
    private val state: MutableStateFlow<NotesUiState>,
) {
    fun createSubpage(title: String) {
        val current = state.value
        val parent = current.selectedNote ?: return
        if (title.isBlank() || current.saving || current.isDirty) return
        state.value = current.copy(saving = true, error = null)
        scope.launch {
            try {
                repository.createNote(title.trim(), parent.id)
                val catalog = repository.loadCatalog(state.value.searchQuery)
                val parentCandidates = repository.loadNotes("")
                state.value = state.value.copy(
                    notes = catalog.notes,
                    treeNotes = catalog.tree,
                    parentCandidates = parentCandidates,
                    saving = false,
                    hierarchyMutationVersion = state.value.hierarchyMutationVersion + 1,
                    error = null,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("create note subpage", error)
            }
        }
    }

    fun moveNote(newParentId: String?) {
        val current = state.value
        val note = current.selectedNote ?: return
        if (current.saving || current.isDirty || note.parentId == newParentId) return
        state.value = current.copy(saving = true, error = null)
        scope.launch {
            try {
                repository.moveNote(note.id, newParentId)
                val updatedNote = repository.loadNote(note.id)
                val catalog = repository.loadCatalog(state.value.searchQuery)
                val parentCandidates = repository.loadNotes("")
                state.value = state.value.copy(
                    notes = catalog.notes,
                    treeNotes = catalog.tree,
                    parentCandidates = parentCandidates,
                    selectedNote = updatedNote,
                    saving = false,
                    hierarchyMutationVersion = state.value.hierarchyMutationVersion + 1,
                    error = null,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("move note", error)
            }
        }
    }

    fun reorderPages(parentId: String?, pageIds: List<String>) {
        if (state.value.saving || pageIds.size < 2) return
        state.value = state.value.copy(saving = true, error = null)
        scope.launch {
            try {
                repository.reorderPages(parentId, pageIds)
                val catalog = repository.loadCatalog(state.value.searchQuery)
                state.value = state.value.copy(
                    notes = catalog.notes,
                    treeNotes = catalog.tree,
                    saving = false,
                    error = null,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("reorder note pages", error)
            }
        }
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        state.value = state.value.copy(
            loading = false,
            loadingNote = false,
            saving = false,
            error = error.message ?: "Não foi possível atualizar a hierarquia das notas.",
        )
    }

    private companion object {
        const val TAG = "SynapseNotesHierarchy"
    }
}
