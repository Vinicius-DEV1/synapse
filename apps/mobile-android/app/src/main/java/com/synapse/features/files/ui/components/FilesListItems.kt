package com.synapse.features.files.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DriveFileMove
import androidx.compose.material.icons.automirrored.filled.InsertDriveFile
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.DriveFileRenameOutline
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.R
import com.synapse.features.files.model.StoredFile
import com.synapse.features.files.model.StoredFolder
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary
import java.util.Locale

@Composable
fun FolderRow(folder: StoredFolder, enabled: Boolean, onOpen: () -> Unit, onMove: () -> Unit, onRename: () -> Unit, onDelete: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(enabled = enabled, onClick = onOpen),
        shape = RoundedCornerShape(12.dp),
        color = DarkSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
    ) {
        Row(Modifier.fillMaxWidth().padding(start = 14.dp, end = 4.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Folder, contentDescription = null, tint = parseFolderColor(folder.color))
            Text(folder.name, Modifier.weight(1f).padding(horizontal = 12.dp), color = TextPrimary, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            IconButton(onClick = onMove, enabled = enabled) { Icon(Icons.AutoMirrored.Filled.DriveFileMove, "Mover pasta", tint = TextSecondary) }
            IconButton(onClick = onRename, enabled = enabled) { Icon(Icons.Default.DriveFileRenameOutline, "Renomear pasta", tint = TextSecondary) }
            IconButton(onClick = onDelete, enabled = enabled) { Icon(Icons.Default.DeleteOutline, "Excluir pasta", tint = TextSecondary) }
        }
    }
}

@Composable
fun FileRow(
    file: StoredFile,
    enabled: Boolean,
    locationLabel: String? = null,
    onOpen: () -> Unit,
    onMove: () -> Unit,
    onRename: () -> Unit,
    onDuplicate: () -> Unit,
    onDelete: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(enabled = enabled, onClick = onOpen),
        shape = RoundedCornerShape(12.dp),
        color = DarkSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
    ) {
        Row(Modifier.fillMaxWidth().padding(start = 14.dp, end = 4.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.AutoMirrored.Filled.InsertDriveFile, contentDescription = null, tint = TextSecondary)
            androidx.compose.foundation.layout.Column(Modifier.weight(1f).padding(horizontal = 12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(file.name, color = TextPrimary, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${file.type.uppercase(Locale.getDefault())} · ${formatFileSize(file.size)}", color = TextMuted, fontSize = 12.sp, maxLines = 1)
                locationLabel?.let { Text(it, color = TextMuted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis) }
            }
            IconButton(onClick = onMove, enabled = enabled) { Icon(Icons.AutoMirrored.Filled.DriveFileMove, "Mover arquivo", tint = TextSecondary) }
            IconButton(onClick = onRename, enabled = enabled) { Icon(Icons.Default.DriveFileRenameOutline, "Renomear arquivo", tint = TextSecondary) }
            IconButton(onClick = onDuplicate, enabled = enabled) {
                Icon(Icons.Default.ContentCopy, stringResource(R.string.files_duplicate), tint = TextSecondary)
            }
            IconButton(onClick = onDelete, enabled = enabled) { Icon(Icons.Default.DeleteOutline, "Excluir arquivo", tint = TextSecondary) }
        }
    }
}

private fun formatFileSize(size: Long): String = when {
    size < 1024 -> "$size B"
    size < 1024 * 1024 -> String.format(Locale.getDefault(), "%.1f KB", size / 1024.0)
    else -> String.format(Locale.getDefault(), "%.1f MB", size / (1024.0 * 1024.0))
}

private fun parseFolderColor(value: String): Color = if (FOLDER_HEX_COLOR.matches(value)) {
    Color(android.graphics.Color.parseColor(value))
} else TextSecondary

private val FOLDER_HEX_COLOR = Regex("^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$")
