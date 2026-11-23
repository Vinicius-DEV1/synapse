package com.synapse.features.questions.data

import android.content.Context
import com.synapse.core.SynapseQuestionsStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.questions.model.QuizAnswerOutcome
import com.synapse.features.questions.model.QuizAttemptHistory
import com.synapse.features.questions.model.QuizBattery
import com.synapse.features.questions.model.QuizQuestion
import com.synapse.features.questions.model.QuizStats
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray

class QuestionsRepository(context: Context) : AutoCloseable {
    private val databasePath = SynapseDatabase.path(context)
    private var store: SynapseQuestionsStore? = null

    suspend fun loadBatteries(): List<QuizBattery> = withContext(Dispatchers.IO) {
        store().getBatteries().map { row ->
            QuizBattery(row.id, row.title, row.description, row.questionCount)
        }
    }

    suspend fun loadQuestions(batteryId: String): List<QuizQuestion> = withContext(Dispatchers.IO) {
        store().getBatteryQuestions(batteryId).map(::toQuestion)
    }

    suspend fun loadTags(): List<String> = withContext(Dispatchers.IO) {
        store().getTags()
    }

    suspend fun loadFilteredQuestions(
        tags: List<String>,
        status: String,
        limit: Int,
        shuffle: Boolean,
    ): List<QuizQuestion> = withContext(Dispatchers.IO) {
        val tagsJson = tags.takeIf { it.isNotEmpty() }?.let(::JSONArray)?.toString()
        store().getFilteredQuestions(tagsJson, status, limit, shuffle).map(::toQuestion)
    }

    suspend fun loadErrorNotebook(): List<QuizQuestion> = withContext(Dispatchers.IO) {
        store().getErrorNotebook().map(::toQuestion)
    }

    suspend fun submitAnswer(question: QuizQuestion, selectedIndex: Int): QuizAnswerOutcome =
        withContext(Dispatchers.IO) {
            val result = store().submitAnswer(question.batteryId, question.id, selectedIndex)
            QuizAnswerOutcome(
                isCorrect = result.isCorrect,
                correctIndex = result.correctIndex,
                correctAnswer = result.correctAnswer,
                explanation = result.explanation,
            )
        }

    suspend fun loadStats(): QuizStats = withContext(Dispatchers.IO) {
        store().getStats().let { row ->
            QuizStats(
                row.totalAttempts,
                row.answeredQuestions,
                row.correctAttempts,
                row.incorrectAttempts,
                row.accuracyRate,
                row.reviewableIncorrectQuestions,
            )
        }
    }

    suspend fun loadAttemptHistory(questionId: String? = null, limit: Int = 50): List<QuizAttemptHistory> =
        withContext(Dispatchers.IO) {
            store().getAttemptHistory(null, questionId, limit).map { row ->
                QuizAttemptHistory(
                    id = row.id,
                    questionId = row.questionId,
                    question = row.question,
                    type = row.`type`,
                    userTypedAnswer = row.userTypedAnswer,
                    userAnswer = row.userAnswer,
                    correctAnswer = row.correctAnswer,
                    explanation = row.explanation,
                    isCorrect = row.isCorrect,
                    durationMs = row.durationMs,
                    createdAt = row.createdAt,
                )
            }
        }

    suspend fun createBattery(title: String, description: String): Unit = withContext(Dispatchers.IO) {
        store().createBattery(title, description.takeIf(String::isNotBlank))
        Unit
    }

    suspend fun createQuestion(
        batteryId: String,
        prompt: String,
        options: List<String>,
        correctIndex: Int,
        explanation: String,
        tags: List<String>,
    ): Unit = withContext(Dispatchers.IO) {
        store().createQuestion(
            batteryId,
            prompt,
            JSONArray(options).toString(),
            correctIndex,
            explanation.takeIf(String::isNotBlank),
            JSONArray(tags).toString(),
        )
        Unit
    }

    suspend fun updateQuestion(
        questionId: String,
        prompt: String,
        options: List<String>,
        correctIndex: Int,
        explanation: String,
        tags: List<String>,
    ): Unit = withContext(Dispatchers.IO) {
        store().updateQuestion(
            questionId,
            prompt,
            JSONArray(options).toString(),
            correctIndex,
            explanation.takeIf(String::isNotBlank),
            JSONArray(tags).toString(),
        )
        Unit
    }

    suspend fun deleteQuestion(questionId: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteQuestion(questionId)) { "A questão não está mais disponível." }
        Unit
    }

    suspend fun updateBattery(id: String, title: String, description: String): Unit =
        withContext(Dispatchers.IO) {
            check(store().updateBattery(id, title, description.takeIf(String::isNotBlank))) {
                "A bateria não está mais disponível."
            }
            Unit
        }

    suspend fun deleteBattery(id: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteBattery(id)) { "A bateria não está mais disponível." }
        Unit
    }

    @Synchronized
    private fun store(): SynapseQuestionsStore = store
        ?: SynapseQuestionsStore.open(databasePath).also { store = it }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
    }

    private fun toQuestion(row: com.synapse.core.QuizQuestionRecord): QuizQuestion {
        val values = JSONArray(row.options)
        val options = (0 until values.length()).map { index ->
            values.get(index) as? String
                ?: error("A questão ${row.id} contém uma opção que não é texto.")
        }
        return QuizQuestion(
            id = row.id,
            batteryId = row.batteryId,
            type = row.`type`,
            prompt = row.question,
            options = options,
            explanation = row.explanation,
            correctIndex = row.correctIndex ?: 0,
            tags = row.tags?.let(::JSONArray)?.let { values ->
                (0 until values.length()).mapNotNull { index -> values.optString(index).takeIf(String::isNotBlank) }
            } ?: emptyList(),
        )
    }
}
