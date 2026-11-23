package com.synapse.features.culture.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.culture.data.CultureRepository
import com.synapse.features.culture.model.CultureEpisodeItem
import com.synapse.features.culture.model.CultureMediaItem
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CultureUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val error: String? = null,
    val items: List<CultureMediaItem> = emptyList(),
    val episodes: List<CultureEpisodeItem> = emptyList(),
    val episodesLoading: Boolean = false,
    val episodesError: String? = null,
    val mutationVersion: Long = 0,
)

class CultureViewModel(context: Context) : ViewModel() {
    private val repository = CultureRepository(context)
    private val mutableState = MutableStateFlow(CultureUiState())
    private var generation = 0L
    private var episodeGeneration = 0L
    val state: StateFlow<CultureUiState> = mutableState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        val request = ++generation
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(loading = true, error = null)
            try {
                val items = repository.load()
                if (request == generation) {
                    mutableState.value = mutableState.value.copy(loading = false, items = items)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure("load culture items", error)
            }
        }
    }

    fun create(title: String, type: String, totalProgress: Int) {
        mutate { repository.create(title, type, totalProgress) }
    }

    fun update(item: CultureMediaItem) {
        mutate { repository.update(item) }
    }

    fun updateProgress(item: CultureMediaItem, progress: Int) {
        mutate { repository.updateProgress(item, progress) }
    }

    fun markCompleted(item: CultureMediaItem) {
        mutate { repository.markCompleted(item) }
    }

    fun setGoal(item: CultureMediaItem, enabled: Boolean) {
        mutate { repository.setGoal(item, enabled) }
    }

    fun delete(item: CultureMediaItem) {
        mutate { repository.delete(item) }
    }

    fun loadEpisodes(item: CultureMediaItem) {
        val request = ++episodeGeneration
        if (item.type !in EPISODE_MEDIA_TYPES) {
            mutableState.value = mutableState.value.copy(episodes = emptyList(), episodesLoading = false, episodesError = null)
            return
        }
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(episodes = emptyList(), episodesLoading = true, episodesError = null)
            try {
                val episodes = repository.loadEpisodes(item)
                if (request == episodeGeneration) {
                    mutableState.value = mutableState.value.copy(episodes = episodes, episodesLoading = false)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == episodeGeneration) {
                    Log.e(TAG, "Failed to load culture episodes", error)
                    mutableState.value = mutableState.value.copy(
                        episodesLoading = false,
                        episodesError = error.message ?: "Não foi possível carregar os episódios.",
                    )
                }
            }
        }
    }

    fun createEpisodeChecklist(item: CultureMediaItem) {
        mutate(refreshEpisodesFor = item) { repository.createEpisodeChecklist(item) }
    }

    fun toggleEpisode(item: CultureMediaItem, episode: CultureEpisodeItem) {
        mutate(refreshEpisodesFor = item) { repository.toggleEpisode(item, episode) }
    }

    private fun mutate(refreshEpisodesFor: CultureMediaItem? = null, operation: suspend () -> Unit) {
        if (mutableState.value.saving) return
        val request = ++generation
        episodeGeneration += 1
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                operation()
                if (request == generation) {
                    val current = mutableState.value
                    mutableState.value = current.copy(mutationVersion = current.mutationVersion + 1)
                }
                val items = repository.load()
                val episodes = refreshEpisodesFor?.let { item -> repository.loadEpisodes(item) }
                if (request == generation) {
                    mutableState.value = mutableState.value.copy(
                        saving = false,
                        items = items,
                        episodes = episodes ?: mutableState.value.episodes,
                        episodesLoading = false,
                        episodesError = null,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == generation) reportFailure("save culture data", error)
            }
        }
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            saving = false,
            error = error.message ?: "Não foi possível acessar os dados de Cultura.",
        )
    }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseCulture"
        val EPISODE_MEDIA_TYPES = setOf("anime", "série")
    }
}
