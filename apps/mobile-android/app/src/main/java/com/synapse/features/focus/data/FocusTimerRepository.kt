package com.synapse.features.focus.data

import android.content.Context
import android.content.SharedPreferences
import com.synapse.features.focus.model.DEFAULT_FOCUS_PRESET_MINUTES
import com.synapse.features.focus.model.FOCUS_PRESET_MINUTES
import com.synapse.features.focus.model.FOCUS_SECONDS_PER_MINUTE
import com.synapse.features.focus.model.FOCUS_SOUND_IDS
import com.synapse.features.focus.model.FocusTimerState

class FocusTimerRepository(context: Context) {
    private val preferences: SharedPreferences = context.applicationContext
        .getSharedPreferences(PREFERENCES_FILE, Context.MODE_PRIVATE)

    fun load(nowEpochMillis: Long): FocusTimerState {
        val presetMinutes = preferences.getInt(KEY_PRESET_MINUTES, DEFAULT_FOCUS_PRESET_MINUTES)
            .takeIf { it in FOCUS_PRESET_MINUTES }
            ?: DEFAULT_FOCUS_PRESET_MINUTES
        val deadline = preferences.getLong(KEY_DEADLINE, NO_DEADLINE).takeIf { it > 0L }
        val isRunning = deadline != null
        val remainingSeconds = if (isRunning) {
            secondsUntil(deadline ?: nowEpochMillis, nowEpochMillis)
                .coerceAtMost(presetMinutes * FOCUS_SECONDS_PER_MINUTE)
        } else {
            preferences.getInt(KEY_REMAINING_SECONDS, presetMinutes * FOCUS_SECONDS_PER_MINUTE)
                .coerceIn(0, presetMinutes * FOCUS_SECONDS_PER_MINUTE)
        }

        return FocusTimerState(
            selectedPresetMinutes = presetMinutes,
            remainingSeconds = remainingSeconds,
            isRunning = isRunning,
            deadlineEpochMillis = deadline,
            activeSound = preferences.getString(KEY_ACTIVE_SOUND, DEFAULT_ACTIVE_SOUND)
                ?.takeIf { it in FOCUS_SOUND_IDS },
        )
    }

    fun save(state: FocusTimerState) {
        val editor = preferences.edit()
            .putInt(KEY_PRESET_MINUTES, state.selectedPresetMinutes)
            .putInt(KEY_REMAINING_SECONDS, state.remainingSeconds)
            .putString(KEY_ACTIVE_SOUND, state.activeSound.orEmpty())
        if (state.isRunning && state.deadlineEpochMillis != null) {
            editor.putLong(KEY_DEADLINE, state.deadlineEpochMillis)
        } else {
            editor.remove(KEY_DEADLINE)
        }
        editor.apply()
    }

    private fun secondsUntil(deadlineEpochMillis: Long, nowEpochMillis: Long): Int {
        val remainingMillis = (deadlineEpochMillis - nowEpochMillis).coerceAtLeast(0L)
        return ((remainingMillis + MILLIS_PER_SECOND - 1L) / MILLIS_PER_SECOND).toInt()
    }

    private companion object {
        const val PREFERENCES_FILE = "synapse_focus_timer"
        const val KEY_PRESET_MINUTES = "preset_minutes"
        const val KEY_REMAINING_SECONDS = "remaining_seconds"
        const val KEY_DEADLINE = "deadline_epoch_millis"
        const val KEY_ACTIVE_SOUND = "active_sound"
        const val DEFAULT_ACTIVE_SOUND = "chuva"
        const val NO_DEADLINE = 0L
        const val MILLIS_PER_SECOND = 1000L
    }
}
