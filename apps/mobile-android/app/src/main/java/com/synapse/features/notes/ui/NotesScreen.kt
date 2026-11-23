package com.synapse.features.notes.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.synapse.features.notes.ui.components.NotesEditorScreen
import com.synapse.features.notes.ui.components.NotesLibraryScreen
import com.synapse.features.notes.viewmodel.NotesViewModel
import com.synapse.features.settings.model.AndroidSettings
import com.synapse.ui.theme.BrandIndigo

@Composable
fun NotesScreen(
    initialNoteId: String? = null,
    createNewNote: Boolean = false,
    settings: AndroidSettings,
    onLaunchActionConsumed: () -> Unit,
) {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = NotesViewModel(context) as T
        }
    }
    val viewModel: NotesViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()

    LaunchedEffect(initialNoteId, createNewNote) {
        when {
            initialNoteId != null -> viewModel.openNote(initialNoteId)
            createNewNote -> viewModel.createNote("Nova Página")
        }
        if (initialNoteId != null || createNewNote) onLaunchActionConsumed()
    }

    BackHandler(enabled = state.selectedNote != null || state.loadingNote) {
        if (state.selectedNote != null) viewModel.closeNote() else viewModel.cancelOpeningNote()
    }

    when {
        state.loadingNote -> Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) { CircularProgressIndicator(color = BrandIndigo) }
        state.loading && state.notes.isEmpty() && state.selectedNote == null -> Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) { CircularProgressIndicator(color = BrandIndigo) }
        state.selectedNote != null -> NotesEditorScreen(
            note = state.selectedNote!!,
            settings = settings,
            parentCandidates = state.parentCandidates,
            hierarchyMutationVersion = state.hierarchyMutationVersion,
            saving = state.saving,
            dirty = state.isDirty,
            error = state.error,
            onTitleChange = viewModel::updateDraftTitle,
            onContentChange = viewModel::updateDraftContent,
            onSave = { viewModel.saveNote() },
            onClose = viewModel::closeNote,
            onTogglePin = viewModel::togglePin,
            onCreateSubpage = viewModel::createSubpage,
            onMove = viewModel::moveNote,
            onDelete = viewModel::deleteNote,
        )
        else -> NotesLibraryScreen(
            state = state,
            onSearch = viewModel::updateSearch,
            onRefresh = viewModel::refreshNotes,
            onOpenNote = viewModel::openNote,
            onCreateNote = viewModel::createNote,
            onReorderSiblings = viewModel::reorderPages,
        )
    }
}
