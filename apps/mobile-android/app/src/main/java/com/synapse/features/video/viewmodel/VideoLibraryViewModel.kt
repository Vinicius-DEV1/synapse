package com.synapse.features.video.viewmodel

import android.content.Context
import android.net.Uri
import android.util.Log
import com.synapse.R
import com.synapse.core.VideoFolderRecord
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.video.data.VideoRepository
import com.synapse.features.video.model.VideoLibraryItem
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class VideoLibraryUiState(
    val loading: Boolean = true,
    val importing: Boolean = false,
    val creatingFolder: Boolean = false,
    val error: String? = null,
    val items: List<VideoLibraryItem> = emptyList(),
    val folders: List<VideoFolderRecord> = emptyList(),
    val selectedFolderId: String? = null,
    val selectedVideo: VideoLibraryItem? = null,
)

class VideoLibraryViewModel(context: Context) : ViewModel() {
    private val appContext = context.applicationContext
    private val repository = VideoRepository(appContext)
    private val mutableState = MutableStateFlow(VideoLibraryUiState())
    private var generation = 0L
    private var progressJob: Job? = null
    val state: StateFlow<VideoLibraryUiState> = mutableState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        val request = ++generation
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(loading = true, error = null)
            try {
                val folders = repository.loadFolders()
                val items = repository.load(mutableState.value.selectedFolderId)
                if (request == generation) {
                    mutableState.value = mutableState.value.copy(loading = false, items = items, folders = folders)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure("load video catalog", error)
            }
        }
    }

    fun selectFolder(folderId: String?) {
        if (folderId == mutableState.value.selectedFolderId) return
        mutableState.value = mutableState.value.copy(selectedFolderId = folderId)
        refresh()
    }

    fun createFolder(name: String, duplicateMessage: String) {
        if (mutableState.value.creatingFolder) return
        mutableState.value = mutableState.value.copy(creatingFolder = true)
        viewModelScope.launch {
            try {
                if (repository.createFolder(name) == null) {
                    mutableState.value = mutableState.value.copy(creatingFolder = false, error = duplicateMessage)
                } else {
                    mutableState.value = mutableState.value.copy(creatingFolder = false)
                    refresh()
                }
            } catch (error: CancellationException) {
                mutableState.value = mutableState.value.copy(creatingFolder = false)
                throw error
            } catch (error: Exception) {
                reportFailure("create video folder", error)
            }
        }
    }

    fun renameFolder(folderId: String, name: String, duplicateMessage: String) {
        if (mutableState.value.creatingFolder) return
        mutableState.value = mutableState.value.copy(creatingFolder = true)
        viewModelScope.launch {
            try {
                if (!repository.renameFolder(folderId, name)) {
                    mutableState.value = mutableState.value.copy(creatingFolder = false, error = duplicateMessage)
                } else {
                    mutableState.value = mutableState.value.copy(creatingFolder = false)
                    refresh()
                }
            } catch (error: CancellationException) {
                mutableState.value = mutableState.value.copy(creatingFolder = false)
                throw error
            } catch (error: Exception) {
                reportFailure("rename video folder", error)
            }
        }
    }

    fun deleteFolder(folderId: String, unavailableMessage: String) {
        viewModelScope.launch {
            try {
                if (!repository.deleteFolder(folderId)) {
                    mutableState.value = mutableState.value.copy(error = unavailableMessage)
                } else if (mutableState.value.selectedFolderId == folderId) {
                    mutableState.value = mutableState.value.copy(selectedFolderId = null)
                }
                refresh()
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("delete video folder", error)
            }
        }
    }

    fun moveToFolder(video: VideoLibraryItem, folderId: String?, unavailableMessage: String) {
        viewModelScope.launch {
            try {
                if (!repository.moveToFolder(video.id, folderId)) {
                    mutableState.value = mutableState.value.copy(error = unavailableMessage)
                }
                refresh()
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("move video", error)
            }
        }
    }

    fun importVideo(uri: Uri) {
        if (mutableState.value.importing) return
        val request = ++generation
        mutableState.value = mutableState.value.copy(importing = true, error = null)
        viewModelScope.launch {
            try {
                repository.importLocalVideo(uri, mutableState.value.selectedFolderId)
                val items = repository.load(mutableState.value.selectedFolderId)
                if (request == generation) {
                    mutableState.value = mutableState.value.copy(importing = false, loading = false, items = items)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure("import video", error)
            }
        }
    }

    fun open(video: VideoLibraryItem, unavailableMessage: String) {
        if (!video.canPlayOnAndroid) {
            mutableState.value = mutableState.value.copy(error = unavailableMessage)
            return
        }
        mutableState.value = mutableState.value.copy(selectedVideo = video, error = null)
    }

    fun closePlayer() {
        mutableState.value = mutableState.value.copy(selectedVideo = null)
    }

    fun saveProgress(video: VideoLibraryItem, seconds: Double) {
        if (!seconds.isFinite() || seconds < 0.0) return
        progressJob?.cancel()
        progressJob = viewModelScope.launch {
            try {
                repository.saveProgress(video.id, seconds)
                mutableState.value = mutableState.value.copy(
                    items = mutableState.value.items.map { if (it.id == video.id) it.copy(progressSeconds = seconds) else it },
                    selectedVideo = mutableState.value.selectedVideo?.let {
                        if (it.id == video.id) it.copy(progressSeconds = seconds) else it
                    },
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("save video progress", error)
            }
        }
    }

    fun saveDuration(video: VideoLibraryItem, seconds: Double) {
        if (!seconds.isFinite() || seconds <= 0.0) return
        viewModelScope.launch {
            try {
                repository.saveDuration(video.id, seconds)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("save video duration", error)
            }
        }
    }

    fun dismissError() {
        mutableState.value = mutableState.value.copy(error = null)
    }

    fun showError(message: String) {
        mutableState.value = mutableState.value.copy(error = message)
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            importing = false,
            creatingFolder = false,
            error = appContext.getString(R.string.video_error_generic),
        )
    }

    override fun onCleared() {
        progressJob?.cancel()
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseVideo"
    }
}
