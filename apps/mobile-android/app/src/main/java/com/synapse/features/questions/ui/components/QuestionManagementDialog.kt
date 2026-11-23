package com.synapse.features.questions.ui.components

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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.synapse.features.questions.model.QuizQuestion
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun QuestionManagementDialog(
    batteryTitle: String,
    questions: List<QuizQuestion>,
    loading: Boolean,
    saving: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onEdit: (QuizQuestion) -> Unit,
    onShowHistory: (QuizQuestion) -> Unit,
    onDelete: (QuizQuestion) -> Unit,
) {
    var pendingDelete by remember { mutableStateOf<QuizQuestion?>(null) }

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = { Text("Questões · $batteryTitle", color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                error?.let { Text(it, color = IncorrectRoseText) }
                when {
                    loading -> CircularProgressIndicator()
                    questions.isEmpty() -> Text("Esta bateria ainda não tem questões.", color = TextSecondary)
                    else -> LazyColumn(
                        modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(questions, key = QuizQuestion::id) { question ->
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(10.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                Text(question.prompt, color = TextPrimary, fontWeight = FontWeight.Medium)
                                question.tags.takeIf { it.isNotEmpty() }?.let { tags ->
                                    Text(tags.joinToString(" · ") { "#$it" }, color = TextSecondary)
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    if (question.type == MULTIPLE_CHOICE_TYPE) {
                                        OutlinedButton(onClick = { onEdit(question) }, enabled = !saving) {
                                            Text("Editar")
                                        }
                                    }
                                    TextButton(onClick = { onShowHistory(question) }, enabled = !saving) {
                                        Text("Histórico")
                                    }
                                    TextButton(onClick = { pendingDelete = question }, enabled = !saving) {
                                        Text("Excluir", color = IncorrectRoseText)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = { Button(onClick = onDismiss, enabled = !saving) { Text("Concluir") } },
    )

    pendingDelete?.let { question ->
        AlertDialog(
            onDismissRequest = { if (!saving) pendingDelete = null },
            containerColor = DarkSurface,
            title = { Text("Excluir questão?", color = TextPrimary) },
            text = {
                Text(
                    "A questão será removida da bateria. As tentativas já registradas serão preservadas.",
                    color = TextSecondary,
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onDelete(question)
                        pendingDelete = null
                    },
                    enabled = !saving,
                ) { Text("Excluir") }
            },
            dismissButton = {
                TextButton(onClick = { pendingDelete = null }, enabled = !saving) { Text("Cancelar") }
            },
        )
    }
}

private const val MULTIPLE_CHOICE_TYPE = "multiple_choice"
