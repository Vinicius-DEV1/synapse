package com.synapse.features.settings.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.R
import com.synapse.features.settings.model.AndroidSettings
import com.synapse.features.settings.model.NoteFontSize
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun SettingsScreen(
    settings: AndroidSettings,
    onSettingsChange: (AndroidSettings) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkCanvas)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(Icons.Default.Settings, contentDescription = null, tint = BrandIndigoLight)
            Column {
                Text(stringResource(R.string.settings_title), color = TextPrimary, fontSize = 24.sp, style = MaterialTheme.typography.headlineSmall)
                Text(stringResource(R.string.settings_subtitle), color = TextSecondary, fontSize = 13.sp)
            }
        }

        SettingsSection(title = stringResource(R.string.settings_editor_section), icon = Icons.Default.Edit) {
            var fontMenuExpanded by remember { mutableStateOf(false) }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.settings_text_size), color = TextPrimary, fontSize = 14.sp)
                Box {
                    OutlinedButton(onClick = { fontMenuExpanded = true }) {
                        Text(stringResource(
                            R.string.settings_font_size_format,
                            settings.noteFontSize.localizedLabel(),
                            settings.noteFontSize.points,
                        ))
                    }
                    DropdownMenu(
                        expanded = fontMenuExpanded,
                        onDismissRequest = { fontMenuExpanded = false },
                    ) {
                        NoteFontSize.values().forEach { size ->
                            DropdownMenuItem(
                                text = {
                                    Text(stringResource(R.string.settings_font_size_format, size.localizedLabel(), size.points))
                                },
                                onClick = {
                                    onSettingsChange(settings.copy(noteFontSize = size))
                                    fontMenuExpanded = false
                                },
                            )
                        }
                    }
                }
                Text(stringResource(R.string.settings_text_size_description), color = TextSecondary, fontSize = 12.sp)
            }
            SettingsToggle(
                title = stringResource(R.string.settings_spellcheck_title),
                description = stringResource(R.string.settings_spellcheck_description),
                checked = settings.spellcheck,
                onCheckedChange = { onSettingsChange(settings.copy(spellcheck = it)) },
            )
        }

        SettingsSection(title = stringResource(R.string.settings_anki_section), icon = Icons.Default.School) {
            SettingsToggle(
                title = stringResource(R.string.settings_anki_flip_title),
                description = stringResource(R.string.settings_anki_flip_description),
                checked = settings.study3DFlip,
                onCheckedChange = { onSettingsChange(settings.copy(study3DFlip = it)) },
            )
            SettingsToggle(
                title = stringResource(R.string.settings_anki_sound_title),
                description = stringResource(R.string.settings_anki_sound_description),
                checked = settings.studySoundEffects,
                onCheckedChange = { onSettingsChange(settings.copy(studySoundEffects = it)) },
            )
        }
        Text(stringResource(R.string.settings_saved_locally), color = TextSecondary, fontSize = 12.sp)
    }
}

@Composable
private fun NoteFontSize.localizedLabel(): String = stringResource(
    when (this) {
        NoteFontSize.SMALL -> R.string.settings_font_small
        NoteFontSize.MEDIUM -> R.string.settings_font_medium
        NoteFontSize.LARGE -> R.string.settings_font_large
    },
)

@Composable
private fun SettingsSection(
    title: String,
    icon: ImageVector,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(icon, contentDescription = null, tint = BrandIndigoLight)
                Text(title, color = TextPrimary, fontSize = 16.sp, style = MaterialTheme.typography.titleMedium)
            }
            content()
        }
    }
}

@Composable
private fun SettingsToggle(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(title, color = TextPrimary, fontSize = 14.sp)
            Text(description, color = TextSecondary, fontSize = 12.sp, lineHeight = 17.sp)
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
