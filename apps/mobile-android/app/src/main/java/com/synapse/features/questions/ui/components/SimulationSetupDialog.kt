package com.synapse.features.questions.ui.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun SimulationSetupDialog(
    tags: List<String>,
    saving: Boolean,
    onDismiss: () -> Unit,
    onStart: (List<String>, String, Int, Boolean) -> Unit,
) {
    var status by remember { mutableStateOf(STATUS_ALL) }
    var selectedTags by remember { mutableStateOf<Set<String>>(emptySet()) }
    var questionLimit by remember { mutableIntStateOf(DEFAULT_LIMIT) }
    var shuffle by remember { mutableStateOf(true) }

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        title = { Text("Configurar simulado", color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text("Situação", color = TextSecondary)
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    StatusChip("Todas", STATUS_ALL, status) { status = it }
                    StatusChip("Não respondidas", STATUS_UNANSWERED, status) { status = it }
                    StatusChip("Erros", STATUS_INCORRECT, status) { status = it }
                }
                Text("Assunto", color = TextSecondary)
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    FilterChip(selected = selectedTags.isEmpty(), onClick = { selectedTags = emptySet() }, label = { Text("Todos") })
                    tags.forEach { tag ->
                        FilterChip(
                            selected = tag in selectedTags,
                            onClick = {
                                selectedTags = if (tag in selectedTags) selectedTags - tag else selectedTags + tag
                            },
                            label = { Text(tag) },
                        )
                    }
                }
                Text("Quantidade máxima", color = TextSecondary)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    QUESTION_LIMITS.forEach { limit ->
                        FilterChip(
                            selected = questionLimit == limit,
                            onClick = { questionLimit = limit },
                            label = { Text(limit.toString()) },
                        )
                    }
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                ) {
                    Text("Embaralhar questões", color = TextSecondary)
                    Switch(checked = shuffle, onCheckedChange = { shuffle = it })
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onStart(selectedTags.toList(), status, questionLimit, shuffle) },
                enabled = !saving,
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = BrandIndigo),
            ) { Text("Iniciar") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !saving) { Text("Cancelar") }
        },
    )
}

@Composable
private fun StatusChip(label: String, value: String, selected: String, onSelected: (String) -> Unit) {
    FilterChip(selected = selected == value, onClick = { onSelected(value) }, label = { Text(label) })
}

private const val STATUS_ALL = "all"
private const val STATUS_UNANSWERED = "unanswered"
private const val STATUS_INCORRECT = "incorrect"
private const val DEFAULT_LIMIT = 10
private val QUESTION_LIMITS = listOf(5, 10, 20, 30, 50)
