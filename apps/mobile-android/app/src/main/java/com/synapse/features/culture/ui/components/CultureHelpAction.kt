package com.synapse.features.culture.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.synapse.R
import com.synapse.ui.components.NativeHelpTopic
import com.synapse.ui.components.NativeModuleHelpAction

@Composable
fun CultureHelpAction() {
    val topics = remember {
        listOf(
            NativeHelpTopic(R.string.culture_help_catalog, R.string.culture_help_catalog_body),
            NativeHelpTopic(R.string.culture_help_progress, R.string.culture_help_progress_body),
            NativeHelpTopic(R.string.culture_help_data, R.string.culture_help_data_body),
        )
    }
    NativeModuleHelpAction(R.string.culture_help_title, topics)
}
