package com.synapse.features.notes.model

data class NoteSummary(
    val id: String,
    val parentId: String?,
    val title: String,
    val icon: String,
    val updatedAt: String?,
    val isPinned: Boolean,
    val isLocked: Boolean,
    val depth: Int = 0,
    val hasChildren: Boolean = false,
)

data class NoteDocument(
    val id: String,
    val parentId: String?,
    val title: String,
    val content: String,
    val icon: String,
    val updatedAt: String?,
    val isPinned: Boolean,
    val isLocked: Boolean,
    val isProtected: Boolean,
    val editableAsPlainText: Boolean,
)

data class NotesCatalog(
    val notes: List<NoteSummary>,
    val tree: List<NoteSummary>,
)

data class NotesUiState(
    val loading: Boolean = true,
    val loadingNote: Boolean = false,
    val saving: Boolean = false,
    val isDirty: Boolean = false,
    val error: String? = null,
    val searchQuery: String = "",
    val notes: List<NoteSummary> = emptyList(),
    val treeNotes: List<NoteSummary> = emptyList(),
    val parentCandidates: List<NoteSummary> = emptyList(),
    val selectedNote: NoteDocument? = null,
    val hierarchyMutationVersion: Long = 0,
)
