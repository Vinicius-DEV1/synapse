package com.synapse.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.synapse.R
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

data class NativeHelpTopic(val headingId: Int, val bodyId: Int)

@Composable
fun NativeModuleHelpAction(titleId: Int, topics: List<NativeHelpTopic>) {
    var visible by remember(titleId) { mutableStateOf(false) }
    IconButton(onClick = { visible = true }) {
        Icon(
            imageVector = Icons.AutoMirrored.Filled.HelpOutline,
            contentDescription = stringResource(R.string.module_help_action),
            tint = BrandIndigo,
        )
    }
    if (visible) NativeModuleHelpDialog(titleId, topics) { visible = false }
}

@Composable
fun NativeModuleHelpDialog(
    titleId: Int,
    topics: List<NativeHelpTopic>,
    onDismiss: () -> Unit,
) {
    var activeTopic by remember(titleId) { mutableStateOf(topics.firstOrNull()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurfaceElevated,
        title = { Text(stringResource(titleId), color = TextPrimary) },
        text = {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Column(
                    modifier = Modifier.width(124.dp).heightIn(max = 380.dp).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    topics.forEach { topic ->
                        val selected = activeTopic == topic
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (selected) BrandIndigo.copy(alpha = 0.18f) else DarkSurface,
                        ) {
                            TextButton(onClick = { activeTopic = topic }, modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    stringResource(topic.headingId),
                                    color = if (selected) BrandIndigo else TextSecondary,
                                )
                            }
                        }
                    }
                }
                Column(
                    modifier = Modifier.weight(1f).heightIn(max = 380.dp).verticalScroll(rememberScrollState()),
                ) {
                    activeTopic?.let { topic ->
                        Text(stringResource(topic.headingId), color = TextPrimary)
                        Text(
                            stringResource(topic.bodyId),
                            color = TextSecondary,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.general_close)) }
        },
    )
}
