package com.synapse.features.practice.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.practice.model.PracticeMemory
import com.synapse.features.practice.model.PracticeSession
import com.synapse.features.practice.viewmodel.PracticeUiState
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextSecondary

@Composable
fun PracticeSessionList(
    sessions: List<PracticeSession>,
    saving: Boolean,
    onSelect: (String) -> Unit,
    onDelete: (PracticeSession) -> Unit,
) {
    if (sessions.isEmpty()) {
        Text("Nenhuma sessão salva ainda.", color = TextMuted, modifier = Modifier.padding(top = 24.dp))
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(top = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(sessions, key = { it.id }) { session ->
                PracticeSessionCard(session, false, !saving, { onSelect(session.id) }, { onDelete(session) })
            }
        }
    }
}

@Composable
fun PracticeMemoryList(memories: List<PracticeMemory>, saving: Boolean, onDelete: (PracticeMemory) -> Unit) {
    if (memories.isEmpty()) {
        Text("Nenhuma memória salva ainda.", color = TextMuted, modifier = Modifier.padding(top = 24.dp))
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(top = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(memories, key = { it.id }) { memory ->
                PracticeMemoryCard(memory, !saving) { onDelete(memory) }
            }
        }
    }
}

@Composable
fun PracticeSessionDetail(
    state: PracticeUiState,
    noteText: String,
    onNoteChange: (String) -> Unit,
    onSaveNote: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            "O chat com IA ainda não está conectado no Android. Você pode consultar a transcrição e salvar notas nesta sessão.",
            color = TextSecondary,
            fontSize = 12.sp,
            modifier = Modifier.padding(vertical = 12.dp),
        )
        if (state.messages.isEmpty() && !state.loadingMessages && state.error == null) {
            Text("Esta sessão ainda não tem mensagens.", color = TextMuted, modifier = Modifier.padding(bottom = 12.dp))
        }
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(state.messages, key = { it.id }) { message -> PracticeMessageCard(message) }
        }
        OutlinedTextField(
            value = noteText,
            onValueChange = onNoteChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Anotar nesta sessão") },
            enabled = !state.saving && !state.loading && !state.loadingMessages,
        )
        Button(
            onClick = onSaveNote,
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 12.dp),
            enabled = noteText.isNotBlank() && !state.saving && !state.loading && !state.loadingMessages,
        ) { Text("Salvar nota") }
    }
}
