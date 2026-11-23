package com.synapse.features.files.viewmodel

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.files.data.FilesRepository
import com.synapse.features.files.model.FilesSections
import com.synapse.features.files.model.FilesUiState
import com.synapse.features.files.model.StoredFile
import com.synapse.features.files.model.StoredFolder
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class FilesViewModel(context: Context) : ViewModel() {
    private val repository = FilesRepository(context)
    private val mutableState = MutableStateFlow(FilesUiState())
    val state: StateFlow<FilesUiState> = mutableState.asStateFlow()
    private var generation = 0L
    private var searchGeneration = 0L
    private var searchJob: Job? = null
    private var globalSearchQuery = ""

    init {
        refresh()
    }

    fun selectSection(section: String) {
        if (section !in SECTIONS || mutableState.value.saving) return
        clearGlobalSearch()
        mutableState.value = mutableState.value.copy(
            section = section,
            folderId = null,
            folderName = null,
            folderPath = emptyList(),
            loading = true,
            folders = emptyList(),
            files = emptyList(),
        )
        refresh()
    }

    fun openFolder(folder: StoredFolder) {
        if (mutableState.value.saving) return
        val path = mutableState.value.folderPath + folder
        mutableState.value = mutableState.value.copy(
            folderId = folder.id,
            folderName = folder.name,
            folderPath = path,
            loading = true,
            folders = emptyList(),
            files = emptyList(),
        )
        refresh()
    }

    fun openFolderFromSearch(folder: StoredFolder) {
        if (mutableState.value.saving) return
        val foldersById = mutableState.value.allFolders.associateBy { it.id }
        val reversedPath = mutableListOf<StoredFolder>()
        val visitedIds = mutableSetOf<String>()
        var current: StoredFolder? = folder
        while (current != null && visitedIds.add(current.id)) {
            reversedPath += current
            current = current.parentId?.let(foldersById::get)
        }
        clearGlobalSearch()
        mutableState.value = mutableState.value.copy(
            section = FilesSections.FOLDERS,
            folderId = folder.id,
            folderName = folder.name,
            folderPath = reversedPath.asReversed(),
            loading = true,
            folders = emptyList(),
            files = emptyList(),
        )
        refresh()
    }

    fun goUp() {
        if (mutableState.value.saving) return
        val path = mutableState.value.folderPath.dropLast(1)
        val parent = path.lastOrNull()
        mutableState.value = mutableState.value.copy(
            folderId = parent?.id,
            folderName = parent?.name,
            folderPath = path,
            loading = true,
            folders = emptyList(),
            files = emptyList(),
        )
        refresh()
    }

    fun navigateToFolderPath(path: List<StoredFolder>) {
        if (mutableState.value.saving) return
        val normalizedPath = path.takeIf { it.isNotEmpty() } ?: return
        mutableState.value = mutableState.value.copy(
            section = FilesSections.FOLDERS,
            folderId = normalizedPath.last().id,
            folderName = normalizedPath.last().name,
            folderPath = normalizedPath,
            loading = true,
            folders = emptyList(),
            files = emptyList(),
        )
        refresh()
    }

    fun refresh() {
        val request = ++generation
        val current = mutableState.value
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(loading = true, error = null)
            try {
                val snapshot = repository.load(current.section, current.folderId)
                if (request == generation) mutableState.value = mutableState.value.copy(
                    loading = false,
                    folders = snapshot.folders,
                    files = snapshot.files,
                    allFolders = snapshot.allFolders,
                    driveFileCount = snapshot.driveFileCount,
                )
                if (request == generation && globalSearchQuery.isNotBlank()) {
                    searchGlobally(globalSearchQuery)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure("load files", error)
            }
        }
    }

    fun createFolder(name: String) = mutate("create folder") { repository.createFolder(name, mutableState.value.folderId) }
    fun renameFolder(folder: StoredFolder, name: String) = mutate("rename folder") { repository.renameFolder(folder.id, name) }
    fun deleteFolder(folder: StoredFolder) = mutate("delete folder") { repository.deleteFolder(folder.id) }
    fun moveFolder(folder: StoredFolder, parentId: String?) = mutate("move folder") { repository.moveFolder(folder.id, parentId) }
    fun renameFile(file: StoredFile, name: String) = mutate("rename file") { repository.renameFile(file.id, name) }
    fun deleteFile(file: StoredFile) = mutate("delete file") { repository.deleteFile(file.id) }
    fun moveFile(file: StoredFile, folderId: String?) = mutate("move file") { repository.moveFile(file.id, folderId) }
    fun duplicateFile(file: StoredFile) = mutate("duplicate file") { repository.duplicateFile(file.id, file.folderId) }
    fun importDocuments(uris: List<Uri>) = mutate("import files") {
        repository.importDocuments(uris, mutableState.value.folderId)
    }

    fun searchGlobally(query: String) {
        globalSearchQuery = query
        searchJob?.cancel()
        val request = ++searchGeneration
        val section = mutableState.value.section
        if (query.isBlank()) {
            mutableState.value = mutableState.value.copy(searching = false, searchResults = emptyList())
            return
        }

        mutableState.value = mutableState.value.copy(searching = true, error = null)
        searchJob = viewModelScope.launch {
            delay(SEARCH_DEBOUNCE_MILLIS)
            try {
                val results = repository.searchFiles(section, query)
                if (request == searchGeneration) mutableState.value = mutableState.value.copy(
                    searching = false,
                    searchResults = results,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == searchGeneration) {
                    Log.e(TAG, "Failed to search files globally", error)
                    mutableState.value = mutableState.value.copy(
                        searching = false,
                        error = error.message ?: "Não foi possível buscar os arquivos.",
                    )
                }
            }
        }
    }

    fun clearGlobalSearch() {
        globalSearchQuery = ""
        searchGeneration++
        searchJob?.cancel()
        searchJob = null
        mutableState.value = mutableState.value.copy(searching = false, searchResults = emptyList())
    }

    private fun mutate(action: String, operation: suspend () -> Unit) {
        if (mutableState.value.saving || mutableState.value.loading) return
        val request = ++generation
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                operation()
                val current = mutableState.value
                val snapshot = repository.load(current.section, current.folderId)
                if (request == generation) mutableState.value = current.copy(
                    loading = false,
                    saving = false,
                    folders = snapshot.folders,
                    files = snapshot.files,
                    allFolders = snapshot.allFolders,
                    driveFileCount = snapshot.driveFileCount,
                )
                if (request == generation && globalSearchQuery.isNotBlank()) {
                    searchGlobally(globalSearchQuery)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure(action, error)
            }
        }
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            saving = false,
            error = error.message ?: "Não foi possível acessar os arquivos.",
        )
    }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    private companion object {
        val SECTIONS = setOf(FilesSections.FOLDERS, FilesSections.RECENT, FilesSections.DRIVE)
        const val TAG = "SynapseFiles"
        const val SEARCH_DEBOUNCE_MILLIS = 250L
    }
}
