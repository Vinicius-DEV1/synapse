package com.synapse.features.anki.viewmodel

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.synapse.features.anki.data.AnkiRepository
import com.synapse.features.anki.model.AnkiCard
import com.synapse.features.anki.model.AnkiDeck
import com.synapse.features.anki.model.AnkiDeckSettings
import com.synapse.features.anki.model.AnkiUiState
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AnkiViewModel(context: Context) : ViewModel() {
    private val repository = AnkiRepository(context)
    private val mutableState = MutableStateFlow(AnkiUiState())
    private var decksRequest = 0L
    private var cardsRequest = 0L
    private var settingsRequest = 0L
    val state: StateFlow<AnkiUiState> = mutableState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        val request = ++decksRequest
        viewModelScope.launch {
            mutableState.value = mutableState.value.copy(loading = true, error = null)
            try {
                val decks = repository.loadDecks()
                val stats = repository.loadStats()
                if (request == decksRequest) {
                    val selectedDeckId = mutableState.value.selectedDeck?.id
                    val selectedDeck = decks.firstOrNull { it.id == selectedDeckId }
                    mutableState.value = mutableState.value.copy(
                        loading = false,
                        decks = decks,
                        stats = stats,
                    )
                    selectedDeck?.let(::selectDeck)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == decksRequest) reportFailure("load Anki decks", error)
            }
        }
    }

    fun selectDeck(deck: AnkiDeck) {
        val request = ++cardsRequest
        settingsRequest++
        mutableState.value = mutableState.value.copy(
            selectedDeck = deck,
            cards = if (mutableState.value.selectedDeck?.id == deck.id) mutableState.value.cards else emptyList(),
            loadingCards = true,
            deckSettings = null,
            loadingSettings = false,
            error = null,
        )
        viewModelScope.launch {
            try {
                val cards = repository.loadCards(deck.id)
                if (request == cardsRequest && mutableState.value.selectedDeck?.id == deck.id) {
                    mutableState.value = mutableState.value.copy(loadingCards = false, cards = cards)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == cardsRequest) reportFailure("load Anki cards", error)
            }
        }
    }

    fun closeDeck() {
        cardsRequest++
        settingsRequest++
        mutableState.value = mutableState.value.copy(
            selectedDeck = null,
            cards = emptyList(),
            loadingCards = false,
            deckSettings = null,
            loadingSettings = false,
            error = null,
        )
    }

    fun createDeck(name: String, parentId: String? = null) = mutate("create Anki deck") {
        repository.createDeck(name, parentId)
        reloadDecks()
    }

    fun createCard(front: String, back: String, tags: String) = mutate("create Anki card") {
        val deck = checkNotNull(mutableState.value.selectedDeck)
        repository.createCard(deck.id, front, back, tags)
        reloadCards(deck)
        reloadDecks()
    }

    fun updateCard(card: AnkiCard) = mutate("update Anki card") {
        repository.updateCard(card)
        val deck = checkNotNull(mutableState.value.selectedDeck)
        reloadCards(deck)
    }

    fun deleteCard(card: AnkiCard) = mutate("delete Anki card") {
        repository.deleteCard(card.id)
        mutableState.value = mutableState.value.copy(cards = mutableState.value.cards.filterNot { it.id == card.id })
        reloadDecks()
    }

    fun deleteDeck(deck: AnkiDeck) = mutate("delete Anki deck") {
        repository.deleteDeck(deck.id)
        if (mutableState.value.selectedDeck?.id == deck.id) closeDeck()
        reloadDecks()
    }

    fun loadDeckSettings(deck: AnkiDeck) {
        if (mutableState.value.saving || mutableState.value.loadingSettings) return
        val request = ++settingsRequest
        mutableState.value = mutableState.value.copy(
            loadingSettings = true,
            deckSettings = null,
            error = null,
        )
        viewModelScope.launch {
            try {
                val settings = repository.loadDeckSettings(deck.id)
                if (request == settingsRequest && mutableState.value.selectedDeck?.id == deck.id) {
                    mutableState.value = mutableState.value.copy(deckSettings = settings, loadingSettings = false)
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (request == settingsRequest) reportFailure("load Anki deck settings", error)
            }
        }
    }

    fun saveDeckSettings(newLimit: Int, reviewLimit: Int) = mutate("save Anki deck settings") {
        val deck = checkNotNull(mutableState.value.selectedDeck)
        val settings = mutableState.value.deckSettings ?: repository.loadDeckSettings(deck.id)
        val updated = settings.copy(newLimit = newLimit, reviewLimit = reviewLimit)
        repository.saveDeckSettings(deck.id, updated)
        mutableState.value = mutableState.value.copy(deckSettings = updated)
        reloadDecks()
    }

    fun resetDeckProgress(deck: AnkiDeck) = mutate("reset Anki deck progress") {
        repository.resetDeckProgress(deck.id)
        reloadCards(deck)
        reloadDecks()
    }

    fun startStudy(deck: AnkiDeck) {
        if (mutableState.value.saving || mutableState.value.loadingStudyQueue) return
        mutableState.value = mutableState.value.copy(loadingStudyQueue = true, error = null)
        viewModelScope.launch {
            try {
                val queue = repository.loadQueue(deck.id)
                mutableState.value = mutableState.value.copy(
                    selectedDeck = deck,
                    studyCards = queue,
                    studyIndex = 0,
                    answerRevealed = false,
                    studying = queue.isNotEmpty(),
                    loadingStudyQueue = false,
                    error = null,
                )
                if (queue.isEmpty()) mutableState.value = mutableState.value.copy(error = "Não há cartões pendentes neste baralho.")
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("load Anki study queue", error)
            }
        }
    }

    fun revealAnswer() {
        mutableState.value = mutableState.value.copy(answerRevealed = true)
    }

    fun rateCurrentCard(rating: Int) {
        val current = mutableState.value
        val card = current.studyCards.getOrNull(current.studyIndex) ?: return
        if (!current.studying || current.saving || !current.answerRevealed) return
        mutableState.value = current.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                repository.recordReview(card.id, rating)
                val nextIndex = current.studyIndex + 1
                if (nextIndex >= current.studyCards.size) {
                    mutableState.value = mutableState.value.copy(
                        saving = false,
                        studying = false,
                        studyCards = emptyList(),
                        studyIndex = 0,
                        answerRevealed = false,
                    )
                    reloadDecks()
                } else {
                    mutableState.value = mutableState.value.copy(
                        saving = false,
                        studyIndex = nextIndex,
                        answerRevealed = false,
                    )
                }
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure("save Anki review", error)
            }
        }
    }

    fun finishStudy() {
        mutableState.value = mutableState.value.copy(
            studying = false,
            studyCards = emptyList(),
            studyIndex = 0,
            answerRevealed = false,
            error = null,
        )
        refresh()
    }

    fun dismissError() {
        mutableState.value = mutableState.value.copy(error = null)
    }

    private suspend fun reloadDecks() {
        val decks = repository.loadDecks()
        val stats = repository.loadStats()
        mutableState.value = mutableState.value.copy(decks = decks, stats = stats)
    }

    private suspend fun reloadCards(deck: AnkiDeck) {
        mutableState.value = mutableState.value.copy(cards = repository.loadCards(deck.id))
    }

    private fun mutate(action: String, operation: suspend () -> Unit) {
        if (mutableState.value.saving || mutableState.value.loading) return
        mutableState.value = mutableState.value.copy(saving = true, error = null)
        viewModelScope.launch {
            try {
                operation()
                mutableState.value = mutableState.value.copy(saving = false)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                reportFailure(action, error)
            }
        }
    }

    private fun reportFailure(action: String, error: Throwable) {
        Log.e(TAG, "Failed to $action", error)
        mutableState.value = mutableState.value.copy(
            loading = false,
            loadingCards = false,
            loadingStudyQueue = false,
            loadingSettings = false,
            saving = false,
            error = error.message ?: "Não foi possível acessar os dados do Anki.",
        )
    }

    override fun onCleared() {
        repository.close()
        super.onCleared()
    }

    private companion object {
        const val TAG = "SynapseAnki"
    }
}
