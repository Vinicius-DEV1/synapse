package com.synapse.features.culture.ui.dialogs

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.synapse.features.culture.model.CultureMediaItem
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRose
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun ConfirmCultureDeleteDialog(
    item: CultureMediaItem,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!isSaving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = { Text("Mover para a lixeira?", color = TextPrimary) },
        text = {
            Text(
                "${item.title} será removido do catálogo e poderá ser recuperado pela lixeira.",
                color = TextSecondary,
            )
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                enabled = !isSaving,
                colors = ButtonDefaults.buttonColors(containerColor = IncorrectRose),
            ) {
                if (isSaving) {
                    CircularProgressIndicator(color = Color.White)
                } else {
                    Text("Mover para a lixeira", color = Color.White)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSaving) { Text("Cancelar", color = TextSecondary) }
        },
    )
}
