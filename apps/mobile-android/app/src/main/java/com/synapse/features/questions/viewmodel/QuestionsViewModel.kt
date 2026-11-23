package com.synapse.features.questions.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.questions.data.QuestionsRepository
import com.synapse.features.questions.model.QuestionsUiState
import com.synapse.features.questions.model.QuizBattery
import com.synapse.features.questions.model.QuizQuestion
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class QuestionsViewModel(context: Context) : ViewModel() {
    private val repository = QuestionsRepository(context)
    private val mutableState = MutableStateFlow(QuestionsUiState())
    val state: StateFlow<QuestionsUiState> = mutableState.asStateFlow()
    val catalog = QuestionsCatalogController(repository, viewModelScope, mutableState)
    private var sessionRequest = 0

    init {
        catalog.loadLibrary()
    }

    fun startBattery(battery: QuizBattery) {
        if (mutableState.value.loading || mutableState.value.loadingQuestions || mutableState.value.saving) return
        val request = ++sessionRequest
        mutableState.value = mutableState.value.copy(loadingQuestions = true, error = null)
        viewModelScope.launch {
            try {
                val questions = repository.loadQuestions(battery.id)
                if (request == sessionRequest) startSession(battery.title, battery, questions)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == sessionRequest) reportFailure("load battery questions", error)
            }
        }
    }

    fun startSimulation(tags: List<String>, status: String, limit: Int, shuffle: Boolean) {
        loadSession("Simulado aleatório") { repository.loadFilteredQuestions(tags, status, limit, shuffle) }
    }

    fun startErrorNotebook() {
        loadSession("Caderno de erros", repository::loadErrorNotebook)
    }

    fun selectOption(index: Int) {
        val current = mutableState.value
        if (current.outcome != null || current.saving) return
        val question = current.questions.getOrNull(current.currentIndex) ?: return
        if (index !in question.options.indices) return
        mutableState.value = current.copy(selectedOption = index, error = null)
    }

    fun submitAnswer() {
        val current = mutableState.value
        val question = current.questions.getOrNull(current.currentIndex) ?: return
        if (current.selectedOption !in question.options.indices || current.outcome != null || current.saving) return
        mutableState.value = current.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                val outcome = repository.submitAnswer(question, current.selectedOption)
                mutableState.value = mutableState.value.copy(
                    saving = false,
                    outcome = outcome,
                    showExplanation = false,
                    score = current.score + if (outcome.isCorrect) 1 else 0,
                    error = null,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("save quiz answer", error)
            }
        }
    }

    fun nextQuestion() {
        val current = mutableState.value
        if (current.outcome == null || current.saving) return
        if (current.currentIndex == current.questions.lastIndex) {
            mutableState.value = current.copy(finished = true)
            catalog.loadLibrary()
            return
        }
        mutableState.value = current.copy(
            currentIndex = current.currentIndex + 1,
            selectedOption = -1,
            outcome = null,
            showExplanation = false,
            error = null,
        )
    }

    fun restartSession() {
        val current = mutableState.value
        if (current.questions.isEmpty()) return
        mutableState.value = current.copy(
            currentIndex = 0,
            selectedOption = -1,
            outcome = null,
            showExplanation = false,
            score = 0,
            finished = false,
            error = null,
        )
    }

    fun closeSession() {
        sessionRequest++
        mutableState.value = mutableState.value.copy(
            selectedBattery = null,
            sessionTitle = "",
            questions = emptyList(),
            currentIndex = 0,
            selectedOption = -1,
            outcome = null,
            showExplanation = false,
            score = 0,
            finished = false,
            saving = false,
            loadingQuestions = false,
            error = null,
        )
        catalog.loadLibrary()
    }

    fun toggleExplanation() {
        val current = mutableState.value
        if (current.outcome == null) return
        mutableState.value = current.copy(showExplanation = !current.showExplanation)
    }

    fun loadAttemptHistory() {
        loadAttemptHistory(questionId = null, limit = 50)
    }

    fun loadQuestionAttemptHistory(questionId: String) {
        loadAttemptHistory(questionId = questionId, limit = 500)
    }

    fun retryAttemptHistory() {
        val questionId = mutableState.value.attemptHistoryQuestionId
        loadAttemptHistory(questionId, if (questionId == null) 50 else 500)
    }

    private fun loadAttemptHistory(questionId: String?, limit: Int) {
        if (mutableState.value.loadingAttemptHistory) return
        mutableState.value = mutableState.value.copy(
            showAttemptHistory = true,
            loadingAttemptHistory = true,
            attemptHistoryError = null,
            attemptHistoryQuestionId = questionId,
        )
        viewModelScope.launch {
            try {
                val history = repository.loadAttemptHistory(questionId, limit)
                mutableState.value = mutableState.value.copy(
                    attemptHistory = history,
                    loadingAttemptHistory = false,
                    attemptHistoryError = null,
                )
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                Log.e(TAG, "Failed to load question attempt history", error)
                mutableState.value = mutableState.value.copy(
                    loadingAttemptHistory = false,
                    attemptHistoryError = error.message ?: "Não foi possível acessar o histórico de tentativas.",
                )
            }
        }
    }

    fun closeAttemptHistory() {
        mutableState.value = mutableState.value.copy(showAttemptHistory = false)
    }

    private fun loadSession(title: String, load: suspend () -> List<QuizQuestion>) {
        if (mutableState.value.loading || mutableState.value.loadingQuestions || mutableState.value.saving) return
        val request = ++sessionRequest
        mutableState.value = mutableState.value.copy(loadingQuestions = true, error = null)
        viewModelScope.launch {
            try {
                val questions = load()
                if (request == sessionRequest) startSession(title, null, questions)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == sessionRequest) reportFailure("load $title", error)
            }
        }
    }

    private fun startSession(title: String, battery: QuizBattery?, questions: List<QuizQuestion>) {
        require(questions.isNotEmpty()) { "Não há questões disponíveis para esta sessão." }
        require(questions.all { it.type == MULTIPLE_CHOICE_TYPE && it.options.size >= MIN_OPTIONS }) {
            "Esta sessão contém questões que ainda não são compatíveis com a revisão no Android."
        }
        mutableState.value = mutableState.value.copy(
            loadingQuestions = false,
            selectedBattery = battery,
            sessionTitle = title,
            questions = questions,
            currentIndex = 0,
            selectedOption = -1,
            outcome = null,
            showExplanation = false,
            score = 0,
            finished = false,
            error = null,
        )
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            loadingQuestions = false,
            loadingManagedQuestions = false,
            loadingAttemptHistory = false,
            saving = false,
            error = error.message ?: "Não foi possível acessar as questões.",
        )
    }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseQuestions"
        const val MULTIPLE_CHOICE_TYPE = "multiple_choice"
        const val MIN_OPTIONS = 2
    }
}
