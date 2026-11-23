package com.synapse.features.anki.data

import android.content.Context
import android.util.Log
import com.synapse.core.AnkiSettingsRecord
import com.synapse.core.SynapseAnkiStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.anki.model.AnkiCard
import com.synapse.features.anki.model.AnkiDeck
import com.synapse.features.anki.model.AnkiDeckSettings
import com.synapse.features.anki.model.AnkiStats
import org.json.JSONArray
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AnkiRepository(context: Context) : AutoCloseable {
    private val databasePath = SynapseDatabase.path(context)
    private var store: SynapseAnkiStore? = null

    suspend fun loadDecks(): List<AnkiDeck> = withContext(Dispatchers.IO) {
        store().getDecks().map { row ->
            AnkiDeck(
                row.id, row.name, row.description, row.color, row.parentId, row.depth,
                row.hasChildren, row.childrenCount, row.cardCount, row.newCount,
                row.learningCount, row.reviewCount,
            )
        }
    }

    suspend fun loadCards(deckId: String): List<AnkiCard> = withContext(Dispatchers.IO) {
        store().getCards(deckId).map(::toCard)
    }

    suspend fun loadQueue(deckId: String): List<AnkiCard> = withContext(Dispatchers.IO) {
        store().getStudyQueue(deckId).map(::toCard)
    }

    suspend fun loadStats(): AnkiStats = withContext(Dispatchers.IO) {
        store().getGlobalStats().let { row ->
            AnkiStats(
                row.totalCards, row.newCount, row.learningCount, row.matureCount,
                row.youngCount, row.totalReviews, row.againCount, row.hardCount,
                row.goodCount, row.easyCount, row.retentionRate,
            )
        }
    }

    suspend fun loadTotalDueCount(): Long = withContext(Dispatchers.IO) {
        store().getTotalDueCount()
    }

    suspend fun createDeck(name: String, parentId: String?): Unit = withContext(Dispatchers.IO) {
        store().createDeck(name, null, null, parentId)
        Unit
    }

    suspend fun updateDeck(deck: AnkiDeck): Unit = withContext(Dispatchers.IO) {
        check(store().updateDeck(deck.id, deck.name, deck.description)) { "O baralho não está mais disponível." }
        Unit
    }

    suspend fun createCard(deckId: String, front: String, back: String, tags: String): Unit =
        withContext(Dispatchers.IO) {
            store().createCard(deckId, front, back, encodeTags(tags), "reading", null)
            Unit
        }

    suspend fun updateCard(card: AnkiCard): Unit = withContext(Dispatchers.IO) {
        check(
            store().updateCard(
                card.id, card.front, card.back, encodeTags(card.tags.orEmpty()), card.cardType, card.extraNote,
            ),
        ) { "O cartão não está mais disponível." }
        Unit
    }

    suspend fun recordReview(cardId: String, rating: Int): Unit = withContext(Dispatchers.IO) {
        check(store().recordReview(cardId, rating)) { "A avaliação não foi salva." }
        Unit
    }

    suspend fun deleteCard(cardId: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteCard(cardId)) { "O cartão não está mais disponível." }
        Unit
    }

    suspend fun deleteDeck(deckId: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteDeck(deckId)) { "O baralho não está mais disponível." }
        Unit
    }

    suspend fun resetDeckProgress(deckId: String): Unit = withContext(Dispatchers.IO) {
        check(store().resetDeckProgress(deckId)) { "O baralho não tem progresso para resetar." }
        Unit
    }

    suspend fun loadDeckSettings(deckId: String): AnkiDeckSettings = withContext(Dispatchers.IO) {
        store().getDeckSettings(deckId).let { row ->
            AnkiDeckSettings(row.newLimit, row.reviewLimit, row.learningSteps, row.relearningSteps, row.fsrsWeights)
        }
    }

    suspend fun saveDeckSettings(deckId: String, settings: AnkiDeckSettings): Unit =
        withContext(Dispatchers.IO) {
            check(
                store().updateDeckSettings(
                    deckId,
                    AnkiSettingsRecord(
                        settings.newLimit,
                        settings.reviewLimit,
                        settings.learningSteps,
                        settings.relearningSteps,
                        settings.fsrsWeights,
                    ),
                ),
            ) { "As opções do baralho não foram salvas." }
            Unit
        }

    @Synchronized
    private fun store(): SynapseAnkiStore = store
        ?: SynapseAnkiStore.open(databasePath).also { store = it }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
    }

    private fun toCard(row: com.synapse.core.AnkiCardRecord): AnkiCard = AnkiCard(
        row.id, row.deckId, row.front, row.back, decodeTags(row.tags), row.cardType, row.extraNote,
        row.stability, row.difficulty, row.reps, row.lapses, row.learningSteps, row.state, row.dueDate,
        row.createdAt,
    )

    private fun encodeTags(value: String): String? {
        val tags = value.split(',').map { it.trim() }.filter { it.isNotEmpty() }.distinct()
        return if (tags.isEmpty()) null else JSONArray(tags).toString()
    }

    private fun decodeTags(value: String?): String? {
        if (value.isNullOrBlank()) return null
        return try {
            val array = JSONArray(value)
            (0 until array.length()).mapNotNull { index ->
                array.optString(index).takeIf { it.isNotBlank() }
            }
                .joinToString(", ")
        } catch (error: Exception) {
            Log.w(TAG, "Could not decode stored Anki tags; preserving the stored value", error)
            value
        }
    }

    private companion object {
        const val TAG = "SynapseAnkiRepository"
    }
}
