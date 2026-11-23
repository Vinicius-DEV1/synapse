package com.synapse.features.diagrams.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.TextButton
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import com.synapse.features.diagrams.model.DiagramItem
import com.synapse.features.diagrams.ui.components.DiagramCanvasEditor
import com.synapse.features.diagrams.ui.components.DiagramsGallery
import com.synapse.features.diagrams.ui.dialogs.CreateDiagramSheet
import com.synapse.features.diagrams.ui.dialogs.DeleteDiagramDialog
import com.synapse.features.diagrams.viewmodel.DiagramsViewModel
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun DiagramsScreen() {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = DiagramsViewModel(context) as T
        }
    }
    val viewModel: DiagramsViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    var showCreateSheet by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }
    var diagramToDelete by remember { mutableStateOf<DiagramItem?>(null) }

    BackHandler(enabled = diagramToDelete != null || showCreateSheet || state.selectedDiagram != null) {
        when {
            diagramToDelete != null && !state.saving -> diagramToDelete = null
            showCreateSheet && !state.saving -> showCreateSheet = false
            state.selectedDiagram != null -> viewModel.closeEditor()
        }
    }

    LaunchedEffect(state.selectedDiagram?.id) {
        if (state.selectedDiagram != null) {
            showCreateSheet = false
            newTitle = ""
        }
    }

    val selectedDiagram = state.selectedDiagram
    if (selectedDiagram != null) {
        DiagramCanvasEditor(item = selectedDiagram, onBack = viewModel::closeEditor)
        return
    }

    Scaffold(
        containerColor = DarkCanvas,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateSheet = true },
                containerColor = BrandIndigo,
                contentColor = androidx.compose.ui.graphics.Color.White,
            ) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.diagrams_new))
            }
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
        ) {
            Text(
                text = stringResource(R.string.diagrams_title),
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
            )
            Text(
                text = stringResource(R.string.diagrams_count, state.items.size),
                fontSize = 13.sp,
                color = TextSecondary,
            )
            if (state.openingDiagram) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = BrandIndigo)
            }
            Spacer(modifier = Modifier.height(16.dp))

            state.error?.let { message ->
                Surface(color = DarkSurfaceElevated, modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(start = 12.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(message, color = IncorrectRoseText, modifier = Modifier.weight(1f))
                        IconButton(onClick = viewModel::dismissError) {
                            Icon(Icons.Default.Close, contentDescription = stringResource(R.string.general_close), tint = TextSecondary)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (state.loading && state.items.isEmpty()) {
                Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BrandIndigo)
                }
            } else {
                DiagramsGallery(
                    items = state.items,
                    enabled = !state.saving && !state.openingDiagram,
                    onOpen = viewModel::open,
                    onDelete = { diagramToDelete = it },
                    modifier = Modifier.weight(1f),
                )
            }
        }

        if (showCreateSheet) {
            CreateDiagramSheet(
                title = newTitle,
                saving = state.saving,
                onTitleChange = { newTitle = it },
                onDismiss = { if (!state.saving) showCreateSheet = false },
                onCreate = { viewModel.create(newTitle, context.getString(R.string.diagrams_default_title)) },
            )
        }
        diagramToDelete?.let { item ->
            DeleteDiagramDialog(
                item = item,
                saving = state.saving,
                onConfirm = {
                    diagramToDelete = null
                    viewModel.delete(item)
                },
                onDismiss = { if (!state.saving) diagramToDelete = null },
            )
        }
        if (state.unsupportedContent) {
            AlertDialog(
                onDismissRequest = viewModel::dismissUnsupportedContent,
                containerColor = DarkSurfaceElevated,
                title = { Text(stringResource(R.string.diagrams_editor_unsupported_title), color = TextPrimary) },
                text = { Text(stringResource(R.string.diagrams_editor_unsupported_body), color = TextSecondary) },
                confirmButton = {
                    TextButton(onClick = viewModel::dismissUnsupportedContent) {
                        Text(stringResource(R.string.general_close), color = TextSecondary)
                    }
                },
            )
        }
    }
}
