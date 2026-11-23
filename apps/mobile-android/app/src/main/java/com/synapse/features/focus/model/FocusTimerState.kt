package com.synapse.features.focus.model

internal const val DEFAULT_FOCUS_PRESET_MINUTES = 25
internal const val FOCUS_SECONDS_PER_MINUTE = 60
internal val FOCUS_PRESET_MINUTES = setOf(5, 15, 25, 45)
internal val FOCUS_SOUND_IDS = setOf("chuva", "cafe", "lareira", "floresta", "ondas")

data class FocusTimerState(
    val selectedPresetMinutes: Int = DEFAULT_FOCUS_PRESET_MINUTES,
    val remainingSeconds: Int = DEFAULT_FOCUS_PRESET_MINUTES * FOCUS_SECONDS_PER_MINUTE,
    val isRunning: Boolean = false,
    val deadlineEpochMillis: Long? = null,
    val activeSound: String? = "chuva",
)
