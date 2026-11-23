package com.synapse.features.library.model

data class LibraryStats(
    val currentProgressPages: Long,
    val totalBooksStarted: Int,
    val totalBooksFinished: Int,
)

data class LibraryUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val mutationVersion: Long = 0,
    val savingBookIds: Set<String> = emptySet(),
    val error: String? = null,
    val books: List<BookItem> = emptyList(),
    val collections: List<LibraryCollectionItem> = emptyList(),
    val stats: LibraryStats? = null,
    val notebookBookId: String? = null,
    val notebook: LibraryNotebook = LibraryNotebook(),
    val notebookLoading: Boolean = false,
    val notebookSaving: Boolean = false,
    val notebookMutationVersion: Long = 0,
    val notebookError: String? = null,
)
