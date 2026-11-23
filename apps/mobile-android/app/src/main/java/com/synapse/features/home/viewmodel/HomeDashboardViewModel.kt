package com.synapse.features.home.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.home.data.HomeDashboardRepository
import com.synapse.features.home.data.HomeDashboardSnapshot
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeDashboardUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val snapshot: HomeDashboardSnapshot? = null,
)

class HomeDashboardViewModel(context: Context) : ViewModel() {
    private val repository = HomeDashboardRepository(context)
    private val mutableState = MutableStateFlow(HomeDashboardUiState())
    private var requestGeneration = 0L
    val state: StateFlow<HomeDashboardUiState> = mutableState.asStateFlow()

    fun refresh() {
        val request = ++requestGeneration
        mutableState.value = mutableState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val snapshot = repository.load()
                if (request == requestGeneration) {
                    mutableState.value = HomeDashboardUiState(loading = false, snapshot = snapshot)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                Log.e(TAG, "Failed to load home dashboard", error)
                if (request == requestGeneration) {
                    mutableState.value = mutableState.value.copy(
                        loading = false,
                        error = error.message ?: "Não foi possível carregar o painel inicial.",
                    )
                }
            }
        }
    }

    override fun onCleared() {
        requestGeneration++
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseHomeDashboard"
    }
}
