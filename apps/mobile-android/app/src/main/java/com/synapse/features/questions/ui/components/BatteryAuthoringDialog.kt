package com.synapse.features.questions.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.ui.unit.dp
import com.synapse.features.questions.model.QuizBattery
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun BatteryAuthoringDialog(
    battery: QuizBattery? = null,
    saving: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onSave: (QuizBattery?, String, String) -> Unit,
) {
    var title by remember(battery) { mutableStateOf(battery?.title.orEmpty()) }
    var description by remember(battery) { mutableStateOf(battery?.description.orEmpty()) }
    var validationError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = { Text(if (battery == null) "Nova bateria" else "Editar bateria", color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it; validationError = null },
                    label = { Text("Título", color = TextSecondary) },
                    singleLine = true,
                )
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Descrição (opcional)", color = TextSecondary) },
                )
                (validationError ?: error)?.let { Text(it, color = IncorrectRoseText) }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isBlank()) validationError = "Informe o título da bateria."
                    else onSave(battery, title.trim(), description.trim())
                },
                enabled = !saving,
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = BrandIndigo),
            ) {
                if (saving) CircularProgressIndicator()
                else Text(if (battery == null) "Criar" else "Salvar alterações")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancelar") }
        },
    )
}
