package com.synapse.features.video.ui.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.synapse.R
import com.synapse.core.VideoFolderRecord
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun VideoFolderFilterRow(
    folders: List<VideoFolderRecord>,
    selectedFolderId: String?,
    onSelect: (String?) -> Unit,
    onAdd: () -> Unit,
    onRename: (VideoFolderRecord) -> Unit,
    onDelete: (VideoFolderRecord) -> Unit,
) {
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        FilterChip(
            selected = selectedFolderId == null,
            onClick = { onSelect(null) },
            label = {
                Text(
                    stringResource(R.string.video_all_videos),
                    color = if (selectedFolderId == null) TextPrimary else TextSecondary,
                )
            },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = BrandIndigo.copy(alpha = 0.22f),
                containerColor = DarkSurface,
            ),
        )
        folders.forEach { folder ->
            var menuExpanded by remember(folder.id) { mutableStateOf(false) }
            Box {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    FilterChip(
                        selected = selectedFolderId == folder.id,
                        onClick = { onSelect(folder.id) },
                        label = {
                            Text(
                                folder.name,
                                color = if (selectedFolderId == folder.id) TextPrimary else TextSecondary,
                                maxLines = 1,
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BrandIndigo.copy(alpha = 0.22f),
                            containerColor = DarkSurface,
                        ),
                    )
                    IconButton(onClick = { menuExpanded = true }) {
                        Icon(Icons.Default.MoreVert, contentDescription = stringResource(R.string.video_manage_folder), tint = TextSecondary)
                    }
                }
                DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                    DropdownMenuItem(
                        text = { Text(stringResource(R.string.video_rename_folder)) },
                        onClick = {
                            menuExpanded = false
                            onRename(folder)
                        },
                    )
                    DropdownMenuItem(
                        text = { Text(stringResource(R.string.video_delete_folder)) },
                        onClick = {
                            menuExpanded = false
                            onDelete(folder)
                        },
                    )
                }
            }
        }
        IconButton(onClick = onAdd) {
            Icon(Icons.Default.Add, contentDescription = stringResource(R.string.video_new_folder), tint = TextPrimary)
        }
    }
}
