package com.synapse.features.anki.model

data class AnkiUiState(
    val loading: Boolean = true,
    val loadingCards: Boolean = false,
    val loadingStudyQueue: Boolean = false,
    val saving: Boolean = false,
    val error: String? = null,
    val decks: List<AnkiDeck> = emptyList(),
    val stats: AnkiStats? = null,
    val selectedDeck: AnkiDeck? = null,
    val deckSettings: AnkiDeckSettings? = null,
    val loadingSettings: Boolean = false,
    val cards: List<AnkiCard> = emptyList(),
    val studyCards: List<AnkiCard> = emptyList(),
    val studyIndex: Int = 0,
    val answerRevealed: Boolean = false,
    val studying: Boolean = false,
)
