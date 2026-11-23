package com.synapse.features.questions.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.questions.model.QuestionsUiState
import com.synapse.features.questions.model.QuizBattery
import com.synapse.features.questions.model.QuizQuestion
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun QuestionsLibraryScreen(
    state: QuestionsUiState,
    onRefresh: () -> Unit,
    onStartBattery: (QuizBattery) -> Unit,
    onStartSimulation: (List<String>, String, Int, Boolean) -> Unit,
    onStartErrorNotebook: () -> Unit,
    onShowAttemptHistory: () -> Unit,
    onCreateBattery: (String, String) -> Unit,
    onUpdateBattery: (String, String, String) -> Unit,
    onDeleteBattery: (String) -> Unit,
    onManageQuestions: (QuizBattery) -> Unit,
    onCloseQuestionManager: () -> Unit,
    onShowQuestionHistory: (QuizQuestion) -> Unit,
    onCreateQuestion: (String, String, List<String>, Int, String, List<String>) -> Unit,
    onUpdateQuestion: (String, String, List<String>, Int, String, List<String>) -> Unit,
    onDeleteQuestion: (String) -> Unit,
) {
    var showBatteryDialog by remember { mutableStateOf(false) }
    var showSimulationDialog by remember { mutableStateOf(false) }
    var batteryToEdit by remember { mutableStateOf<QuizBattery?>(null) }
    var batteryToDelete by remember { mutableStateOf<QuizBattery?>(null) }
    var questionBattery by remember { mutableStateOf<QuizBattery?>(null) }
    var editingQuestion by remember { mutableStateOf<QuizQuestion?>(null) }
    var closeDialogAfterSave by remember { mutableStateOf(false) }
    var saveStarted by remember { mutableStateOf(false) }

    LaunchedEffect(state.saving, state.error) {
        if (closeDialogAfterSave && state.saving) saveStarted = true
        if (closeDialogAfterSave && saveStarted && !state.saving) {
            if (state.error == null) {
                showBatteryDialog = false
                batteryToEdit = null
                questionBattery = null
                editingQuestion = null
            }
            closeDialogAfterSave = false
            saveStarted = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        Spacer(Modifier.height(18.dp))
        QuestionsLibraryHeader()

        state.error?.let { message ->
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            ) {
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(message, color = TextPrimary)
                    OutlinedButton(onClick = onRefresh, enabled = !state.loading) { Text("Tentar novamente") }
                }
            }
        }

        state.stats?.let { stats ->
            QuestionStatsCard(stats, onShowAttemptHistory)
        }

        Button(
            onClick = {
                batteryToEdit = null
                showBatteryDialog = true
            },
            enabled = !state.loading && !state.loadingQuestions && !state.saving,
            colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = BrandIndigo),
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        ) { Text("Nova bateria") }

        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Button(
                onClick = { showSimulationDialog = true },
                enabled = !state.loading && !state.loadingQuestions && !state.saving,
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = BrandIndigo),
                modifier = Modifier.weight(1f),
            ) { Text("Simulado") }
            OutlinedButton(
                onClick = onStartErrorNotebook,
                enabled = !state.loading && !state.loadingQuestions && !state.saving &&
                    (state.stats?.reviewableIncorrectQuestions ?: 0) > 0,
                modifier = Modifier.weight(1f),
            ) { Text("Caderno de erros") }
        }

        Text(
            "Baterias",
            color = TextPrimary,
            fontSize = 17.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(top = 20.dp, bottom = 8.dp),
        )

        when {
            state.loading || state.loadingQuestions -> Column(
                modifier = Modifier.fillMaxWidth().weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) { CircularProgressIndicator(color = BrandIndigo) }
            state.batteries.isEmpty() -> Column(
                modifier = Modifier.fillMaxWidth().weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text("Nenhuma bateria de questões disponível.", color = TextSecondary)
                OutlinedButton(onClick = onRefresh, modifier = Modifier.padding(top = 8.dp)) {
                    Text("Atualizar")
                }
            }
            else -> LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(state.batteries, key = QuizBattery::id) { battery ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = DarkSurface),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Text(battery.title, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                            battery.description?.takeIf(String::isNotBlank)?.let {
                                Text(it, color = TextSecondary, fontSize = 13.sp)
                            }
                            Text("${battery.questionCount} questões", color = TextSecondary, fontSize = 12.sp)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = { onStartBattery(battery) },
                                    enabled = battery.questionCount > 0 && !state.loading && !state.loadingQuestions && !state.saving,
                                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = BrandIndigo),
                                ) { Text("Estudar") }
                                OutlinedButton(
                                    onClick = { questionBattery = battery },
                                    enabled = !state.loading && !state.loadingQuestions && !state.saving,
                                ) { Text("Nova questão") }
                                OutlinedButton(
                                    onClick = { onManageQuestions(battery) },
                                    enabled = !state.loading && !state.loadingQuestions && !state.saving,
                                ) { Text("Gerenciar") }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = {
                                        batteryToEdit = battery
                                        showBatteryDialog = true
                                    },
                                    enabled = !state.loading && !state.loadingQuestions && !state.saving,
                                ) { Text("Editar bateria") }
                                TextButton(
                                    onClick = { batteryToDelete = battery },
                                    enabled = !state.loading && !state.loadingQuestions && !state.saving,
                                ) { Text("Excluir", color = com.synapse.ui.theme.IncorrectRoseText) }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showBatteryDialog) {
        BatteryAuthoringDialog(
            battery = batteryToEdit,
            saving = state.saving,
            error = state.error,
            onDismiss = { if (!state.saving) showBatteryDialog = false },
            onSave = { battery, title, description ->
                closeDialogAfterSave = true
                if (battery == null) onCreateBattery(title, description)
                else onUpdateBattery(battery.id, title, description)
            },
        )
    }
    if (showSimulationDialog) {
        SimulationSetupDialog(
            tags = state.availableTags,
            saving = state.loadingQuestions || state.saving,
            onDismiss = { showSimulationDialog = false },
            onStart = { tags, status, limit, shuffle ->
                showSimulationDialog = false
                onStartSimulation(tags, status, limit, shuffle)
            },
        )
    }
    state.selectedManagedBattery?.let { battery ->
        QuestionManagementDialog(
            batteryTitle = battery.title,
            questions = state.managedQuestions,
            loading = state.loadingManagedQuestions,
            saving = state.saving,
            error = state.error,
            onDismiss = onCloseQuestionManager,
            onEdit = { editingQuestion = it },
            onShowHistory = onShowQuestionHistory,
            onDelete = { onDeleteQuestion(it.id) },
        )
    }
    val authoringBattery = questionBattery ?: state.selectedManagedBattery.takeIf { editingQuestion != null }
    authoringBattery?.let { battery ->
        QuestionAuthoringDialog(
            batteryTitle = battery.title,
            question = editingQuestion,
            saving = state.saving,
            error = state.error,
            onDismiss = {
                if (!state.saving) {
                    questionBattery = null
                    editingQuestion = null
                }
            },
            onCreate = { prompt, options, correctIndex, explanation, tags ->
                closeDialogAfterSave = true
                val existingQuestion = editingQuestion
                if (existingQuestion == null) {
                    onCreateQuestion(battery.id, prompt, options, correctIndex, explanation, tags)
                } else {
                    onUpdateQuestion(existingQuestion.id, prompt, options, correctIndex, explanation, tags)
                }
            },
        )
    }
    batteryToDelete?.let { battery ->
        AlertDialog(
            onDismissRequest = { if (!state.saving) batteryToDelete = null },
            containerColor = DarkSurface,
            title = { Text("Excluir bateria?", color = TextPrimary) },
            text = {
                Text(
                    "A bateria e suas questões sairão do estudo. Você poderá restaurar a bateria pela Lixeira.",
                    color = TextSecondary,
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onDeleteBattery(battery.id)
                        batteryToDelete = null
                    },
                    enabled = !state.saving,
                ) { Text("Excluir") }
            },
            dismissButton = {
                TextButton(onClick = { batteryToDelete = null }, enabled = !state.saving) {
                    Text("Cancelar")
                }
            },
        )
    }
}
