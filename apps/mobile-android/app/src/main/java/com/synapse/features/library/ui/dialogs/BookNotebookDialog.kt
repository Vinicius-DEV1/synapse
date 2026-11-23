package com.synapse.features.library.ui.dialogs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.synapse.features.library.model.BookBookmark
import com.synapse.features.library.model.BookHighlight
import com.synapse.features.library.model.LibraryNotebook
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

data class BookNotebookUiState(
    val notebook: LibraryNotebook,
    val loading: Boolean,
    val saving: Boolean,
    val error: String?,
    val mutationVersion: Long,
)

data class BookNotebookActions(
    val onRetry: () -> Unit,
    val onSaveBookmark: (Int, String) -> Unit,
    val onUpdateBookmark: (String, String) -> Unit,
    val onDeleteBookmark: (String) -> Unit,
    val onCreateHighlight: (Int, String, String) -> Unit,
    val onUpdateHighlightNote: (String, String) -> Unit,
    val onDeleteHighlight: (String) -> Unit,
)

@Composable
fun BookNotebookDialog(
    bookId: String,
    bookTitle: String,
    state: BookNotebookUiState,
    actions: BookNotebookActions,
    onDismiss: () -> Unit,
) {
    var selectedTab by remember(bookId) { mutableIntStateOf(0) }
    var pageNumber by remember(bookId) { mutableStateOf("1") }
    var bookmarkLabel by remember(bookId) { mutableStateOf("") }
    var editingBookmark by remember(bookId) { mutableStateOf<BookBookmark?>(null) }
    var highlightText by remember(bookId) { mutableStateOf("") }
    var highlightNote by remember(bookId) { mutableStateOf("") }
    var editingHighlight by remember(bookId) { mutableStateOf<BookHighlight?>(null) }
    var bookmarkToDelete by remember(bookId) { mutableStateOf<BookBookmark?>(null) }
    var highlightToDelete by remember(bookId) { mutableStateOf<BookHighlight?>(null) }
    var openedAtVersion by remember(bookId) { mutableLongStateOf(state.mutationVersion) }

    LaunchedEffect(state.mutationVersion) {
        if (state.mutationVersion > openedAtVersion) {
            editingBookmark = null
            editingHighlight = null
            bookmarkLabel = ""
            highlightText = ""
            highlightNote = ""
            openedAtVersion = state.mutationVersion
        }
    }

    AlertDialog(
        onDismissRequest = { if (!state.saving) onDismiss() },
        containerColor = DarkSurface,
        title = { Text("Caderno de leitura", color = TextPrimary) },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth().heightIn(max = 560.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(bookTitle, color = TextSecondary)
                TabRow(selectedTabIndex = selectedTab) {
                    Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Marcadores") })
                    Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Destaques") })
                }
                if (state.error != null) {
                    Text(state.error, color = TextSecondary)
                    TextButton(onClick = actions.onRetry, enabled = !state.loading && !state.saving) {
                        Text("Tentar novamente", color = BrandIndigo)
                    }
                }
                if (selectedTab == 0) {
                    OutlinedTextField(
                        value = pageNumber,
                        onValueChange = { pageNumber = it.filter(Char::isDigit).take(5) },
                        label = { Text("Página") },
                        singleLine = true,
                        enabled = !state.saving && editingBookmark == null,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = bookmarkLabel,
                        onValueChange = { bookmarkLabel = it },
                        label = { Text("Nome do marcador") },
                        singleLine = true,
                        enabled = !state.saving,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Button(
                        onClick = {
                            val page = pageNumber.toIntOrNull() ?: return@Button
                            val existing = editingBookmark
                            if (existing == null) actions.onSaveBookmark(page, bookmarkLabel.trim())
                            else actions.onUpdateBookmark(existing.id, bookmarkLabel.trim())
                        },
                        enabled = !state.saving && !state.loading && (pageNumber.toIntOrNull() ?: 0) > 0,
                    ) { Text(if (editingBookmark == null) "Adicionar marcador" else "Salvar marcador") }
                } else {
                    OutlinedTextField(
                        value = pageNumber,
                        onValueChange = { pageNumber = it.filter(Char::isDigit).take(5) },
                        label = { Text("Página") },
                        singleLine = true,
                        enabled = !state.saving && editingHighlight == null,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = highlightText,
                        onValueChange = { highlightText = it },
                        label = { Text("Trecho") },
                        enabled = !state.saving,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = highlightNote,
                        onValueChange = { highlightNote = it },
                        label = { Text("Nota") },
                        enabled = !state.saving,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Button(
                        onClick = {
                            val existing = editingHighlight
                            if (existing == null) {
                                actions.onCreateHighlight(pageNumber.toInt(), highlightText.trim(), highlightNote.trim())
                            } else {
                                actions.onUpdateHighlightNote(existing.id, highlightNote.trim())
                            }
                        },
                        enabled = !state.saving && !state.loading && (pageNumber.toIntOrNull() ?: 0) > 0 &&
                            (editingHighlight != null || highlightText.isNotBlank()),
                    ) { Text(if (editingHighlight == null) "Adicionar destaque" else "Salvar nota") }
                }
                if (state.loading) CircularProgressIndicator(color = BrandIndigo)
                else if (selectedTab == 0) BookmarkList(
                    items = state.notebook.bookmarks,
                    saving = state.saving,
                    onEdit = {
                        editingBookmark = it
                        pageNumber = it.pageNumber.toString()
                        bookmarkLabel = it.label
                    },
                    onDelete = { bookmarkToDelete = it },
                ) else HighlightList(
                    items = state.notebook.highlights,
                    saving = state.saving,
                    onEdit = {
                        editingHighlight = it
                        pageNumber = it.pageNumber.toString()
                        highlightText = it.text
                        highlightNote = it.note
                    },
                    onDelete = { highlightToDelete = it },
                )
            }
        },
        confirmButton = { TextButton(onClick = onDismiss, enabled = !state.saving) { Text("Fechar") } },
    )

    bookmarkToDelete?.let { bookmark ->
        ConfirmNotebookDelete(
            title = "Excluir marcador?",
            saving = state.saving,
            onConfirm = { actions.onDeleteBookmark(bookmark.id); bookmarkToDelete = null },
            onDismiss = { bookmarkToDelete = null },
        )
    }
    highlightToDelete?.let { highlight ->
        ConfirmNotebookDelete(
            title = "Excluir destaque?",
            saving = state.saving,
            onConfirm = { actions.onDeleteHighlight(highlight.id); highlightToDelete = null },
            onDismiss = { highlightToDelete = null },
        )
    }
}

@Composable
private fun BookmarkList(
    items: List<BookBookmark>,
    saving: Boolean,
    onEdit: (BookBookmark) -> Unit,
    onDelete: (BookBookmark) -> Unit,
) {
    if (items.isEmpty()) {
        Text("Nenhum marcador salvo.", color = TextSecondary)
        return
    }
    LazyColumn(modifier = Modifier.heightIn(max = 220.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        items(items, key = BookBookmark::id) { item ->
            Card(colors = CardDefaults.cardColors(containerColor = DarkSurface.copy(alpha = 0.72f))) {
                Row(Modifier.fillMaxWidth().padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Pág. ${item.pageNumber} · ${item.label}", color = TextPrimary, modifier = Modifier.weight(1f))
                    TextButton(onClick = { onEdit(item) }, enabled = !saving) { Text("Editar") }
                    TextButton(onClick = { onDelete(item) }, enabled = !saving) { Text("Excluir") }
                }
            }
        }
    }
}

@Composable
private fun HighlightList(
    items: List<BookHighlight>,
    saving: Boolean,
    onEdit: (BookHighlight) -> Unit,
    onDelete: (BookHighlight) -> Unit,
) {
    if (items.isEmpty()) {
        Text("Nenhum destaque salvo.", color = TextSecondary)
        return
    }
    LazyColumn(modifier = Modifier.heightIn(max = 220.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        items(items, key = BookHighlight::id) { item ->
            Card(colors = CardDefaults.cardColors(containerColor = DarkSurface.copy(alpha = 0.72f))) {
                Column(Modifier.fillMaxWidth().padding(10.dp)) {
                    Text("Pág. ${item.pageNumber} · ${item.text}", color = TextPrimary)
                    if (item.note.isNotBlank()) Text(item.note, color = TextSecondary)
                    Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                        TextButton(onClick = { onEdit(item) }, enabled = !saving) { Text("Editar nota") }
                        TextButton(onClick = { onDelete(item) }, enabled = !saving) { Text("Excluir") }
                    }
                }
            }
        }
    }
}

@Composable
private fun ConfirmNotebookDelete(
    title: String,
    saving: Boolean,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurface,
        title = { Text(title, color = TextPrimary) },
        text = { Text("Esta anotação será removida da biblioteca.", color = TextSecondary) },
        confirmButton = { TextButton(onClick = onConfirm, enabled = !saving) { Text("Excluir") } },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancelar") } },
    )
}
