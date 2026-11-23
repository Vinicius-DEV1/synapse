package com.synapse.features.files.ui.dialogs

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.synapse.features.files.model.StoredFolder

@Composable
fun FileNameDialog(title: String, initialValue: String, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var value by remember(title, initialValue) { mutableStateOf(initialValue) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { OutlinedTextField(value, { value = it }, singleLine = true, label = { Text("Nome") }) },
        confirmButton = { TextButton(onClick = { onConfirm(value.trim()) }, enabled = value.isNotBlank()) { Text("Salvar") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}

@Composable
fun ConfirmFileDeleteDialog(itemName: String, isFolder: Boolean, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isFolder) "Excluir pasta?" else "Excluir arquivo?") },
        text = {
            Text(
                if (isFolder) "Excluir ‘$itemName’? Os arquivos serão movidos para Todos os Arquivos e as subpastas para a raiz."
                else "Enviar ‘$itemName’ para a Lixeira?",
            )
        },
        confirmButton = { TextButton(onClick = onConfirm) { Text("Excluir") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}

@Composable
fun MoveToFolderDialog(folders: List<StoredFolder>, onDismiss: () -> Unit, onChoose: (String?) -> Unit) {
    val foldersById = remember(folders) { folders.associateBy { it.id } }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Mover para") },
        text = {
            Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
                TextButton(onClick = { onChoose(null) }, modifier = Modifier.fillMaxWidth()) { Text("Raiz do Synapse") }
                folders.sortedBy { it.name.lowercase() }.forEach { folder ->
                    val parentName = folder.parentId?.let(foldersById::get)?.name
                    val label = if (parentName == null) folder.name else "$parentName / ${folder.name}"
                    TextButton(onClick = { onChoose(folder.id) }, modifier = Modifier.fillMaxWidth()) {
                        Text(label, modifier = Modifier.padding(start = 8.dp))
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}
