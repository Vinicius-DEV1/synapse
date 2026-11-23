package com.synapse.features.library.ui.dialogs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.synapse.features.library.model.LibraryCollectionItem

@Composable
fun CollectionsManagementDialog(
    collections: List<LibraryCollectionItem>,
    saving: Boolean,
    error: String?,
    mutationVersion: Long,
    onDismiss: () -> Unit,
    onSave: (LibraryCollectionItem?, String) -> Unit,
    onDelete: (LibraryCollectionItem) -> Unit,
) {
    var editingCollection by remember { mutableStateOf<LibraryCollectionItem?>(null) }
    var collectionToDelete by remember { mutableStateOf<LibraryCollectionItem?>(null) }
    var name by remember { mutableStateOf("") }
    var openedAtVersion by remember { mutableLongStateOf(mutationVersion) }

    LaunchedEffect(mutationVersion) {
        if (mutationVersion > openedAtVersion) {
            editingCollection = null
            collectionToDelete = null
            name = ""
            openedAtVersion = mutationVersion
        }
    }

    if (collectionToDelete != null) {
        val target = collectionToDelete
        AlertDialog(
            onDismissRequest = { if (!saving) collectionToDelete = null },
            title = { Text("Excluir coleção?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Os livros permanecem na biblioteca e deixam de pertencer a esta coleção.")
                    if (error != null) Text(error)
                }
            },
            confirmButton = {
                TextButton(
                    onClick = { target?.let(onDelete) },
                    enabled = !saving,
                ) { Text("Excluir") }
            },
            dismissButton = {
                TextButton(onClick = { collectionToDelete = null }, enabled = !saving) {
                    Text("Cancelar")
                }
            },
        )
    } else {
        AlertDialog(
            onDismissRequest = { if (!saving) onDismiss() },
            title = { Text("Coleções") },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text(if (editingCollection == null) "Nova coleção" else "Nome da coleção") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    collections.forEach { collection ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(collection.name, modifier = Modifier.weight(1f))
                            TextButton(
                                onClick = {
                                    editingCollection = collection
                                    name = collection.name
                                },
                                enabled = !saving,
                            ) { Text("Editar") }
                            TextButton(
                                onClick = { collectionToDelete = collection },
                                enabled = !saving,
                            ) { Text("Excluir") }
                        }
                    }
                    if (error != null) Text(error)
                }
            },
            confirmButton = {
                TextButton(
                    onClick = { onSave(editingCollection, name.trim()) },
                    enabled = !saving && name.isNotBlank(),
                ) {
                    Text(if (saving) "Salvando…" else if (editingCollection == null) "Criar" else "Salvar")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        if (editingCollection != null) {
                            editingCollection = null
                            name = ""
                        } else {
                            onDismiss()
                        }
                    },
                    enabled = !saving,
                ) { Text(if (editingCollection == null) "Fechar" else "Cancelar edição") }
            },
        )
    }
}
