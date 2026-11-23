package com.synapse.features.settings.model

enum class NoteFontSize(val points: Int) {
    SMALL(14),
    MEDIUM(16),
    LARGE(18),
}

data class AndroidSettings(
    val noteFontSize: NoteFontSize = NoteFontSize.MEDIUM,
    val spellcheck: Boolean = true,
    val study3DFlip: Boolean = true,
    val studySoundEffects: Boolean = true,
)
