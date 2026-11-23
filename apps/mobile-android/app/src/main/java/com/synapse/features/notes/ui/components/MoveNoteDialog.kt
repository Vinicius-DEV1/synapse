package com.synapse.features.notes.ui.components

import androidx.compose.foundation.clickable
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
import androidx.compose.material3.RadioButton
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
import com.synapse.features.notes.model.NoteDocument
import com.synapse.features.notes.model.NoteSummary
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun MoveNoteDialog(
    note: NoteDocument,
    parentCandidates: List<NoteSummary>,
    saving: Boolean,
    dirty: Boolean,
    error: String?,
    mutationVersion: Long,
    onMove: (String?) -> Unit,
    onDismiss: () -> Unit,
) {
    var selectedParentId by remember(note.id) { mutableStateOf(note.parentId) }
    var openedAtVersion by remember(note.id) { mutableLongStateOf(mutationVersion) }

    LaunchedEffect(mutationVersion) {
        if (mutationVersion > openedAtVersion) {
            openedAtVersion = mutationVersion
            onDismiss()
        }
    }

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurface,
        title = { Text("Mover nota", color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Escolha a página que será a nova página-mãe.", color = TextSecondary)
                ParentChoice(
                    title = "Nível principal",
                    selected = selectedParentId == null,
                    enabled = !saving,
                    onClick = { selectedParentId = null },
                )
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 340.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    items(parentCandidates.filterNot { it.id == note.id }, key = NoteSummary::id) { parent ->
                        ParentChoice(
                            title = "${parent.icon} ${parent.title}",
                            selected = selectedParentId == parent.id,
                            enabled = !saving,
                            onClick = { selectedParentId = parent.id },
                        )
                    }
                }
                error?.let { Text(it, color = TextSecondary) }
            }
        },
        confirmButton = {
            Button(
                onClick = { onMove(selectedParentId) },
                enabled = !saving && !dirty && selectedParentId != note.parentId,
            ) { Text(if (saving) "Movendo…" else "Mover") }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancelar") } },
    )
}

@Composable
private fun ParentChoice(title: String, selected: Boolean, enabled: Boolean, onClick: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = DarkSurface.copy(alpha = 0.72f)),
        modifier = Modifier.fillMaxWidth().clickable(enabled = enabled, onClick = onClick),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            RadioButton(selected = selected, onClick = onClick, enabled = enabled)
            Text(title, color = TextPrimary, modifier = Modifier.weight(1f))
        }
    }
}
