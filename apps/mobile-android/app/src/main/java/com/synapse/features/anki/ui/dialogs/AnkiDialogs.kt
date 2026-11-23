package com.synapse.features.anki.ui.dialogs

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.synapse.features.anki.model.AnkiDeckSettings

@Composable
fun AnkiDeckDialog(
    parentName: String?,
    saving: Boolean,
    onDismiss: () -> Unit,
    onCreate: (String) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (parentName == null) "Novo baralho" else "Novo subbaralho") },
        text = {
            Column {
                if (parentName != null) Text("Dentro de $parentName")
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nome") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onCreate(name.trim()) }, enabled = name.isNotBlank() && !saving) {
                Text(if (saving) "Salvando…" else "Criar")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancelar") } },
    )
}

@Composable
fun AnkiCardDialog(
    title: String,
    initialFront: String = "",
    initialBack: String = "",
    initialTags: String = "",
    saving: Boolean,
    onDismiss: () -> Unit,
    onSave: (front: String, back: String, tags: String) -> Unit,
) {
    var front by remember(title, initialFront) { mutableStateOf(initialFront) }
    var back by remember(title, initialBack) { mutableStateOf(initialBack) }
    var tags by remember(title, initialTags) { mutableStateOf(initialTags) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column {
                OutlinedTextField(
                    value = front,
                    onValueChange = { front = it },
                    label = { Text("Frente") },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = back,
                    onValueChange = { back = it },
                    label = { Text("Verso") },
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
                OutlinedTextField(
                    value = tags,
                    onValueChange = { tags = it },
                    label = { Text("Tags (opcional)") },
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onSave(front.trim(), back, tags.trim()) },
                enabled = front.isNotBlank() && !saving,
            ) { Text(if (saving) "Salvando…" else "Salvar") }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancelar") } },
    )
}

@Composable
fun ConfirmAnkiDeleteDialog(
    title: String,
    description: String,
    saving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Text(description) },
        confirmButton = {
            TextButton(onClick = onConfirm, enabled = !saving) {
                Text(if (saving) "Excluindo…" else "Excluir")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancelar") } },
    )
}

@Composable
fun AnkiSettingsDialog(
    settings: AnkiDeckSettings?,
    loading: Boolean,
    saving: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onSave: (newLimit: Int, reviewLimit: Int) -> Unit,
    onResetProgress: () -> Unit,
    onRetry: () -> Unit,
) {
    var newLimit by remember(settings) { mutableStateOf(settings?.newLimit?.toString().orEmpty()) }
    var reviewLimit by remember(settings) { mutableStateOf(settings?.reviewLimit?.toString().orEmpty()) }
    val parsedNewLimit = newLimit.toIntOrNull()?.takeIf { it >= 0 }
    val parsedReviewLimit = reviewLimit.toIntOrNull()?.takeIf { it >= 0 }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Configurações do baralho") },
        text = {
            if (error != null) {
                Column {
                    Text(error)
                    TextButton(onClick = onRetry, enabled = !loading) { Text("Tentar novamente") }
                }
            } else if (loading || settings == null) {
                Text("Carregando configurações…")
            } else {
                Column {
                    OutlinedTextField(
                        value = newLimit,
                        onValueChange = { newLimit = it.filter { character -> character.isDigit() } },
                        label = { Text("Limite diário de novos") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = reviewLimit,
                        onValueChange = { reviewLimit = it.filter { character -> character.isDigit() } },
                        label = { Text("Limite diário de revisão") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    )
                    if (settings.fsrsWeights != null) {
                        Text("Este baralho tem pesos FSRS personalizados.", modifier = Modifier.padding(top = 10.dp))
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onSave(checkNotNull(parsedNewLimit), checkNotNull(parsedReviewLimit)) },
                enabled = settings != null && !loading && !saving && parsedNewLimit != null && parsedReviewLimit != null,
            ) { Text(if (saving) "Salvando…" else "Salvar") }
        },
        dismissButton = {
            Column {
                TextButton(onClick = onResetProgress, enabled = settings != null && !loading && !saving) {
                    Text("Resetar progresso")
                }
                TextButton(onClick = onDismiss, enabled = !saving) { Text("Fechar") }
            }
        },
    )
}
