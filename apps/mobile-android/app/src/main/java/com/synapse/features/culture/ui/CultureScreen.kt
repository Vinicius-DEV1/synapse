package com.synapse.features.culture.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.synapse.features.culture.model.CultureMediaItem
import com.synapse.features.culture.ui.components.CultureFilters
import com.synapse.features.culture.ui.components.CultureHelpAction
import com.synapse.features.culture.ui.components.CultureMediaCard
import com.synapse.features.culture.ui.components.CultureMetricsRow
import com.synapse.features.culture.ui.dialogs.CultureAddSheetHost
import com.synapse.features.culture.ui.dialogs.CultureDetailsSheet
import com.synapse.features.culture.ui.dialogs.CultureEditSheetHost
import com.synapse.features.culture.viewmodel.CultureViewModel
import com.synapse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CultureScreen() {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                CultureViewModel(context) as T
        }
    }
    val viewModel: CultureViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()

    var selectedTypeFilter by remember { mutableStateOf("Todos") }
    var selectedStatusFilter by remember { mutableStateOf("Todos") }
    var searchQuery by remember { mutableStateOf("") }
    var selectedItemForDetails by remember { mutableStateOf<CultureMediaItem?>(null) }
    var editingItem by remember { mutableStateOf<CultureMediaItem?>(null) }
    var isAddingItem by remember { mutableStateOf(false) }
    var submittedMutationVersion by remember { mutableStateOf(0L) }
    var isSavingDetails by remember { mutableStateOf(false) }
    var closeDetailsAfterSave by remember { mutableStateOf(false) }
    var isCompletingDetails by remember { mutableStateOf(false) }

    LaunchedEffect(state.mutationVersion, state.saving, state.error) {
        if (isSavingDetails && state.mutationVersion > submittedMutationVersion) {
            if (closeDetailsAfterSave) selectedItemForDetails = null
            isSavingDetails = false
            closeDetailsAfterSave = false
            isCompletingDetails = false
        } else if (isSavingDetails && !state.saving && state.error != null) {
            isSavingDetails = false
            closeDetailsAfterSave = false
            isCompletingDetails = false
        }
    }

    val filteredItems = remember(state.items, selectedTypeFilter, selectedStatusFilter, searchQuery) {
        state.items.filter { item ->
            val matchType = when (selectedTypeFilter) {
                "Filmes" -> item.type == "filme"
                "Séries" -> item.type == "série"
                "Animes" -> item.type == "anime"
                "HQs" -> item.type == "hq"
                "Mangás" -> item.type == "manga"
                "Livros" -> item.type == "livro"
                "Novels" -> item.type == "novel"
                else -> true
            }
            val matchStatus = when (selectedStatusFilter) {
                "Em Andamento" -> item.status == "watching"
                "Concluídos" -> item.status == "completed"
                "Planejados" -> item.status == "plan_to_watch"
                "Objetivos" -> item.isGoal
                else -> true
            }
            val matchSearch = searchQuery.isBlank() || item.title.contains(searchQuery, ignoreCase = true) ||
                item.notes.contains(searchQuery, ignoreCase = true)
            matchType && matchStatus && matchSearch
        }
    }

    val totalWatching = remember(state.items) { state.items.count { it.status == "watching" } }
    val totalCompleted = remember(state.items) { state.items.count { it.status == "completed" } }
    val avgScore = remember(state.items) {
        state.items.mapNotNull { it.score }.takeIf { it.isNotEmpty() }?.average()
    }

    Scaffold(
        containerColor = DarkCanvas,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { isAddingItem = true },
                containerColor = BrandIndigo,
                contentColor = Color.White,
            ) {
                Icon(Icons.Default.Add, contentDescription = "Adicionar Mídia")
            }
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Cultura & Cinema", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("Catálogo de filmes, animes e séries", fontSize = 13.sp, color = TextSecondary)
                }
                CultureHelpAction()
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = DarkSurfaceElevated,
                    border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
                    modifier = Modifier.padding(4.dp),
                ) {
                    Icon(Icons.Default.Movie, contentDescription = "Cultura", tint = BrandIndigoLight, modifier = Modifier.padding(8.dp))
                }
            }

            Spacer(modifier = Modifier.height(14.dp))
            CultureMetricsRow(
                totalItems = state.items.size,
                totalWatching = totalWatching,
                totalCompleted = totalCompleted,
                averageScore = avgScore,
            )
            Spacer(modifier = Modifier.height(14.dp))
            CultureFilters(
                selectedType = selectedTypeFilter,
                selectedStatus = selectedStatusFilter,
                searchQuery = searchQuery,
                onTypeSelected = { selectedTypeFilter = it },
                onStatusSelected = { selectedStatusFilter = it },
                onSearchChanged = { searchQuery = it },
            )
            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (state.loading && state.items.isEmpty()) {
                    item {
                        CircularProgressIndicator(
                            modifier = Modifier.padding(top = 32.dp),
                            color = BrandIndigoLight,
                        )
                    }
                }
                state.error?.let { error ->
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(error, color = IncorrectRoseText, fontSize = 13.sp)
                            TextButton(onClick = viewModel::refresh, enabled = !state.loading) {
                                Text("Tentar novamente", color = BrandIndigoLight)
                            }
                        }
                    }
                }
                if (!state.loading && filteredItems.isEmpty()) {
                    item {
                        Text(
                            text = if (state.items.isEmpty()) "Nenhum título cadastrado ainda." else "Nenhum título corresponde aos filtros.",
                            color = TextMuted,
                            fontSize = 14.sp,
                            modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
                        )
                    }
                }
                items(filteredItems, key = { it.id }) { item ->
                    CultureMediaCard(
                        item = item,
                        onOpenDetails = { selectedItemForDetails = item },
                        onDecrementProgress = {
                            if (!state.saving && item.currentProgress > 0) {
                                viewModel.updateProgress(item, item.currentProgress - 1)
                            }
                        },
                        onIncrementProgress = {
                            if (!state.saving && item.currentProgress < item.totalProgress) {
                                viewModel.updateProgress(item, item.currentProgress + 1)
                            }
                        },
                    )
                }
            }
        }

        selectedItemForDetails?.let { selectedItem ->
            val detailItem = state.items.firstOrNull { it.id == selectedItem.id } ?: selectedItem
            LaunchedEffect(detailItem.id) { viewModel.loadEpisodes(detailItem) }
            CultureDetailsSheet(
                item = detailItem,
                episodes = state.episodes,
                episodesLoading = state.episodesLoading,
                episodesError = state.episodesError,
                isSaving = state.saving,
                isCompleting = isCompletingDetails,
                errorMessage = state.error,
                onDismiss = { if (!state.saving) selectedItemForDetails = null },
                onToggleGoal = {
                    if (!state.saving) {
                        submittedMutationVersion = state.mutationVersion
                        isSavingDetails = true
                        closeDetailsAfterSave = false
                        isCompletingDetails = false
                        viewModel.setGoal(detailItem, !detailItem.isGoal)
                    }
                },
                onCreateEpisodeList = {
                    if (!state.saving) viewModel.createEpisodeChecklist(detailItem)
                },
                onToggleEpisode = { episode ->
                    if (!state.saving) viewModel.toggleEpisode(detailItem, episode)
                },
                onEdit = {
                    editingItem = detailItem
                    selectedItemForDetails = null
                },
                onDelete = {
                    if (!state.saving) {
                        submittedMutationVersion = state.mutationVersion
                        isSavingDetails = true
                        closeDetailsAfterSave = true
                        isCompletingDetails = false
                        viewModel.delete(detailItem)
                    }
                },
                onMarkCompleted = {
                    if (!state.saving) {
                        submittedMutationVersion = state.mutationVersion
                        isSavingDetails = true
                        closeDetailsAfterSave = true
                        isCompletingDetails = true
                        viewModel.markCompleted(detailItem)
                    }
                },
            )
        }

        CultureEditSheetHost(
            item = editingItem,
            state = state,
            onDismiss = { editingItem = null },
            onSave = viewModel::update,
        )

        CultureAddSheetHost(
            isOpen = isAddingItem,
            state = state,
            onDismiss = { isAddingItem = false },
            onAdd = viewModel::create,
        )
    }
}
