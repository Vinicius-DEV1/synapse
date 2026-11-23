package com.synapse.features.notes.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.notes.data.NotesRepository
import com.synapse.features.notes.model.NoteDocument
import com.synapse.features.notes.model.NotesUiState
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class NotesViewModel(context: Context) : ViewModel() {
    private val repository = NotesRepository(context)
    private val mutableState = MutableStateFlow(NotesUiState())
    val state: StateFlow<NotesUiState> = mutableState.asStateFlow()
    private val hierarchyController = NotesHierarchyController(repository, viewModelScope, mutableState)
    private var searchJob: Job? = null
    private var searchRequest = 0
    private var pageRequest = 0

    init {
        refreshNotes()
    }

    fun updateSearch(query: String) {
        mutableState.value = mutableState.value.copy(searchQuery = query)
        searchJob?.cancel()
        val request = ++searchRequest
        mutableState.value = mutableState.value.copy(loading = true, error = null)
        searchJob = viewModelScope.launch {
            delay(SEARCH_DEBOUNCE_MS)
            loadNotes(request)
        }
    }

    fun refreshNotes() {
        val request = ++searchRequest
        searchJob?.cancel()
        mutableState.value = mutableState.value.copy(loading = true, error = null)
        searchJob = viewModelScope.launch { loadNotes(request) }
    }

    fun openNote(id: String) {
        val request = ++pageRequest
        mutableState.value = mutableState.value.copy(loadingNote = true, error = null)
        viewModelScope.launch {
            try {
                val note = repository.loadNote(id)
                val parentCandidates = repository.loadNotes("")
                if (request == pageRequest) {
                    mutableState.value = mutableState.value.copy(
                        selectedNote = note,
                        parentCandidates = parentCandidates,
                        loadingNote = false,
                        isDirty = false,
                        error = null,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == pageRequest) reportFailure("open note", error)
            }
        }
    }

    fun cancelOpeningNote() {
        pageRequest++
        mutableState.value = mutableState.value.copy(loadingNote = false)
    }

    fun createNote(title: String) {
        if (title.isBlank() || mutableState.value.saving) return
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                val note = repository.createNote(title.trim())
                val parentCandidates = repository.loadNotes("")
                mutableState.value = mutableState.value.copy(
                    selectedNote = note,
                    parentCandidates = parentCandidates,
                    saving = false,
                    isDirty = false,
                    error = null,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("create note", error)
            }
        }
    }

    fun createSubpage(title: String) {
        hierarchyController.createSubpage(title)
    }

    fun updateDraftTitle(title: String) {
        val current = mutableState.value
        val note = current.selectedNote ?: return
        if (note.isProtected || note.isLocked || current.saving) return
        mutableState.value = current.copy(
            selectedNote = note.copy(title = title),
            isDirty = true,
            error = null,
        )
    }

    fun updateDraftContent(content: String) = updateDraft { it.copy(content = content) }

    fun saveNote(closeAfterSave: Boolean = false) {
        val current = mutableState.value
        val note = current.selectedNote ?: return
        if (!current.isDirty || current.saving || !note.editableAsPlainText) {
            if (closeAfterSave && !current.isDirty && !current.saving) closeNoteWithoutSaving()
            return
        }

        mutableState.value = current.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                if (note.editableAsPlainText) repository.saveNote(note)
                else repository.renameNote(note.id, note.title)
                val savedNote = repository.loadNote(note.id)
                val catalog = repository.loadCatalog(mutableState.value.searchQuery)
                val parentCandidates = repository.loadNotes("")
                mutableState.value = mutableState.value.copy(
                    notes = catalog.notes,
                    treeNotes = catalog.tree,
                    parentCandidates = parentCandidates,
                    selectedNote = if (closeAfterSave) null else savedNote,
                    saving = false,
                    isDirty = false,
                    error = null,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("save note", error)
            }
        }
    }

    fun closeNote() {
        val current = mutableState.value
        if (current.saving) return
        if (current.isDirty) saveNote(closeAfterSave = true) else closeNoteWithoutSaving()
    }

    fun togglePin() {
        val current = mutableState.value
        val note = current.selectedNote ?: return
        if (current.saving || current.isDirty || note.isLocked || note.isProtected) return
        mutableState.value = current.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                repository.togglePin(note.id)
                val updated = repository.loadNote(note.id)
                val catalog = repository.loadCatalog(mutableState.value.searchQuery)
                mutableState.value = mutableState.value.copy(
                    notes = catalog.notes,
                    treeNotes = catalog.tree,
                    selectedNote = updated,
                    saving = false,
                    error = null,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("update note pin", error)
            }
        }
    }

    fun moveNote(newParentId: String?) = hierarchyController.moveNote(newParentId)

    fun reorderPages(parentId: String?, pageIds: List<String>) =
        hierarchyController.reorderPages(parentId, pageIds)

    fun deleteNote() {
        val note = mutableState.value.selectedNote ?: return
        if (mutableState.value.saving) return
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                repository.deleteNote(note.id)
                val parentCandidates = repository.loadNotes("")
                mutableState.value = mutableState.value.copy(
                    notes = mutableState.value.notes.filterNot { it.id == note.id },
                    parentCandidates = parentCandidates,
                    selectedNote = null,
                    isDirty = false,
                    saving = false,
                    loading = true,
                )
                loadNotes(++searchRequest)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("delete note", error)
            }
        }
    }

    private suspend fun loadNotes(request: Int) {
        try {
            val catalog = repository.loadCatalog(mutableState.value.searchQuery)
            if (request == searchRequest) {
                mutableState.value = mutableState.value.copy(
                    notes = catalog.notes,
                    treeNotes = catalog.tree,
                    loading = false,
                    error = null,
                )
            }
        } catch (error: CancellationException) {
            throw error
        } catch (error: Exception) {
            if (request == searchRequest) reportFailure("load notes", error)
        }
    }

    private fun updateDraft(update: (NoteDocument) -> NoteDocument) {
        val note = mutableState.value.selectedNote ?: return
        if (!note.editableAsPlainText || note.isProtected || note.isLocked || mutableState.value.saving) return
        mutableState.value = mutableState.value.copy(
            selectedNote = update(note),
            isDirty = true,
            error = null,
        )
    }

    private fun closeNoteWithoutSaving() {
        pageRequest++
        mutableState.value = mutableState.value.copy(
            selectedNote = null,
            loadingNote = false,
            isDirty = false,
            error = null,
        )
        refreshNotes()
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            loadingNote = false,
            saving = false,
            error = error.message ?: "Não foi possível acessar as notas.",
        )
    }

    override fun onCleared() {
        searchJob?.cancel()
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseNotes"
        const val SEARCH_DEBOUNCE_MS = 250L
    }
}
