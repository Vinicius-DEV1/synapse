package com.synapse.features.library.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.library.data.LibraryRepository
import com.synapse.features.library.model.BookItem
import com.synapse.features.library.model.LibraryCollectionItem
import com.synapse.features.library.model.LibraryNotebook
import com.synapse.features.library.model.LibraryUiState
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class LibraryViewModel(context: Context) : ViewModel() {
    private val repository = LibraryRepository(context)
    private val mutableState = MutableStateFlow(LibraryUiState())
    val state: StateFlow<LibraryUiState> = mutableState.asStateFlow()
    private var libraryRequest = 0
    private var notebookRequest = 0

    init {
        loadLibrary()
    }

    fun loadLibrary() {
        val request = ++libraryRequest
        mutableState.value = mutableState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val catalog = repository.loadLibrary()
                if (request == libraryRequest) {
                    mutableState.value = mutableState.value.copy(
                        loading = false,
                        books = catalog.books,
                        stats = catalog.stats,
                        collections = catalog.collections,
                        error = null,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == libraryRequest) reportFailure("load library", error)
            }
        }
    }

    fun createBook(title: String, author: String, totalPages: Int) = mutate("create library book") {
        repository.createBook(title, author, totalPages)
        refreshAfterMutation()
    }

    fun updateBook(book: BookItem, title: String, author: String, collectionIds: Set<String>) = mutate("update library book") {
        repository.updateMetadata(book.id, title, author, collectionIds)
        refreshAfterMutation()
    }

    fun saveCollection(collection: LibraryCollectionItem?, name: String) = mutate("save library collection") {
        repository.saveCollection(collection, name)
        refreshAfterMutation()
    }

    fun deleteCollection(collection: LibraryCollectionItem) = mutate("delete library collection") {
        repository.deleteCollection(collection.id)
        refreshAfterMutation()
    }

    fun setArchived(book: BookItem, archived: Boolean) = mutate("update book archive state") {
        repository.setArchived(book.id, archived)
        refreshAfterMutation()
    }

    fun deleteBook(book: BookItem) = mutate("delete library book") {
        repository.deleteBook(book.id)
        refreshAfterMutation()
    }

    fun adjustProgress(book: BookItem, delta: Int) {
        if (mutableState.value.saving || book.id in mutableState.value.savingBookIds) return
        mutableState.value = mutableState.value.copy(
            savingBookIds = mutableState.value.savingBookIds + book.id,
            error = null,
        )
        viewModelScope.launch {
            try {
                repository.adjustProgress(book.id, delta)
                val catalog = repository.loadLibrary()
                mutableState.value = mutableState.value.copy(
                    savingBookIds = mutableState.value.savingBookIds - book.id,
                    books = catalog.books,
                    stats = catalog.stats,
                    collections = catalog.collections,
                    error = null,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                Log.e(TAG, "Failed to update reading progress", error)
                mutableState.value = mutableState.value.copy(
                    savingBookIds = mutableState.value.savingBookIds - book.id,
                    error = error.message ?: "Não foi possível atualizar o progresso de leitura.",
                )
            }
        }
    }

    fun openNotebook(book: BookItem) {
        loadNotebook(book.id)
    }

    fun retryNotebook() {
        mutableState.value.notebookBookId?.let(::loadNotebook)
    }

    private fun loadNotebook(bookId: String) {
        val request = ++notebookRequest
        mutableState.value = mutableState.value.copy(
            notebookBookId = bookId,
            notebook = LibraryNotebook(),
            notebookLoading = true,
            notebookError = null,
        )
        viewModelScope.launch {
            try {
                val notebook = repository.loadNotebook(bookId)
                if (request == notebookRequest) {
                    mutableState.value = mutableState.value.copy(
                        notebook = notebook,
                        notebookLoading = false,
                        notebookError = null,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == notebookRequest) {
                    Log.e(TAG, "Failed to load book annotations", error)
                    mutableState.value = mutableState.value.copy(
                        notebookLoading = false,
                        notebookError = error.message ?: "Não foi possível carregar o caderno de leitura.",
                    )
                }
            }
        }
    }

    fun closeNotebook() {
        notebookRequest++
        mutableState.value = mutableState.value.copy(
            notebookBookId = null,
            notebook = LibraryNotebook(),
            notebookLoading = false,
            notebookSaving = false,
            notebookError = null,
        )
    }

    fun createBookmark(pageNumber: Int, label: String) = mutateNotebook("create bookmark") {
        repository.createBookmark(it, pageNumber, label)
    }

    fun updateBookmark(bookmarkId: String, label: String) = mutateNotebook("update bookmark") {
        repository.updateBookmark(bookmarkId, label)
    }

    fun deleteBookmark(bookmarkId: String) = mutateNotebook("delete bookmark") {
        repository.deleteBookmark(bookmarkId)
    }

    fun createHighlight(pageNumber: Int, text: String, note: String) =
        mutateNotebook("create highlight") {
            repository.createHighlight(it, pageNumber, text, note)
        }

    fun updateHighlightNote(highlightId: String, note: String) =
        mutateNotebook("update highlight note") {
            repository.updateHighlightNote(highlightId, note)
        }

    fun deleteHighlight(highlightId: String) = mutateNotebook("delete highlight") {
        repository.deleteHighlight(highlightId)
    }

    private fun mutateNotebook(action: String, operation: suspend (String) -> Unit) {
        val bookId = mutableState.value.notebookBookId ?: return
        if (mutableState.value.notebookSaving) return
        val request = notebookRequest
        mutableState.value = mutableState.value.copy(notebookSaving = true, notebookError = null)
        viewModelScope.launch {
            try {
                operation(bookId)
                val notebook = repository.loadNotebook(bookId)
                if (request == notebookRequest && bookId == mutableState.value.notebookBookId) {
                    mutableState.value = mutableState.value.copy(
                        notebook = notebook,
                        notebookSaving = false,
                        notebookMutationVersion = mutableState.value.notebookMutationVersion + 1,
                        notebookError = null,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                Log.e(TAG, "Failed to $action", error)
                if (request == notebookRequest && bookId == mutableState.value.notebookBookId) {
                    mutableState.value = mutableState.value.copy(
                        notebookSaving = false,
                        notebookError = error.message ?: "Não foi possível atualizar o caderno de leitura.",
                    )
                }
            }
        }
    }

    private fun mutate(action: String, operation: suspend () -> Unit) {
        if (mutableState.value.saving || mutableState.value.loading) return
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                operation()
                mutableState.value = mutableState.value.copy(
                    saving = false,
                    mutationVersion = mutableState.value.mutationVersion + 1,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure(action, error)
            }
        }
    }

    private suspend fun refreshAfterMutation() {
        val catalog = repository.loadLibrary()
        mutableState.value = mutableState.value.copy(
            books = catalog.books,
            stats = catalog.stats,
            collections = catalog.collections,
        )
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            saving = false,
            error = error.message ?: "Não foi possível atualizar a biblioteca.",
        )
    }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseLibrary"
    }
}
