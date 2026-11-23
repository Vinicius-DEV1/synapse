package com.synapse.features.questions.model

data class QuizBattery(
    val id: String,
    val title: String,
    val description: String?,
    val questionCount: Long,
)

data class QuizQuestion(
    val id: String,
    val batteryId: String,
    val type: String,
    val prompt: String,
    val options: List<String>,
    val explanation: String?,
    val correctIndex: Int,
    val tags: List<String>,
)

data class QuizAnswerOutcome(
    val isCorrect: Boolean,
    val correctIndex: Int,
    val correctAnswer: String,
    val explanation: String?,
)

data class QuizAttemptHistory(
    val id: String,
    val questionId: String,
    val question: String,
    val type: String,
    val userTypedAnswer: String?,
    val userAnswer: String?,
    val correctAnswer: String,
    val explanation: String?,
    val isCorrect: Boolean,
    val durationMs: Long,
    val createdAt: String?,
)

data class QuizStats(
    val totalAttempts: Long,
    val answeredQuestions: Long,
    val correctAttempts: Long,
    val incorrectAttempts: Long,
    val accuracyRate: Long,
    val reviewableIncorrectQuestions: Long,
)

data class QuestionsUiState(
    val loading: Boolean = true,
    val loadingQuestions: Boolean = false,
    val saving: Boolean = false,
    val error: String? = null,
    val batteries: List<QuizBattery> = emptyList(),
    val availableTags: List<String> = emptyList(),
    val selectedManagedBattery: QuizBattery? = null,
    val managedQuestions: List<QuizQuestion> = emptyList(),
    val loadingManagedQuestions: Boolean = false,
    val stats: QuizStats? = null,
    val showAttemptHistory: Boolean = false,
    val attemptHistory: List<QuizAttemptHistory> = emptyList(),
    val loadingAttemptHistory: Boolean = false,
    val attemptHistoryError: String? = null,
    val attemptHistoryQuestionId: String? = null,
    val selectedBattery: QuizBattery? = null,
    val sessionTitle: String = "",
    val questions: List<QuizQuestion> = emptyList(),
    val currentIndex: Int = 0,
    val selectedOption: Int = -1,
    val outcome: QuizAnswerOutcome? = null,
    val showExplanation: Boolean = false,
    val score: Int = 0,
    val finished: Boolean = false,
)
