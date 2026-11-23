package com.synapse.features.library.model

data class BookItem(
    val id: String,
    val title: String,
    val author: String,
    val currentPage: Int,
    val totalPages: Int,
    val status: String = "Lendo",
    val coverEmoji: String = "📖",
    val isArchived: Boolean = false,
    val collectionIds: Set<String> = emptySet(),
)

data class LibraryCollectionItem(
    val id: String,
    val name: String,
    val color: String,
)

data class LibraryCatalog(
    val books: List<BookItem>,
    val stats: LibraryStats,
    val collections: List<LibraryCollectionItem>,
)

data class BookBookmark(
    val id: String,
    val pageNumber: Int,
    val label: String,
)

data class BookHighlight(
    val id: String,
    val pageNumber: Int,
    val text: String,
    val color: String?,
    val note: String,
)

data class LibraryNotebook(
    val bookmarks: List<BookBookmark> = emptyList(),
    val highlights: List<BookHighlight> = emptyList(),
)
