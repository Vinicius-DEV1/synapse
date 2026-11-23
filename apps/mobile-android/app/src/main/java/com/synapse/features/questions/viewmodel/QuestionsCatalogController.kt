package com.synapse.features.questions.viewmodel

import android.util.Log
import com.synapse.features.questions.data.QuestionsRepository
import com.synapse.features.questions.model.QuestionsUiState
import com.synapse.features.questions.model.QuizBattery
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

class QuestionsCatalogController(
    private val repository: QuestionsRepository,
    private val scope: CoroutineScope,
    private val state: MutableStateFlow<QuestionsUiState>,
) {
    fun loadLibrary() {
        state.value = state.value.copy(loading = true, error = null)
        scope.launch {
            try {
                val batteries = repository.loadBatteries()
                val stats = repository.loadStats()
                val tags = repository.loadTags()
                state.value = state.value.copy(
                    loading = false,
                    batteries = batteries,
                    stats = stats,
                    availableTags = tags,
                    error = null,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("load question batteries", error)
            }
        }
    }

    fun manageQuestions(battery: QuizBattery) {
        state.value = state.value.copy(
            selectedManagedBattery = battery,
            managedQuestions = emptyList(),
            loadingManagedQuestions = true,
            error = null,
        )
        scope.launch {
            try {
                val questions = repository.loadQuestions(battery.id)
                if (state.value.selectedManagedBattery?.id == battery.id) {
                    state.value = state.value.copy(
                        managedQuestions = questions,
                        loadingManagedQuestions = false,
                        error = null,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (state.value.selectedManagedBattery?.id == battery.id) {
                    reportFailure("load battery questions", error)
                }
            }
        }
    }

    fun closeQuestionManager() {
        state.value = state.value.copy(
            selectedManagedBattery = null,
            managedQuestions = emptyList(),
            loadingManagedQuestions = false,
            error = null,
        )
    }

    fun createBattery(title: String, description: String) = mutate("create quiz battery") {
        repository.createBattery(title, description)
        refreshLibraryContent()
    }

    fun updateBattery(id: String, title: String, description: String) = mutate("update quiz battery") {
        repository.updateBattery(id, title, description)
        refreshLibraryContent()
    }

    fun deleteBattery(id: String) = mutate("delete quiz battery") {
        repository.deleteBattery(id)
        if (state.value.selectedManagedBattery?.id == id) closeQuestionManager()
        refreshLibraryContent()
    }

    fun createQuestion(
        batteryId: String,
        prompt: String,
        options: List<String>,
        correctIndex: Int,
        explanation: String,
        tags: List<String>,
    ) = mutate("create quiz question") {
        repository.createQuestion(batteryId, prompt, options, correctIndex, explanation, tags)
        refreshLibraryContent()
    }

    fun updateQuestion(
        questionId: String,
        prompt: String,
        options: List<String>,
        correctIndex: Int,
        explanation: String,
        tags: List<String>,
    ) = mutate("update quiz question") {
        repository.updateQuestion(questionId, prompt, options, correctIndex, explanation, tags)
        refreshLibraryContent()
    }

    fun deleteQuestion(questionId: String) = mutate("delete quiz question") {
        repository.deleteQuestion(questionId)
        refreshLibraryContent()
    }

    private suspend fun refreshLibraryContent() {
        val batteries = repository.loadBatteries()
        val stats = repository.loadStats()
        val tags = repository.loadTags()
        val managedQuestions = state.value.selectedManagedBattery?.let { repository.loadQuestions(it.id) }
            .orEmpty()
        state.value = state.value.copy(
            batteries = batteries,
            stats = stats,
            availableTags = tags,
            managedQuestions = managedQuestions,
            loadingManagedQuestions = false,
        )
    }

    private fun mutate(action: String, operation: suspend () -> Unit) {
        val current = state.value
        if (current.loading || current.loadingQuestions || current.saving) return
        state.value = current.copy(saving = true, error = null)
        scope.launch {
            try {
                operation()
                state.value = state.value.copy(saving = false, error = null)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure(action, error)
            }
        }
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        state.value = state.value.copy(
            loading = false,
            loadingQuestions = false,
            loadingManagedQuestions = false,
            saving = false,
            error = error.message ?: "Não foi possível acessar as questões.",
        )
    }

    private companion object {
        const val TAG = "SynapseQuestionsCatalog"
    }
}
