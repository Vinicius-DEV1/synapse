package com.synapse.features.trash.ui

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.synapse.R
import com.synapse.features.trash.model.TrashedItem
import com.synapse.features.trash.model.TrashItemTypes
import com.synapse.features.trash.ui.components.TrashFilter
import com.synapse.features.trash.ui.components.TrashFilterBar
import com.synapse.features.trash.ui.components.TrashItemCard
import com.synapse.features.trash.ui.dialogs.DeleteTrashedItemDialog
import com.synapse.features.trash.ui.dialogs.EmptyTrashDialog
import com.synapse.features.trash.viewmodel.TrashViewModel
import com.synapse.ui.components.NativeHelpTopic
import com.synapse.ui.components.NativeModuleHelpAction
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.IncorrectRose
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun TrashScreen() {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = TrashViewModel(context) as T
        }
    }
    val viewModel: TrashViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    var selectedFilter by remember { mutableStateOf(TrashFilter.ALL) }
    var itemToDelete by remember { mutableStateOf<TrashedItem?>(null) }
    var showEmptyDialog by remember { mutableStateOf(false) }
    val hasLofiItems = remember(state.items) { state.items.any { it.itemType == TrashItemTypes.LOFI } }
    val filteredItems = remember(state.items, selectedFilter) {
        selectedFilter.itemTypes?.let { types -> state.items.filter { it.itemType in types } } ?: state.items
    }

    Scaffold(containerColor = DarkCanvas) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
        ) {
            Spacer(Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Lixeira Universal", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("${state.items.size} itens na lixeira", fontSize = 13.sp, color = TextSecondary)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = viewModel::refresh, enabled = !state.loading && !state.saving) {
                        Icon(Icons.Default.Refresh, contentDescription = "Atualizar lixeira", tint = TextSecondary)
                    }
                    NativeModuleHelpAction(
                        titleId = R.string.trash_help_title,
                        topics = listOf(
                            NativeHelpTopic(R.string.trash_help_browse, R.string.trash_help_browse_body),
                            NativeHelpTopic(R.string.trash_help_restore, R.string.trash_help_restore_body),
                            NativeHelpTopic(R.string.trash_help_delete, R.string.trash_help_delete_body),
                            NativeHelpTopic(R.string.trash_help_data, R.string.trash_help_data_body),
                        ),
                    )
                    if (state.items.isNotEmpty()) {
                        Button(
                            onClick = { showEmptyDialog = true },
                            enabled = !state.saving && !hasLofiItems,
                            colors = ButtonDefaults.buttonColors(containerColor = IncorrectRose),
                        ) {
                            Icon(Icons.Default.DeleteSweep, contentDescription = null)
                            Text("Esvaziar", modifier = Modifier.padding(start = 6.dp), fontSize = 12.sp)
                        }
                    }
                }
            }

            if (hasLofiItems) {
                Text(
                    "A Lixeira contém mídia Lofi. Use o cliente React para excluir os arquivos antes de esvaziar.",
                    color = TextSecondary,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
            }

            Spacer(Modifier.height(14.dp))
            TrashFilterBar(selected = selectedFilter, onSelect = { selectedFilter = it })
            Spacer(Modifier.height(14.dp))

            if (state.error != null) {
                Column {
                    Text(state.error.orEmpty(), color = IncorrectRoseText, fontSize = 13.sp)
                    TextButton(onClick = viewModel::refresh, enabled = !state.loading && !state.saving) {
                        Text("Tentar novamente", color = TextSecondary)
                    }
                }
            }

            when {
                state.loading && state.items.isEmpty() -> CircularProgressIndicator(
                    modifier = Modifier.padding(top = 32.dp).align(Alignment.CenterHorizontally),
                )
                filteredItems.isEmpty() -> Text(
                    text = if (state.items.isEmpty()) "A lixeira está vazia." else "Nenhum item nesta categoria.",
                    color = TextMuted,
                    fontSize = 14.sp,
                    modifier = Modifier.fillMaxWidth().weight(1f).padding(top = 24.dp),
                )
                else -> LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(filteredItems, key = { "${it.itemType}:${it.id}" }) { item ->
                        TrashItemCard(
                            item = item,
                            saving = state.saving,
                            canDeletePermanently = item.itemType != TrashItemTypes.LOFI,
                            onRestore = { viewModel.restore(item) },
                            onDelete = { itemToDelete = item },
                        )
                    }
                }
            }
        }
    }

    itemToDelete?.let { item ->
        DeleteTrashedItemDialog(
            item = item,
            saving = state.saving,
            onConfirm = { viewModel.deletePermanently(item); itemToDelete = null },
            onDismiss = { itemToDelete = null },
        )
    }
    if (showEmptyDialog) {
        EmptyTrashDialog(
            itemCount = state.items.size,
            saving = state.saving,
            onConfirm = { viewModel.empty(); showEmptyDialog = false },
            onDismiss = { showEmptyDialog = false },
        )
    }
}
