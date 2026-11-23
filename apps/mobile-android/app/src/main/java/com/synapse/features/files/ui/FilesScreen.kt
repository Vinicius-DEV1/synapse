package com.synapse.features.files.ui

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.CreateNewFolder
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
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
import com.synapse.features.files.model.FilesSections
import com.synapse.features.files.model.StoredFile
import com.synapse.features.files.model.StoredFolder
import com.synapse.features.files.ui.components.FileRow
import com.synapse.features.files.ui.components.FilesSearchControls
import com.synapse.features.files.ui.components.FolderRow
import com.synapse.features.files.ui.dialogs.ConfirmFileDeleteDialog
import com.synapse.features.files.ui.dialogs.FileNameDialog
import com.synapse.features.files.ui.dialogs.MoveToFolderDialog
import com.synapse.features.files.viewmodel.FilesViewModel
import com.synapse.R
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

private data class NameTarget(val title: String, val initial: String, val save: (String) -> Unit)
private data class DeleteTarget(val name: String, val isFolder: Boolean, val delete: () -> Unit)
private data class MoveTarget(val move: (String?) -> Unit)

@Composable
fun FilesScreen() {
    val context = LocalContext.current
    val appContext = context.applicationContext
    val factory = remember(appContext) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = FilesViewModel(appContext) as T
        }
    }
    val viewModel: FilesViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    var query by rememberSaveable { mutableStateOf("") }
    var globalSearch by rememberSaveable { mutableStateOf(false) }
    val isGlobalSearchActive = globalSearch && query.isNotBlank()
    var category by rememberSaveable { mutableStateOf("all") }
    var nameTarget by remember { mutableStateOf<NameTarget?>(null) }
    var deleteTarget by remember { mutableStateOf<DeleteTarget?>(null) }
    var moveTarget by remember { mutableStateOf<MoveTarget?>(null) }
    var openError by remember { mutableStateOf<String?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris: List<Uri> ->
        viewModel.importDocuments(uris)
    }
    val visibleFolders = remember(state.folders, state.allFolders, query, isGlobalSearchActive, state.section) {
        val candidates = if (isGlobalSearchActive && state.section == FilesSections.FOLDERS) state.allFolders else state.folders
        if (isGlobalSearchActive && state.section != FilesSections.FOLDERS) emptyList()
        else candidates.filter { it.name.contains(query, true) }
    }
    val sourceFiles = if (isGlobalSearchActive) state.searchResults else state.files
    val categoryCounts = remember(sourceFiles) { sourceFiles.groupingBy { it.type }.eachCount() }
    val visibleFiles = remember(sourceFiles, query, category) {
        sourceFiles.filter { file ->
            (query.isBlank() || file.name.contains(query, true)) && (category == "all" || file.type == category)
        }
    }
    val fileFoldersById = remember(state.allFolders) { state.allFolders.associateBy { it.id } }

    LaunchedEffect(globalSearch, query, state.section) {
        if (globalSearch) viewModel.searchGlobally(query) else viewModel.clearGlobalSearch()
    }

    BackHandler(enabled = state.folderPath.isNotEmpty()) { viewModel.goUp() }
    Scaffold(containerColor = DarkCanvas) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Arquivos", color = TextPrimary, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text("${state.driveFileCount} itens no Drive", color = TextSecondary, fontSize = 13.sp)
                }
                if (state.section == FilesSections.FOLDERS) {
                    IconButton(onClick = { nameTarget = NameTarget("Nova pasta", "") { viewModel.createFolder(it) } }, enabled = !state.saving) {
                        Icon(Icons.Default.CreateNewFolder, "Criar pasta", tint = TextSecondary)
                    }
                    IconButton(onClick = { picker.launch(arrayOf("*/*")) }, enabled = !state.saving) {
                        Icon(Icons.Default.UploadFile, "Importar arquivos", tint = TextSecondary)
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SECTION_OPTIONS.forEach { (section, label) ->
                    FilterChip(
                        selected = state.section == section,
                        onClick = { query = ""; globalSearch = false; viewModel.selectSection(section) },
                        label = { Text(label) },
                    )
                }
            }
            if (state.folderPath.isNotEmpty() && state.section == FilesSections.FOLDERS) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = viewModel::goUp) { Icon(Icons.Default.ArrowUpward, "Voltar para pasta anterior", tint = TextSecondary) }
                    TextButton(onClick = { viewModel.selectSection(FilesSections.FOLDERS) }) { Text("Pastas") }
                    state.folderPath.forEach { folder ->
                        Text("/", color = TextMuted)
                        TextButton(onClick = { navigateToPath(folder, state.folderPath, viewModel) }) { Text(folder.name, color = TextSecondary, maxLines = 1) }
                    }
                }
            }
            FilesSearchControls(query, { query = it }, globalSearch, { globalSearch = it })
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FILE_CATEGORIES.forEach { (key, label) ->
                    val count = if (key == "all") sourceFiles.size else categoryCounts[key] ?: 0
                    if (key == "all" || count > 0 || category == key) {
                        FilterChip(
                            selected = category == key,
                            onClick = { category = key },
                            label = { Text("$label · $count") },
                        )
                    }
                }
            }
            state.error?.let { Text(it, color = IncorrectRoseText, fontSize = 13.sp) }
            openError?.let { Text(it, color = IncorrectRoseText, fontSize = 13.sp) }
            if (state.searching || (state.loading && (state.folders.isNotEmpty() || state.files.isNotEmpty()))) {
                LinearProgressIndicator(Modifier.fillMaxWidth())
            }
            when {
                state.loading && state.folders.isEmpty() && state.files.isEmpty() -> CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally).padding(top = 28.dp))
                visibleFolders.isEmpty() && visibleFiles.isEmpty() -> Text(
                    emptyMessage(state.section, query),
                    Modifier.fillMaxWidth().weight(1f).padding(top = 24.dp),
                    color = TextMuted,
                )
                else -> LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(visibleFolders, key = { "folder:${it.id}" }) { folder ->
                        FolderRow(folder, !state.loading && !state.saving, {
                            if (isGlobalSearchActive) {
                                query = ""
                                globalSearch = false
                                viewModel.openFolderFromSearch(folder)
                            } else {
                                viewModel.openFolder(folder)
                            }
                        },
                            { moveTarget = MoveTarget { viewModel.moveFolder(folder, it) } },
                            { nameTarget = renameFolderTarget(folder, viewModel) },
                            { deleteTarget = deleteFolderTarget(folder, viewModel) })
                    }
                    items(visibleFiles, key = { "file:${it.id}" }) { file ->
                        val locationLabel = if (isGlobalSearchActive) {
                            file.folderId?.let(fileFoldersById::get)?.name
                                ?: stringResource(R.string.files_root)
                        } else null
                        FileRow(file, !state.loading && !state.saving, locationLabel,
                            { openError = null; openFile(file, context) { openError = it } },
                            { moveTarget = MoveTarget { viewModel.moveFile(file, it) } },
                            { nameTarget = renameFileTarget(file, viewModel) },
                            { viewModel.duplicateFile(file) },
                            { deleteTarget = deleteFileTarget(file, viewModel) })
                    }
                }
            }
            if (state.saving) Text("Salvando…", Modifier.padding(vertical = 8.dp), color = TextSecondary, fontSize = 12.sp)
            TextButton(onClick = viewModel::refresh, enabled = !state.loading && !state.saving, modifier = Modifier.align(Alignment.End)) {
                Text("Atualizar", color = TextSecondary)
            }
        }
    }

    nameTarget?.let { target -> FileNameDialog(target.title, target.initial, { nameTarget = null }) { name ->
        target.save(name); nameTarget = null
    } }
    deleteTarget?.let { target -> ConfirmFileDeleteDialog(target.name, target.isFolder, { deleteTarget = null }) {
        target.delete(); deleteTarget = null
    } }
    moveTarget?.let { target -> MoveToFolderDialog(state.allFolders, { moveTarget = null }) { folderId ->
        target.move(folderId); moveTarget = null
    } }
}

