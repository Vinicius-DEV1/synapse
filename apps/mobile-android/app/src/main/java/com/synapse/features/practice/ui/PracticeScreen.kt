package com.synapse.features.practice.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.synapse.features.practice.model.PracticeMemory
import com.synapse.features.practice.model.PracticeSession
import com.synapse.features.practice.ui.components.PracticeMemoryList
import com.synapse.features.practice.ui.components.PracticeSessionDetail
import com.synapse.features.practice.ui.components.PracticeSessionList
import com.synapse.features.practice.ui.dialogs.ConfirmPracticeDeleteDialog
import com.synapse.features.practice.ui.dialogs.CreatePracticeMemoryDialog
import com.synapse.features.practice.ui.dialogs.CreatePracticeSessionDialog
import com.synapse.features.practice.viewmodel.PracticeViewModel
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun PracticeScreen() {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = PracticeViewModel(context) as T
        }
    }
    val viewModel: PracticeViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    var selectedTab by rememberSaveable { mutableStateOf(0) }
    var showSessionDialog by remember { mutableStateOf(false) }
    var showMemoryDialog by remember { mutableStateOf(false) }
    var pendingSessionDelete by remember { mutableStateOf<PracticeSession?>(null) }
    var pendingMemoryDelete by remember { mutableStateOf<PracticeMemory?>(null) }
    var noteText by rememberSaveable(state.selectedSessionId) { mutableStateOf("") }
    val selectedSession = state.sessions.firstOrNull { it.id == state.selectedSessionId }

    BackHandler(enabled = selectedSession != null) { viewModel.selectSession(null) }

    Scaffold(containerColor = DarkCanvas) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            Spacer(Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Prática", color = TextPrimary, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text(
                        if (selectedSession == null) "Sessões e memórias" else selectedSession.title,
                        color = TextSecondary,
                        fontSize = 13.sp,
                    )
                }
                if (selectedSession == null) {
                    Button(
                        onClick = { if (selectedTab == 0) showSessionDialog = true else showMemoryDialog = true },
                        enabled = !state.saving && !state.loading,
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                        Text(if (selectedTab == 0) "Sessão" else "Memória", modifier = Modifier.padding(start = 6.dp))
                    }
                } else {
                    IconButton(onClick = { viewModel.selectSession(null) }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar", tint = TextPrimary)
                    }
                }
            }

            if (state.error != null) {
                Text(
                    state.error.orEmpty(),
                    color = IncorrectRoseText,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(vertical = 10.dp),
                )
                TextButton(onClick = viewModel::refresh, enabled = !state.loading && !state.saving) {
                    Text("Tentar novamente", color = TextSecondary)
                }
            }

            when {
                state.loading && state.sessions.isEmpty() && state.memories.isEmpty() ->
                    CircularProgressIndicator(modifier = Modifier.padding(top = 32.dp).align(Alignment.CenterHorizontally))
                selectedSession != null -> PracticeSessionDetail(
                    state = state,
                    noteText = noteText,
                    onNoteChange = { noteText = it },
                    onSaveNote = {
                        if (viewModel.saveUserMessage(noteText.trim())) noteText = ""
                    },
                )
                else -> {
                    TabRow(selectedTabIndex = selectedTab, containerColor = DarkCanvas, contentColor = BrandIndigo) {
                        Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Sessões") })
                        Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Memórias") })
                    }
                    when (selectedTab) {
                        0 -> PracticeSessionList(
                            sessions = state.sessions,
                            saving = state.saving || state.loading,
                            onSelect = viewModel::selectSession,
                            onDelete = { pendingSessionDelete = it },
                        )
                        else -> PracticeMemoryList(
                            memories = state.memories,
                            saving = state.saving || state.loading,
                            onDelete = { pendingMemoryDelete = it },
                        )
                    }
                }
            }
        }
    }

    if (showSessionDialog) CreatePracticeSessionDialog(
        onDismiss = { showSessionDialog = false },
        onCreate = { title -> showSessionDialog = false; viewModel.createSession(title) },
    )
    if (showMemoryDialog) CreatePracticeMemoryDialog(
        onDismiss = { showMemoryDialog = false },
        onCreate = { category, fact -> showMemoryDialog = false; viewModel.createMemory(category, fact) },
    )
    pendingSessionDelete?.let { session ->
        ConfirmPracticeDeleteDialog(
            title = "Excluir sessão?",
            description = "A sessão será ocultada do histórico de prática.",
            enabled = !state.saving && !state.loading,
            onDismiss = { pendingSessionDelete = null },
            onConfirm = { pendingSessionDelete = null; viewModel.deleteSession(session) },
        )
    }
    pendingMemoryDelete?.let { memory ->
        ConfirmPracticeDeleteDialog(
            title = "Excluir memória?",
            description = "A memória deixará de aparecer nas sessões de prática.",
            enabled = !state.saving && !state.loading,
            onDismiss = { pendingMemoryDelete = null },
            onConfirm = { pendingMemoryDelete = null; viewModel.deleteMemory(memory) },
        )
    }
}
