package com.synapse.features.notes.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
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
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun CreateNoteDialog(
    saving: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onCreate: (String) -> Unit,
    parentTitle: String? = null,
) {
    var title by remember { mutableStateOf("") }
    var validationError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = { Text(if (parentTitle == null) "Nova nota" else "Nova subpágina", color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                parentTitle?.let { Text("Dentro de: $it", color = TextSecondary) }
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it; validationError = null },
                    label = { Text("Título", color = TextSecondary) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                (validationError ?: error)?.let { Text(it, color = IncorrectRoseText) }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isBlank()) validationError = "Informe o título da nota."
                    else onCreate(title.trim())
                },
                enabled = !saving,
            ) {
                if (saving) CircularProgressIndicator() else Text("Criar")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancelar") } },
    )
}
