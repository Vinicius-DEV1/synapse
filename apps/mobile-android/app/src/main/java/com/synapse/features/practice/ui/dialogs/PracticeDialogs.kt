package com.synapse.features.practice.ui.dialogs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary

@Composable
fun CreatePracticeSessionDialog(onDismiss: () -> Unit, onCreate: (String) -> Unit) {
    var title by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nova sessão", color = TextPrimary) },
        text = {
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Título") },
                singleLine = true,
                colors = practiceFieldColors(),
            )
        },
        confirmButton = {
            Button(onClick = { onCreate(title.trim()) }, enabled = title.isNotBlank()) {
                Text("Criar")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
        containerColor = DarkSurfaceElevated,
    )
}

@Composable
fun CreatePracticeMemoryDialog(onDismiss: () -> Unit, onCreate: (String, String) -> Unit) {
    var category by remember { mutableStateOf("") }
    var fact by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nova memória", color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = category,
                    onValueChange = { category = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Categoria") },
                    singleLine = true,
                    colors = practiceFieldColors(),
                )
                OutlinedTextField(
                    value = fact,
                    onValueChange = { fact = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Informação") },
                    colors = practiceFieldColors(),
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onCreate(category.trim(), fact.trim()) },
                enabled = category.isNotBlank() && fact.isNotBlank(),
            ) { Text("Salvar") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
        containerColor = DarkSurfaceElevated,
    )
}

@Composable
fun ConfirmPracticeDeleteDialog(
    title: String,
    description: String,
    enabled: Boolean = true,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, color = TextPrimary) },
        text = { Text(description, color = TextMuted) },
        confirmButton = {
            TextButton(onClick = onConfirm, enabled = enabled) { Text("Excluir", color = IncorrectRoseText) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
        containerColor = DarkSurfaceElevated,
    )
}

@Composable
private fun practiceFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = BrandIndigo,
    unfocusedBorderColor = TextMuted.copy(alpha = 0.4f),
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedContainerColor = DarkSurface,
    unfocusedContainerColor = DarkSurface,
)
