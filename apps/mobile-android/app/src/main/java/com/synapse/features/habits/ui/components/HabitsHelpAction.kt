package com.synapse.features.habits.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.synapse.R
import com.synapse.ui.components.NativeHelpTopic
import com.synapse.ui.components.NativeModuleHelpAction

@Composable
fun HabitsHelpAction() {
    val topics = remember {
        listOf(
            NativeHelpTopic(R.string.habits_help_tracking, R.string.habits_help_tracking_body),
            NativeHelpTopic(R.string.habits_help_categories, R.string.habits_help_categories_body),
            NativeHelpTopic(R.string.habits_help_data, R.string.habits_help_data_body),
        )
    }
    NativeModuleHelpAction(R.string.habits_help_title, topics)
}
