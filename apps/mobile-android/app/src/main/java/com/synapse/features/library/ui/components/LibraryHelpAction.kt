package com.synapse.features.library.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.synapse.R
import com.synapse.ui.components.NativeHelpTopic
import com.synapse.ui.components.NativeModuleHelpAction

@Composable
fun LibraryHelpAction() {
    val topics = remember {
        listOf(
            NativeHelpTopic(R.string.library_help_catalog, R.string.library_help_catalog_body),
            NativeHelpTopic(R.string.library_help_progress, R.string.library_help_progress_body),
            NativeHelpTopic(R.string.library_help_annotations, R.string.library_help_annotations_body),
        )
    }
    NativeModuleHelpAction(R.string.library_help_title, topics)
}
