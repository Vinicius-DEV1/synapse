package com.synapse.features.video.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.R
import com.synapse.core.VideoFolderRecord
import com.synapse.features.video.model.VideoLibraryItem
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun VideoLibraryCard(
    item: VideoLibraryItem,
    folders: List<VideoFolderRecord>,
    onOpen: () -> Unit,
    onMoveToFolder: (String?) -> Unit,
    modifier: Modifier = Modifier,
) {
    var folderMenuExpanded by remember { mutableStateOf(false) }
    val progress = if (item.durationSeconds <= 0.0) 0f else
        (item.progressSeconds / item.durationSeconds).toFloat().coerceIn(0f, 1f)
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = DarkSurface,
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
    ) {
        Column(Modifier.fillMaxWidth().padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(
                    modifier = Modifier.weight(1f).clickable(onClick = onOpen),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Surface(shape = RoundedCornerShape(10.dp), color = BrandIndigo.copy(alpha = 0.15f)) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, tint = BrandIndigo, modifier = Modifier.padding(8.dp))
                    }
                    Column(Modifier.weight(1f)) {
                        Text(item.title, color = TextPrimary, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(item.originalName, color = TextSecondary, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    Text(
                        text = if (item.durationSeconds > 0) formatDuration(item.durationSeconds) else stringResource(R.string.video_duration_unknown),
                        color = TextSecondary,
                        fontSize = 11.sp,
                    )
                }
                IconButton(onClick = { folderMenuExpanded = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = stringResource(R.string.video_move_to_folder), tint = TextSecondary)
                }
                DropdownMenu(expanded = folderMenuExpanded, onDismissRequest = { folderMenuExpanded = false }) {
                    DropdownMenuItem(
                        text = { Text(stringResource(R.string.video_all_videos)) },
                        onClick = {
                            folderMenuExpanded = false
                            onMoveToFolder(null)
                        },
                    )
                    folders.forEach { folder ->
                        DropdownMenuItem(
                            text = { Text(folder.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                            onClick = {
                                folderMenuExpanded = false
                                onMoveToFolder(folder.id)
                            },
                        )
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(4.dp),
                color = BrandIndigo,
                trackColor = DarkSurfaceElevated,
            )
        }
    }
}

private fun formatDuration(seconds: Double): String {
    val totalSeconds = seconds.toLong().coerceAtLeast(0L)
    val minutes = totalSeconds / SECONDS_PER_MINUTE
    val remainingSeconds = totalSeconds % SECONDS_PER_MINUTE
    return "%d:%02d".format(minutes, remainingSeconds)
}

private const val SECONDS_PER_MINUTE = 60L
