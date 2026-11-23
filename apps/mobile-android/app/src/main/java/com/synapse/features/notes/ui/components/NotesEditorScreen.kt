package com.synapse.features.notes.ui.components

import android.text.Html
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.background
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.notes.model.NoteDocument
import com.synapse.features.settings.model.AndroidSettings
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun NotesEditorScreen(
    note: NoteDocument,
    settings: AndroidSettings,
    parentCandidates: List<com.synapse.features.notes.model.NoteSummary>,
    hierarchyMutationVersion: Long,
    saving: Boolean,
    dirty: Boolean,
    error: String?,
    onTitleChange: (String) -> Unit,
    onContentChange: (String) -> Unit,
    onSave: () -> Unit,
    onClose: () -> Unit,
    onTogglePin: () -> Unit,
    onCreateSubpage: (String) -> Unit,
    onMove: (String?) -> Unit,
    onDelete: () -> Unit,
) {
    var confirmDelete by remember(note.id) { mutableStateOf(false) }
    var showMoveDialog by remember(note.id) { mutableStateOf(false) }
    var showCreateSubpage by remember(note.id) { mutableStateOf(false) }
    var createSubpageOpenedAtVersion by remember(note.id) { mutableStateOf(hierarchyMutationVersion) }

    androidx.compose.runtime.LaunchedEffect(hierarchyMutationVersion) {
        if (hierarchyMutationVersion > createSubpageOpenedAtVersion) {
            showCreateSubpage = false
            createSubpageOpenedAtVersion = hierarchyMutationVersion
        }
    }
    val canEdit = note.editableAsPlainText && !note.isProtected && !note.isLocked
    val canRename = !note.isProtected && !note.isLocked
    val displayContent = if (canEdit) note.content else Html.fromHtml(note.content, Html.FROM_HTML_MODE_COMPACT).toString()

    Column(
        modifier = Modifier.fillMaxSize().background(DarkCanvas).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            IconButton(onClick = onClose, enabled = !saving) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar", tint = TextPrimary)
            }
            Text("${note.icon} ${note.title}", color = TextPrimary, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            IconButton(onClick = onTogglePin, enabled = !saving && !dirty && !note.isProtected) {
                Icon(Icons.Default.PushPin, contentDescription = "Fixar ou desafixar", tint = if (note.isPinned) BrandIndigo else TextSecondary)
            }
            IconButton(
                onClick = {
                    createSubpageOpenedAtVersion = hierarchyMutationVersion
                    showCreateSubpage = true
                },
                enabled = !saving && !dirty,
            ) {
                Icon(Icons.Default.Add, contentDescription = "Criar subpágina", tint = TextSecondary)
            }
            IconButton(onClick = { showMoveDialog = true }, enabled = !saving && !dirty) {
                Icon(Icons.Default.Folder, contentDescription = "Mover nota", tint = TextSecondary)
            }
            IconButton(onClick = { confirmDelete = true }, enabled = !saving) {
                Icon(Icons.Default.DeleteOutline, contentDescription = "Excluir nota", tint = IncorrectRoseText)
            }
        }

        if (note.isProtected || note.isLocked) {
            Surface(color = DarkSurfaceElevated, shape = RoundedCornerShape(12.dp)) {
                Text(
                    "O conteúdo desta nota está protegido. Abra-a em um cliente com a chave da conta para desbloquear.",
                    color = TextSecondary,
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                )
            }
        } else if (!canEdit) {
            Surface(color = DarkSurfaceElevated, shape = RoundedCornerShape(12.dp)) {
                Text(
                    "Este conteúdo usa formatação ou colaboração avançada. No Android ele fica em modo de leitura para preservar o original.",
                    color = TextSecondary,
                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                )
            }
        }

        if (canRename) {
            OutlinedTextField(
                value = note.title,
                onValueChange = onTitleChange,
                label = { Text("Título", color = TextSecondary) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                enabled = !saving,
                keyboardOptions = KeyboardOptions(autoCorrectEnabled = settings.spellcheck),
            )
        }
        if (canEdit) {
            OutlinedTextField(
                value = note.content,
                onValueChange = onContentChange,
                label = { Text("Conteúdo", color = TextSecondary) },
                modifier = Modifier.fillMaxWidth().weight(1f),
                enabled = !saving,
                textStyle = TextStyle(fontSize = settings.noteFontSize.points.sp),
                keyboardOptions = KeyboardOptions(autoCorrectEnabled = settings.spellcheck),
            )
        } else {
            Surface(
                modifier = Modifier.fillMaxWidth().weight(1f),
                color = DarkSurface,
                shape = RoundedCornerShape(12.dp),
            ) {
                SelectionContainer {
                    Text(
                        text = displayContent.ifBlank { "Esta nota ainda não tem conteúdo." },
                        fontSize = settings.noteFontSize.points.sp,
                        color = TextPrimary,
                        lineHeight = 22.sp,
                        modifier = Modifier.padding(20.dp),
                    )
                }
            }
        }

        Text("Atualizado em ${formatNoteUpdatedAt(note.updatedAt)}", color = TextMuted, fontSize = 12.sp)
        error?.let { Text(it, color = IncorrectRoseText) }
        if (canEdit || canRename) {
            Button(onClick = onSave, enabled = dirty && !saving, modifier = Modifier.fillMaxWidth()) {
                if (saving) CircularProgressIndicator() else Text(if (dirty) "Salvar alterações" else "Salvo")
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { if (!saving) confirmDelete = false },
            containerColor = DarkSurfaceElevated,
            title = { Text("Excluir esta nota?", color = TextPrimary) },
            text = { Text("A nota e suas subpáginas serão movidas para a Lixeira.", color = TextSecondary) },
            confirmButton = {
                Button(
                    onClick = {
                        onDelete()
                        confirmDelete = false
                    },
                    enabled = !saving,
                ) { Text("Excluir") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }, enabled = !saving) { Text("Cancelar") } },
        )
    }

    if (showMoveDialog) {
        MoveNoteDialog(
            note = note,
            parentCandidates = parentCandidates,
            saving = saving,
            dirty = dirty,
            error = error,
            mutationVersion = hierarchyMutationVersion,
            onMove = onMove,
            onDismiss = { showMoveDialog = false },
        )
    }

    if (showCreateSubpage) {
        CreateNoteDialog(
            saving = saving,
            error = error,
            onDismiss = { if (!saving) showCreateSubpage = false },
            onCreate = onCreateSubpage,
            parentTitle = note.title,
        )
    }
}
