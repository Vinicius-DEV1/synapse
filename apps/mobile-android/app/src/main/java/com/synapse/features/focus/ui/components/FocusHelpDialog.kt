package com.synapse.features.focus.ui.components

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
import androidx.compose.material3.AlertDialog
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

private data class FocusHelpSection(val labelId: Int, val contentId: Int)

@Composable
internal fun FocusHelpDialog(onDismiss: () -> Unit) {
    val sections = remember {
        listOf(
            FocusHelpSection(R.string.focus_help_section_timer, R.string.focus_help_timer_body),
            FocusHelpSection(R.string.focus_help_section_alarms, R.string.focus_help_alarms_body),
            FocusHelpSection(R.string.focus_help_section_lofi, R.string.focus_help_lofi_body),
            FocusHelpSection(R.string.focus_help_section_data, R.string.focus_help_data_body),
        )
    }
    var activeSection by remember { mutableStateOf(sections.first()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurfaceElevated,
        title = { Text(stringResource(R.string.focus_help_title), color = TextPrimary) },
        text = {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Column(
                    modifier = Modifier.width(124.dp).heightIn(max = 380.dp).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    sections.forEach { section ->
                        val selected = activeSection == section
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (selected) BrandIndigo.copy(alpha = 0.18f) else DarkSurface,
                        ) {
                            TextButton(onClick = { activeSection = section }, modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    stringResource(section.labelId),
                                    color = if (selected) BrandIndigo else TextSecondary,
                                )
                            }
                        }
                    }
                }
                Column(
                    modifier = Modifier.weight(1f).heightIn(max = 380.dp).verticalScroll(rememberScrollState()),
                ) {
                    Text(stringResource(activeSection.labelId), color = TextPrimary)
                    Text(
                        stringResource(activeSection.contentId),
                        color = TextSecondary,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.general_close)) } },
    )
}
