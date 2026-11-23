package com.synapse.features.diagrams.ui.dialogs

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import com.synapse.R
import com.synapse.features.diagrams.model.DiagramItem
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRose
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun DeleteDiagramDialog(
    item: DiagramItem,
    saving: Boolean,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = {
            Text(stringResource(R.string.diagrams_delete_title), color = TextPrimary, fontWeight = FontWeight.Bold)
        },
        text = {
            Text(stringResource(R.string.diagrams_delete_prompt, item.title), color = TextSecondary)
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                enabled = !saving,
                colors = ButtonDefaults.buttonColors(containerColor = IncorrectRose),
            ) {
                Text(stringResource(if (saving) R.string.diagrams_deleting else R.string.diagrams_delete))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !saving) {
                Text(stringResource(R.string.diagrams_cancel), color = TextSecondary)
            }
        },
    )
}
