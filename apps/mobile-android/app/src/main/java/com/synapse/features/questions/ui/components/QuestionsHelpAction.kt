package com.synapse.features.questions.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.synapse.R
import com.synapse.ui.components.NativeHelpTopic
import com.synapse.ui.components.NativeModuleHelpAction

@Composable
fun QuestionsHelpAction() {
    val topics = remember {
        listOf(
            NativeHelpTopic(R.string.questions_help_batteries, R.string.questions_help_batteries_body),
            NativeHelpTopic(R.string.questions_help_simulations, R.string.questions_help_simulations_body),
            NativeHelpTopic(R.string.questions_help_history, R.string.questions_help_history_body),
        )
    }
    NativeModuleHelpAction(R.string.questions_help_title, topics)
}
