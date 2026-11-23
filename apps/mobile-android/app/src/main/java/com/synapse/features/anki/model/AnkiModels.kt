package com.synapse.features.anki.model

data class AnkiDeck(
    val id: String,
    val name: String,
    val description: String?,
    val color: String?,
    val parentId: String?,
    val depth: Int,
    val hasChildren: Boolean,
    val childrenCount: Int,
    val cardCount: Long,
    val newCount: Long,
    val learningCount: Long,
    val reviewCount: Long,
)

data class AnkiCard(
    val id: String,
    val deckId: String,
    val front: String,
    val back: String,
    val tags: String?,
    val cardType: String?,
    val extraNote: String?,
    val stability: Double,
    val difficulty: Double,
    val reps: Int,
    val lapses: Int,
    val learningSteps: Int,
    val state: String?,
    val dueDate: String?,
    val createdAt: String?,
)

data class AnkiStats(
    val totalCards: Long,
    val newCount: Long,
    val learningCount: Long,
    val matureCount: Long,
    val youngCount: Long,
    val totalReviews: Long,
    val againCount: Long,
    val hardCount: Long,
    val goodCount: Long,
    val easyCount: Long,
    val retentionRate: Double,
)

data class AnkiDeckSettings(
    val newLimit: Int = 20,
    val reviewLimit: Int = 200,
    val learningSteps: String = "1m,10m",
    val relearningSteps: String = "10m",
    val fsrsWeights: String? = null,
)
