package com.synapse.features.habits.ui.dialogs

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight

@Composable
fun CreateHabitDialog(
    name: String,
    category: String,
    onNameChange: (String) -> Unit,
    onCategoryChange: (String) -> Unit,
    isSaving: Boolean,
    errorMessage: String?,
    onDismiss: () -> Unit,
    onCreate: () -> Unit
) {
    AlertDialog(
        onDismissRequest = { if (!isSaving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = {
            Text("Novo Hábito", color = TextPrimary, fontWeight = FontWeight.Bold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = onNameChange,
                    enabled = !isSaving,
                    label = { Text("Nome do Hábito", color = TextSecondary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = BrandIndigo,
                        unfocusedBorderColor = DarkBorder
                    )
                )
                OutlinedTextField(
                    value = category,
                    onValueChange = onCategoryChange,
                    enabled = !isSaving,
                    label = { Text("Categoria", color = TextSecondary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = BrandIndigo,
                        unfocusedBorderColor = DarkBorder
                    )
                )
                errorMessage?.let { Text(it, color = com.synapse.ui.theme.IncorrectRoseText) }
            }
        },
        confirmButton = {
            Button(
                onClick = onCreate,
                enabled = name.isNotBlank() && !isSaving,
                colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo)
            ) {
                if (isSaving) CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp)
                else Text("Criar", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSaving) {
                Text("Cancelar", color = TextSecondary)
            }
        }
    )
}
