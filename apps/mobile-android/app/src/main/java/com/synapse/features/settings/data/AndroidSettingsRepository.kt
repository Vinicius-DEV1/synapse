package com.synapse.features.settings.data

import android.content.Context
import android.content.SharedPreferences
import com.synapse.features.settings.model.AndroidSettings
import com.synapse.features.settings.model.NoteFontSize

class AndroidSettingsRepository(context: Context) {
    private val preferences: SharedPreferences = context.applicationContext
        .getSharedPreferences(PREFERENCES_FILE, Context.MODE_PRIVATE)

    fun load(): AndroidSettings {
        val fontSize = preferences.getString(KEY_NOTE_FONT_SIZE, null)
            ?.let { stored -> NoteFontSize.values().firstOrNull { it.name == stored } }
            ?: NoteFontSize.MEDIUM

        return AndroidSettings(
            noteFontSize = fontSize,
            spellcheck = preferences.getBoolean(KEY_SPELLCHECK, true),
            study3DFlip = preferences.getBoolean(KEY_STUDY_3D_FLIP, true),
            studySoundEffects = preferences.getBoolean(KEY_STUDY_SOUND_EFFECTS, true),
        )
    }

    fun save(settings: AndroidSettings) {
        preferences.edit()
            .putString(KEY_NOTE_FONT_SIZE, settings.noteFontSize.name)
            .putBoolean(KEY_SPELLCHECK, settings.spellcheck)
            .putBoolean(KEY_STUDY_3D_FLIP, settings.study3DFlip)
            .putBoolean(KEY_STUDY_SOUND_EFFECTS, settings.studySoundEffects)
            .apply()
    }

    private companion object {
        const val PREFERENCES_FILE = "synapse_android_settings"
        const val KEY_NOTE_FONT_SIZE = "note_font_size"
        const val KEY_SPELLCHECK = "spellcheck"
        const val KEY_STUDY_3D_FLIP = "study_3d_flip"
        const val KEY_STUDY_SOUND_EFFECTS = "study_sound_effects"
    }
}
