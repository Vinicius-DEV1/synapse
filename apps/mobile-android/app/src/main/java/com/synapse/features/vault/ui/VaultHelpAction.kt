package com.synapse.features.vault.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.synapse.R
import com.synapse.ui.components.NativeHelpTopic
import com.synapse.ui.components.NativeModuleHelpAction

@Composable
fun VaultHelpAction() {
    val topics = remember {
        listOf(
            NativeHelpTopic(R.string.vault_help_status, R.string.vault_help_status_body),
            NativeHelpTopic(R.string.vault_help_security, R.string.vault_help_security_body),
            NativeHelpTopic(R.string.vault_help_data, R.string.vault_help_data_body),
        )
    }
    NativeModuleHelpAction(R.string.vault_help_title, topics)
}
