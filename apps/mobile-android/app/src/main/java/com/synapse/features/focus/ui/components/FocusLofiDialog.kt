package com.synapse.features.focus.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.R
import com.synapse.features.focus.model.FocusLofiItem
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
internal fun FocusLofiDialog(
    tracks: List<FocusLofiItem>,
    activeTrackId: String?,
    isPlaying: Boolean,
    saving: Boolean,
    onDismiss: () -> Unit,
    onImport: () -> Unit,
    onTogglePlayback: (FocusLofiItem) -> Unit,
    onDelete: (String) -> Unit,
) {
    var trackToDelete by remember { mutableStateOf<FocusLofiItem?>(null) }
    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = { Text(stringResource(R.string.focus_lofi_title), color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(stringResource(R.string.focus_lofi_description), color = TextSecondary, fontSize = 13.sp)
                if (tracks.isEmpty()) {
                    Text(stringResource(R.string.focus_lofi_empty), color = TextSecondary)
                } else {
                    LazyColumn(modifier = Modifier.heightIn(max = 360.dp)) {
                        items(tracks, key = FocusLofiItem::id) { track ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(Icons.Default.MusicNote, contentDescription = null, tint = BrandIndigoLight)
                                Column(modifier = Modifier.weight(1f).padding(horizontal = 8.dp)) {
                                    Text(track.title, color = TextPrimary, maxLines = 1)
                                    Text(formatDuration(track.durationSeconds), color = TextSecondary, fontSize = 12.sp)
                                }
                                IconButton(onClick = { onTogglePlayback(track) }, enabled = !saving) {
                                    val selectedAndPlaying = activeTrackId == track.id && isPlaying
                                    Icon(
                                        if (selectedAndPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                        contentDescription = stringResource(
                                            if (selectedAndPlaying) R.string.focus_lofi_pause else R.string.focus_lofi_play,
                                        ),
                                        tint = TextPrimary,
                                    )
                                }
                                IconButton(onClick = { trackToDelete = track }, enabled = !saving) {
                                    Icon(Icons.Default.DeleteOutline, contentDescription = stringResource(R.string.focus_lofi_delete), tint = TextSecondary)
                                }
                            }
                        }
                    }
                }
                Button(onClick = onImport, enabled = !saving, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.MusicNote, contentDescription = null)
                    Text(stringResource(R.string.focus_lofi_import), modifier = Modifier.padding(start = 8.dp))
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text(stringResource(R.string.general_close)) } },
    )

    trackToDelete?.let { track ->
        AlertDialog(
            onDismissRequest = { if (!saving) trackToDelete = null },
            containerColor = DarkSurfaceElevated,
            title = { Text(stringResource(R.string.focus_lofi_delete), color = TextPrimary) },
            text = { Text(stringResource(R.string.focus_lofi_delete_prompt, track.title), color = TextSecondary) },
            confirmButton = {
                TextButton(onClick = {
                    onDelete(track.id)
                    trackToDelete = null
                }, enabled = !saving) { Text(stringResource(R.string.focus_lofi_delete)) }
            },
            dismissButton = { TextButton(onClick = { trackToDelete = null }) { Text(stringResource(R.string.general_cancel)) } },
        )
    }
}

private fun formatDuration(value: Double): String {
    val totalSeconds = value.toLong().coerceAtLeast(0)
    return "${totalSeconds / SECONDS_PER_MINUTE}:${(totalSeconds % SECONDS_PER_MINUTE).toString().padStart(2, '0')}"
}

private const val SECONDS_PER_MINUTE = 60