private fun renameFolderTarget(folder: StoredFolder, viewModel: FilesViewModel) =
    NameTarget("Renomear pasta", folder.name) { viewModel.renameFolder(folder, it) }

private fun deleteFolderTarget(folder: StoredFolder, viewModel: FilesViewModel) =
    DeleteTarget(folder.name, true) { viewModel.deleteFolder(folder) }

private fun renameFileTarget(file: StoredFile, viewModel: FilesViewModel) =
    NameTarget("Renomear arquivo", file.name) { viewModel.renameFile(file, it) }

private fun deleteFileTarget(file: StoredFile, viewModel: FilesViewModel) =
    DeleteTarget(file.name, false) { viewModel.deleteFile(file) }

private fun navigateToPath(folder: StoredFolder, path: List<StoredFolder>, viewModel: FilesViewModel) {
    val index = path.indexOfFirst { it.id == folder.id }
    if (index >= 0) viewModel.navigateToFolderPath(path.take(index + 1))
}

private fun openFile(file: StoredFile, context: android.content.Context, onError: (String) -> Unit) {
    val fileUri = file.uri?.let(Uri::parse)
    if (fileUri == null) return onError("Este item não tem um arquivo local disponível.")
    try {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(fileUri, file.mimeType ?: "*/*")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Abrir arquivo"))
    } catch (_: ActivityNotFoundException) {
        onError("Não há um app instalado para abrir este arquivo.")
    } catch (_: SecurityException) {
        onError("O acesso a este arquivo expirou. Importe-o novamente para renovar a permissão.")
    }
}

private fun emptyMessage(section: String, query: String) = when {
    query.isNotBlank() -> "Nenhum item corresponde à busca."
    section == FilesSections.RECENT -> "Não há arquivos recentes."
    section == FilesSections.DRIVE -> "Não há arquivos do Drive sincronizados."
    else -> "Esta pasta está vazia. Importe um arquivo ou crie uma pasta."
}

private val SECTION_OPTIONS = listOf(FilesSections.FOLDERS to "Pastas", FilesSections.RECENT to "Recentes", FilesSections.DRIVE to "Drive")
private val FILE_CATEGORIES = listOf(
    "all" to "Todos",
    "pdf" to "PDF",
    "epub" to "E-books",
    "image" to "Imagens",
    "video" to "Vídeos",
    "text" to "Textos",
    "code" to "Código",
    "archive" to "Compactados",
)
