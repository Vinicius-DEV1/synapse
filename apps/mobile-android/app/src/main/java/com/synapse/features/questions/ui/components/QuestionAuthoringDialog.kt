package com.synapse.features.questions.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.synapse.features.questions.model.QuizQuestion
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun QuestionAuthoringDialog(
    batteryTitle: String,
    question: QuizQuestion? = null,
    saving: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onCreate: (String, List<String>, Int, String, List<String>) -> Unit,
) {
    var prompt by remember(question) { mutableStateOf(question?.prompt.orEmpty()) }
    var explanation by remember(question) { mutableStateOf(question?.explanation.orEmpty()) }
    var tagsText by remember(question) { mutableStateOf(question?.tags?.joinToString(", ").orEmpty()) }
    val options = remember(question) {
        mutableStateListOf<String>().apply { addAll(question?.options ?: List(INITIAL_OPTION_COUNT) { "" }) }
    }
    var correctOption by remember(question) { mutableIntStateOf(question?.correctIndex ?: 0) }
    var validationError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = {
            Text("${if (question == null) "Nova questão" else "Editar questão"} · $batteryTitle", color = TextPrimary)
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = prompt,
                    onValueChange = { prompt = it; validationError = null },
                    label = { Text("Enunciado", color = TextSecondary) },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth(),
                )
                options.forEachIndexed { index, value ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(
                            selected = correctOption == index,
                            onClick = { correctOption = index },
                            enabled = value.isNotBlank(),
                        )
                        OutlinedTextField(
                            value = value,
                            onValueChange = { options[index] = it; validationError = null },
                            label = { Text("Alternativa ${index + 1}", color = TextSecondary) },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
                TextButton(onClick = { options.add("") }, enabled = !saving) {
                    Text("Adicionar alternativa")
                }
                Text("Marque a alternativa correta.", color = TextSecondary)
                OutlinedTextField(
                    value = explanation,
                    onValueChange = { explanation = it },
                    label = { Text("Explicação (opcional)", color = TextSecondary) },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = tagsText,
                    onValueChange = { tagsText = it },
                    label = { Text("Tags separadas por vírgula (opcional)", color = TextSecondary) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                (validationError ?: error)?.let { Text(it, color = IncorrectRoseText) }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val visibleIndices = options.indices.filter { options[it].isNotBlank() }
                    val answers = visibleIndices.map { options[it].trim() }
                    val correctIndex = visibleIndices.indexOf(correctOption)
                    when {
                        prompt.isBlank() -> validationError = "Informe o enunciado."
                        answers.size < MIN_OPTIONS -> validationError = "Informe pelo menos duas alternativas."
                        correctIndex < 0 -> validationError = "Marque uma alternativa correta preenchida."
                        else -> onCreate(
                            prompt.trim(), answers, correctIndex, explanation.trim(),
                            tagsText.split(',').map(String::trim).filter(String::isNotEmpty).distinct(),
                        )
                    }
                },
                enabled = !saving,
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = BrandIndigo),
            ) {
                if (saving) CircularProgressIndicator()
                else Text(if (question == null) "Criar questão" else "Salvar alterações")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancelar") }
        },
    )
}

private const val MIN_OPTIONS = 2
private const val INITIAL_OPTION_COUNT = 4
