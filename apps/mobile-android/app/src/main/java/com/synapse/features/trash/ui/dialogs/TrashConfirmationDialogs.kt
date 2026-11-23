package com.synapse.features.trash.ui.dialogs

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontWeight
import com.synapse.features.trash.model.TrashedItem
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRose
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun DeleteTrashedItemDialog(
    item: TrashedItem,
    saving: Boolean,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = { Text("Excluir definitivamente?", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = { Text("\"${item.title}\" será apagado permanentemente. Esta ação não pode ser desfeita.", color = TextSecondary) },
        confirmButton = {
            Button(
                onClick = onConfirm,
                enabled = !saving,
                colors = ButtonDefaults.buttonColors(containerColor = IncorrectRose),
            ) { Text("Excluir", fontWeight = FontWeight.Bold) }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancelar", color = TextSecondary) } },
    )
}

@Composable
fun EmptyTrashDialog(
    itemCount: Int,
    saving: Boolean,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = { Text("Esvaziar Lixeira?", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            Text("Os $itemCount itens serão apagados permanentemente do armazenamento local. Esta ação não pode ser desfeita.", color = TextSecondary)
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                enabled = !saving,
                colors = ButtonDefaults.buttonColors(containerColor = IncorrectRose),
            ) { Text(if (saving) "Excluindo…" else "Esvaziar", fontWeight = FontWeight.Bold) }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancelar", color = TextSecondary) } },
    )
}
