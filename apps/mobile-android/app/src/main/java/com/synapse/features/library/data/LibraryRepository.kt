package com.synapse.features.library.data

import android.content.Context
import com.synapse.core.SynapseLibraryStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.library.model.BookBookmark
import com.synapse.features.library.model.BookHighlight
import com.synapse.features.library.model.BookItem
import com.synapse.features.library.model.LibraryCatalog
import com.synapse.features.library.model.LibraryCollectionItem
import com.synapse.features.library.model.LibraryNotebook
import com.synapse.features.library.model.LibraryStats
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray

class LibraryRepository(context: Context) : AutoCloseable {
    private val databasePath = SynapseDatabase.path(context)
    private var store: SynapseLibraryStore? = null

    suspend fun loadLibrary(): LibraryCatalog = withContext(Dispatchers.IO) {
        val library = store()
        val books = library.getBooks(null).map { row ->
            BookItem(
                id = row.id,
                title = row.title,
                author = row.author.orEmpty(),
                currentPage = row.currentPage ?: 0,
                totalPages = row.totalPages ?: 0,
                status = if (row.isArchived == true) "Arquivado" else when (row.readingStatus) {
                    "finished" -> "Concluído"
                    "reading" -> "Lendo"
                    else -> "Na Fila"
                },
                coverEmoji = "📖",
                isArchived = row.isArchived == true,
                collectionIds = parseCollectionIds(row.collections),
            )
        }
        val stats = library.getStats().let { row ->
            LibraryStats(row.currentProgressPages, row.totalBooksStarted, row.totalBooksFinished)
        }
        val collections = library.getCollections().map { row ->
            LibraryCollectionItem(id = row.id, name = row.name, color = row.color)
        }
        LibraryCatalog(books, stats, collections)
    }

    suspend fun createBook(title: String, author: String, totalPages: Int): Unit =
        withContext(Dispatchers.IO) {
            store().createBook(title, author.takeIf(String::isNotBlank), totalPages)
            Unit
        }

    suspend fun adjustProgress(bookId: String, delta: Int): Unit = withContext(Dispatchers.IO) {
        check(store().adjustProgress(bookId, delta)) { "O livro não está mais disponível." }
        Unit
    }

    suspend fun loadNotebook(bookId: String): LibraryNotebook = withContext(Dispatchers.IO) {
        val library = store()
        LibraryNotebook(
            bookmarks = library.getBookmarks(bookId).map { row ->
                BookBookmark(row.id, row.pageNumber, row.label.orEmpty())
            },
            highlights = library.getHighlights(bookId).map { row ->
                BookHighlight(
                    id = row.id,
                    pageNumber = row.pageNumber,
                    text = row.textContent,
                    color = row.color,
                    note = row.note.orEmpty(),
                )
            },
        )
    }

    suspend fun createBookmark(bookId: String, pageNumber: Int, label: String): Unit =
        withContext(Dispatchers.IO) {
            store().createBookmark(bookId, pageNumber, label.takeIf(String::isNotBlank))
            Unit
        }

    suspend fun updateBookmark(bookmarkId: String, label: String): Unit = withContext(Dispatchers.IO) {
        check(store().updateBookmark(bookmarkId, label)) { "O marcador não está mais disponível." }
        Unit
    }

    suspend fun deleteBookmark(bookmarkId: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteBookmark(bookmarkId)) { "O marcador não está mais disponível." }
        Unit
    }

    suspend fun createHighlight(bookId: String, pageNumber: Int, text: String, note: String): Unit =
        withContext(Dispatchers.IO) {
            store().createHighlight(
                bookId,
                pageNumber,
                text,
                DEFAULT_HIGHLIGHT_COLOR,
                null,
                TEXT_HIGHLIGHT_TYPE,
                note.takeIf(String::isNotBlank),
            )
            Unit
        }

    suspend fun updateHighlightNote(highlightId: String, note: String): Unit =
        withContext(Dispatchers.IO) {
            check(store().updateHighlight(highlightId, null, null, null, null, note)) {
                "O destaque não está mais disponível."
            }
            Unit
        }

    suspend fun deleteHighlight(highlightId: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteHighlight(highlightId)) { "O destaque não está mais disponível." }
        Unit
    }

    suspend fun updateMetadata(
        bookId: String,
        title: String,
        author: String,
        collectionIds: Set<String>,
    ): Unit =
        withContext(Dispatchers.IO) {
            check(store().updateBookAndCollections(bookId, title, author, collectionIds.toList())) {
                "O livro não está mais disponível."
            }
            Unit
        }

    suspend fun saveCollection(collection: LibraryCollectionItem?, name: String): Unit =
        withContext(Dispatchers.IO) {
            val library = store()
            if (collection == null) {
                library.createCollection(name, DEFAULT_COLLECTION_COLOR)
            } else {
                check(library.updateCollection(collection.id, name, collection.color)) {
                    "A coleção não está mais disponível."
                }
            }
            Unit
        }

    suspend fun deleteCollection(collectionId: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteCollection(collectionId)) { "A coleção não está mais disponível." }
        Unit
    }

    private fun parseCollectionIds(serialized: String?): Set<String> {
        if (serialized.isNullOrBlank()) return emptySet()
        val values = JSONArray(serialized)
        return buildSet {
            for (index in 0 until values.length()) {
                val id = values.getJSONObject(index).optString("id").trim()
                if (id.isNotEmpty()) add(id)
            }
        }
    }

    suspend fun setArchived(bookId: String, archived: Boolean): Unit = withContext(Dispatchers.IO) {
        check(store().setBookArchived(bookId, archived)) { "O livro não está mais disponível." }
        Unit
    }

    suspend fun deleteBook(bookId: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteBook(bookId)) { "O livro não está mais disponível." }
        Unit
    }

    @Synchronized
    private fun store(): SynapseLibraryStore = store
        ?: SynapseLibraryStore.open(databasePath).also { store = it }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
    }

    private companion object {
        const val DEFAULT_COLLECTION_COLOR = "#8B5CF6"
        const val DEFAULT_HIGHLIGHT_COLOR = "yellow"
        const val TEXT_HIGHLIGHT_TYPE = "text"
    }
}
