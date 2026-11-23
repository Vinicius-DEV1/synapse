package com.synapse.features.notes.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.background
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.notes.model.NotesUiState
import com.synapse.features.notes.model.NoteSummary
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun NotesLibraryScreen(
    state: NotesUiState,
    onSearch: (String) -> Unit,
    onRefresh: () -> Unit,
    onOpenNote: (String) -> Unit,
    onCreateNote: (String) -> Unit,
    onReorderSiblings: (String?, List<String>) -> Unit,
) {
    var showCreateDialog by remember { mutableStateOf(false) }
    var showHierarchy by remember { mutableStateOf(false) }
    var collapsedBranches by remember { mutableStateOf(emptySet<String>()) }
    val pinned = remember(state.notes) { state.notes.filter { it.isPinned } }
    val others = remember(state.notes) { state.notes.filterNot { it.isPinned } }
    val visibleTree = remember(state.treeNotes, collapsedBranches) {
        visibleHierarchy(state.treeNotes, collapsedBranches)
    }
    val siblingsByParent = remember(state.treeNotes) { state.treeNotes.groupBy(NoteSummary::parentId) }

    Column(
        modifier = Modifier.fillMaxSize().background(DarkCanvas).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("📝 Caderno & Notas", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        OutlinedTextField(
            value = state.searchQuery,
            onValueChange = onSearch,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Buscar notas pelo título...", color = TextMuted) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Buscar", tint = TextSecondary) },
            shape = RoundedCornerShape(10.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = BrandIndigo,
                unfocusedBorderColor = DarkBorder,
                focusedContainerColor = DarkSurface,
                unfocusedContainerColor = DarkSurface,
            ),
            singleLine = true,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = { showCreateDialog = true },
                enabled = !state.saving,
                modifier = Modifier.weight(1f),
            ) { Text("Nova nota") }
            OutlinedButton(
                onClick = { showHierarchy = !showHierarchy },
                enabled = !state.loading,
            ) { Text(if (showHierarchy) "Lista" else "Hierarquia") }
        }
        state.error?.let { message ->
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(message, color = IncorrectRoseText)
                OutlinedButton(onClick = onRefresh, enabled = !state.loading) { Text("Tentar novamente") }
            }
        }
        if (state.loading && state.notes.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxWidth().weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) { CircularProgressIndicator(color = BrandIndigo) }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (state.notes.isEmpty()) item {
                    Text(
                        if (state.searchQuery.isBlank()) "Nenhuma nota disponível neste dispositivo."
                        else "Nenhuma nota corresponde à busca.",
                        color = TextMuted,
                        modifier = Modifier.fillMaxWidth().padding(top = 32.dp),
                    )
                }
                if (showHierarchy) {
                    item { SectionTitle("HIERARQUIA", BrandIndigo) }
                    items(visibleTree, key = NoteSummary::id) { note ->
                        val siblings = siblingsByParent[note.parentId].orEmpty().map(NoteSummary::id)
                        val siblingIndex = siblings.indexOf(note.id)
                        NoteCard(
                            note = note,
                            showTreeControls = true,
                            expanded = note.id !in collapsedBranches,
                            saving = state.saving,
                            canMoveUp = state.searchQuery.isBlank() && siblingIndex > 0,
                            canMoveDown = state.searchQuery.isBlank() &&
                                siblingIndex >= 0 && siblingIndex < siblings.lastIndex,
                            onToggleExpanded = {
                                collapsedBranches = if (note.id in collapsedBranches) {
                                    collapsedBranches - note.id
                                } else {
                                    collapsedBranches + note.id
                                }
                            },
                            onMoveUp = {
                                reorderedSiblings(siblings, siblingIndex, -1)?.let {
                                    onReorderSiblings(note.parentId, it)
                                }
                            },
                            onMoveDown = {
                                reorderedSiblings(siblings, siblingIndex, 1)?.let {
                                    onReorderSiblings(note.parentId, it)
                                }
                            },
                        ) { onOpenNote(note.id) }
                    }
                } else if (pinned.isNotEmpty()) {
                    item { SectionTitle("FIXADAS", BrandIndigo) }
                    items(pinned, key = { it.id }) { note -> NoteCard(note) { onOpenNote(note.id) } }
                }
                if (others.isNotEmpty()) {
                    item {
                        Spacer(Modifier.height(8.dp))
                        SectionTitle("TODAS AS NOTAS", TextMuted)
                    }
                    items(others, key = { it.id }) { note -> NoteCard(note) { onOpenNote(note.id) } }
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateNoteDialog(
            saving = state.saving,
            error = state.error,
            onDismiss = { if (!state.saving) showCreateDialog = false },
            onCreate = onCreateNote,
        )
    }
}

@Composable
private fun SectionTitle(text: String, color: androidx.compose.ui.graphics.Color) {
    Text(text, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = color, letterSpacing = 1.sp)
}

private fun visibleHierarchy(
    notes: List<NoteSummary>,
    collapsedBranches: Set<String>,
): List<NoteSummary> {
    val collapsedAncestors = mutableListOf<Int>()
    val visible = mutableListOf<NoteSummary>()
    notes.forEach { note ->
        while (collapsedAncestors.lastOrNull()?.let { it >= note.depth } == true) {
            collapsedAncestors.removeAt(collapsedAncestors.lastIndex)
        }
        val isHidden = collapsedAncestors.isNotEmpty()
        if (!isHidden) {
            visible.add(note)
            if (note.hasChildren && note.id in collapsedBranches) collapsedAncestors.add(note.depth)
        }
    }
    return visible
}

private fun reorderedSiblings(siblings: List<String>, index: Int, offset: Int): List<String>? {
    val destination = index + offset
    if (index !in siblings.indices || destination !in siblings.indices) return null
    return siblings.toMutableList().also { reordered ->
        val item = reordered[index]
        reordered[index] = reordered[destination]
        reordered[destination] = item
    }
}
