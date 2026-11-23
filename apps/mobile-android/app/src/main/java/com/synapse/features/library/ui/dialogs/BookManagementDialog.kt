package com.synapse.features.library.ui.dialogs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
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
import com.synapse.features.library.model.BookItem
import com.synapse.features.library.model.LibraryCollectionItem
import com.synapse.features.library.model.LibraryUiState

@Composable
fun BookManagementDialog(
    book: BookItem,
    collections: List<LibraryCollectionItem>,
    saving: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onSave: (String, String, Set<String>) -> Unit,
    onArchive: () -> Unit,
    onDelete: () -> Unit,
    notebookState: LibraryUiState,
    notebookActions: BookNotebookActions,
    onOpenNotebook: () -> Unit,
    onCloseNotebook: () -> Unit,
) {
    var title by remember(book.id) { mutableStateOf(book.title) }
    var author by remember(book.id) { mutableStateOf(book.author) }
    var selectedCollectionIds by remember(book.id) { mutableStateOf(book.collectionIds) }
    var confirmDelete by remember(book.id) { mutableStateOf(false) }
    var showNotebook by remember(book.id) { mutableStateOf(false) }

    if (!confirmDelete) {
        AlertDialog(
            onDismissRequest = { if (!saving) onDismiss() },
            title = { Text("Gerenciar livro") },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("Título") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = author,
                        onValueChange = { author = it },
                        label = { Text("Autor") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text("Coleções")
                    if (collections.isEmpty()) {
                        Text("Nenhuma coleção criada.")
                    }
                    collections.forEach { collection ->
                        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                            Checkbox(
                                checked = collection.id in selectedCollectionIds,
                                onCheckedChange = { checked ->
                                    selectedCollectionIds = if (checked) {
                                        selectedCollectionIds + collection.id
                                    } else {
                                        selectedCollectionIds - collection.id
                                    }
                                },
                                enabled = !saving,
                            )
                            Text(collection.name)
                        }
                    }
                    if (error != null) Text(error)
                    TextButton(
                        onClick = {
                            showNotebook = true
                            onOpenNotebook()
                        },
                        enabled = !saving,
                    ) { Text("Caderno de leitura") }
                    TextButton(onClick = onArchive, enabled = !saving) {
                        Text(if (book.isArchived) "Restaurar da arquivação" else "Arquivar livro")
                    }
                    TextButton(onClick = { confirmDelete = true }, enabled = !saving) {
                        Text("Excluir livro")
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = { onSave(title.trim(), author.trim(), selectedCollectionIds) },
                    enabled = !saving && title.isNotBlank(),
                ) {
                    Text(if (saving) "Salvando…" else "Salvar")
                }
            },
            dismissButton = {
                TextButton(onClick = onDismiss, enabled = !saving) { Text("Fechar") }
            },
        )
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { if (!saving) confirmDelete = false },
            title = { Text("Excluir livro?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("O livro e seus marcadores e destaques sairão da biblioteca ativa.")
                    if (error != null) Text(error)
                }
            },
            confirmButton = {
                TextButton(
                    onClick = onDelete,
                    enabled = !saving,
                ) { Text("Excluir") }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = false }, enabled = !saving) {
                    Text("Cancelar")
                }
            },
        )
    }

    if (showNotebook) {
        BookNotebookDialog(
            bookId = book.id,
            bookTitle = book.title,
            state = BookNotebookUiState(
                notebook = notebookState.notebook,
                loading = notebookState.notebookLoading,
                saving = notebookState.notebookSaving,
                error = notebookState.notebookError,
                mutationVersion = notebookState.notebookMutationVersion,
            ),
            actions = notebookActions,
            onDismiss = {
                showNotebook = false
                onCloseNotebook()
            },
        )
    }
}
