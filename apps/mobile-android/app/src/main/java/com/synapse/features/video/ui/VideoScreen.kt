package com.synapse.features.video.ui

import android.content.Intent
import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreateNewFolder
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.synapse.R
import com.synapse.core.VideoFolderRecord
import com.synapse.features.video.model.VideoLibraryItem
import com.synapse.features.video.ui.components.VideoFolderFilterRow
import com.synapse.features.video.ui.components.VideoLibraryCard
import com.synapse.features.video.viewmodel.VideoLibraryViewModel
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun VideoScreen() {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = VideoLibraryViewModel(context) as T
        }
    }
    val viewModel: VideoLibraryViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    var showFolderDialog by remember { mutableStateOf(false) }
    var folderName by remember { mutableStateOf("") }
    var editingFolderId by remember { mutableStateOf<String?>(null) }
    var folderToDelete by remember { mutableStateOf<VideoFolderRecord?>(null) }
    val videoPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            try {
                context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                viewModel.importVideo(uri)
            } catch (error: SecurityException) {
                Log.e(TAG, "Could not keep access to the selected video", error)
                viewModel.showError(context.getString(R.string.video_import_error))
            }
        }
    }

    BackHandler(enabled = state.selectedVideo != null) { viewModel.closePlayer() }
    val activeVideo = state.selectedVideo
    if (activeVideo != null) {
        VideoPlayerScreen(
            videoPath = activeVideo.filePath,
            keyHex = null,
            videoTitle = activeVideo.title,
            initialProgressSeconds = activeVideo.progressSeconds,
            onProgressSeconds = { viewModel.saveProgress(activeVideo, it) },
            onDurationSeconds = { viewModel.saveDuration(activeVideo, it) },
            onBack = viewModel::closePlayer,
        )
        return
    }

    Scaffold(
        containerColor = DarkCanvas,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { videoPicker.launch(arrayOf("video/*")) },
                containerColor = BrandIndigo,
                contentColor = androidx.compose.ui.graphics.Color.White,
            ) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.video_import))
            }
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            Text(stringResource(R.string.video_title), color = TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Text(stringResource(R.string.video_subtitle), color = TextSecondary, fontSize = 13.sp)
            Spacer(Modifier.height(16.dp))
            VideoFolderFilterRow(
                folders = state.folders,
                selectedFolderId = state.selectedFolderId,
                onSelect = viewModel::selectFolder,
                onAdd = {
                    editingFolderId = null
                    folderName = ""
                    showFolderDialog = true
                },
                onRename = { folder ->
                    editingFolderId = folder.id
                    folderName = folder.name
                    showFolderDialog = true
                },
                onDelete = { folderToDelete = it },
            )
            Spacer(Modifier.height(12.dp))

            state.error?.let { error ->
                Surface(color = DarkSurfaceElevated, modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(start = 12.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(error, color = IncorrectRoseText, modifier = Modifier.weight(1f))
                        IconButton(onClick = viewModel::dismissError) {
                            Icon(Icons.Default.Close, contentDescription = stringResource(R.string.general_close), tint = TextSecondary)
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }

            when {
                state.loading && state.items.isEmpty() -> Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BrandIndigo)
                }
                state.items.isEmpty() -> Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.video_empty), color = TextSecondary)
                }
                else -> LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(state.items, key = VideoLibraryItem::id) { item ->
                        VideoLibraryCard(
                            item = item,
                            folders = state.folders,
                            onOpen = { viewModel.open(item, context.getString(R.string.video_unavailable)) },
                            onMoveToFolder = { folderId ->
                                viewModel.moveToFolder(item, folderId, context.getString(R.string.video_folder_unavailable))
                            },
                        )
                    }
                }
            }
            if (state.importing) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = BrandIndigo)
            }
        }
    }

    if (showFolderDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!state.creatingFolder) {
                    showFolderDialog = false
                    folderName = ""
                    editingFolderId = null
                }
            },
            icon = { Icon(Icons.Default.CreateNewFolder, contentDescription = null, tint = BrandIndigo) },
            title = {
                Text(
                    stringResource(if (editingFolderId == null) R.string.video_new_folder else R.string.video_rename_folder),
                    color = TextPrimary,
                )
            },
            text = {
                OutlinedTextField(
                    value = folderName,
                    onValueChange = { folderName = it },
                    label = { Text(stringResource(R.string.video_folder_name)) },
                    singleLine = true,
                    enabled = !state.creatingFolder,
                )
            },
            confirmButton = {
                TextButton(
                    enabled = folderName.isNotBlank() && !state.creatingFolder,
                    onClick = {
                        val currentFolderId = editingFolderId
                        if (currentFolderId == null) {
                            viewModel.createFolder(folderName.trim(), context.getString(R.string.video_folder_name_exists))
                        } else {
                            viewModel.renameFolder(currentFolderId, folderName.trim(), context.getString(R.string.video_folder_name_exists))
                        }
                        showFolderDialog = false
                        folderName = ""
                        editingFolderId = null
                    },
                ) {
                    Text(
                        stringResource(if (editingFolderId == null) R.string.general_create else R.string.general_save),
                        color = BrandIndigo,
                    )
                }
            },
            dismissButton = {
                TextButton(
                    enabled = !state.creatingFolder,
                    onClick = {
                        showFolderDialog = false
                        folderName = ""
                        editingFolderId = null
                    },
                ) { Text(stringResource(R.string.general_cancel), color = TextSecondary) }
            },
            containerColor = DarkSurfaceElevated,
        )
    }

    folderToDelete?.let { folder ->
        AlertDialog(
            onDismissRequest = { folderToDelete = null },
            title = { Text(stringResource(R.string.video_delete_folder), color = TextPrimary) },
            text = { Text(stringResource(R.string.video_folder_delete_message, folder.name), color = TextSecondary) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteFolder(folder.id, context.getString(R.string.video_folder_unavailable))
                    folderToDelete = null
                }) { Text(stringResource(R.string.video_delete_folder), color = IncorrectRoseText) }
            },
            dismissButton = {
                TextButton(onClick = { folderToDelete = null }) {
                    Text(stringResource(R.string.general_cancel), color = TextSecondary)
                }
            },
            containerColor = DarkSurfaceElevated,
        )
    }
}

private const val TAG = "SynapseVideoScreen"
