package com.synapse.features.anki.ui

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
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import com.synapse.features.anki.model.AnkiCard
import com.synapse.features.anki.model.AnkiDeck
import com.synapse.features.anki.ui.components.AnkiCardList
import com.synapse.features.anki.ui.components.AnkiDeckList
import com.synapse.features.anki.ui.dialogs.AnkiCardDialog
import com.synapse.features.anki.ui.dialogs.AnkiDeckDialog
import com.synapse.features.anki.ui.dialogs.AnkiSettingsDialog
import com.synapse.features.anki.ui.dialogs.ConfirmAnkiDeleteDialog
import com.synapse.features.anki.viewmodel.AnkiViewModel
import com.synapse.features.settings.model.AndroidSettings
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun AnkiScreen(
    onImmersiveChanged: (Boolean) -> Unit = {},
    settings: AndroidSettings = AndroidSettings(),
) {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = AnkiViewModel(context) as T
        }
    }
    val viewModel: AnkiViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    var deckParent by remember { mutableStateOf<AnkiDeck?>(null) }
    var showDeckDialog by remember { mutableStateOf(false) }
    var showCardDialog by remember { mutableStateOf(false) }
    var showSettingsDialog by remember { mutableStateOf(false) }
    var editingCard by remember { mutableStateOf<AnkiCard?>(null) }
    var pendingDeckDelete by remember { mutableStateOf<AnkiDeck?>(null) }
    var pendingCardDelete by remember { mutableStateOf<AnkiCard?>(null) }
    var pendingProgressReset by remember { mutableStateOf<AnkiDeck?>(null) }
    val busy = state.loading || state.loadingCards || state.loadingStudyQueue || state.loadingSettings || state.saving

    LaunchedEffect(state.studying) { onImmersiveChanged(state.studying) }
    DisposableEffect(Unit) {
        onDispose { onImmersiveChanged(false) }
    }

    BackHandler(enabled = state.studying || state.selectedDeck != null) {
        if (state.studying) viewModel.finishStudy() else viewModel.closeDeck()
    }

    if (state.studying) {
        val card = state.studyCards.getOrNull(state.studyIndex)
        if (card != null) {
            AnkiStudyScreen(
                card = card,
                deckName = state.selectedDeck?.name.orEmpty(),
                cardIndex = state.studyIndex + 1,
                totalCards = state.studyCards.size,
                answerRevealed = state.answerRevealed,
                saving = state.saving,
                error = state.error,
                settings = settings,
                onReveal = viewModel::revealAnswer,
                onRate = viewModel::rateCurrentCard,
                onFinish = viewModel::finishStudy,
            )
        }
        return
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
    ) {
        Spacer(Modifier.height(18.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (state.selectedDeck != null) {
                IconButton(onClick = viewModel::closeDeck, enabled = !busy) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar", tint = TextPrimary)
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(state.selectedDeck?.name ?: "Anki", color = TextPrimary, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                Text(
                    if (state.selectedDeck == null) "Baralhos e revisão espaçada" else "Cartões deste baralho",
                    color = TextSecondary,
                    fontSize = 13.sp,
                )
            }
            val selectedDeck = state.selectedDeck
        if (selectedDeck == null) {
                Button(onClick = { deckParent = null; showDeckDialog = true }, enabled = !busy) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Text("Baralho", modifier = Modifier.padding(start = 4.dp))
                }
            } else {
                Button(onClick = { editingCard = null; showCardDialog = true }, enabled = !busy) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Text("Cartão", modifier = Modifier.padding(start = 4.dp))
                }
            }
        }

        state.error?.let { message ->
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(message, color = IncorrectRoseText, modifier = Modifier.weight(1f), fontSize = 13.sp)
                    TextButton(onClick = viewModel::refresh, enabled = !busy) { Text("Recarregar") }
                    TextButton(onClick = viewModel::dismissError) { Text("Fechar") }
                }
            }
        }

        val selectedDeck = state.selectedDeck
        if (selectedDeck == null) {
            AnkiSummary(
                total = state.stats?.totalCards ?: 0,
                reviews = state.stats?.totalReviews ?: 0,
                retention = state.stats?.retentionRate ?: 0.0,
            )
            Spacer(Modifier.height(12.dp))
            if (state.loading && state.decks.isEmpty()) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 32.dp))
            } else {
                AnkiDeckList(
                    decks = state.decks,
                    busy = busy,
                    onOpen = viewModel::selectDeck,
                    onStudy = viewModel::startStudy,
                    onCreateChild = { deckParent = it; showDeckDialog = true },
                    onDelete = { pendingDeckDelete = it },
                )
            }
        } else {
            val deck = selectedDeck
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 12.dp)) {
                Button(onClick = { viewModel.startStudy(deck) }, enabled = !busy) { Text("Estudar") }
                TextButton(onClick = { deckParent = deck; showDeckDialog = true }, enabled = !busy) { Text("Novo subbaralho") }
                TextButton(
                    onClick = { showSettingsDialog = true; viewModel.loadDeckSettings(deck) },
                    enabled = !busy,
                ) { Text("Opções") }
                TextButton(onClick = { pendingDeckDelete = deck }, enabled = !busy) { Text("Excluir baralho") }
            }
            if (state.loadingCards && state.cards.isEmpty()) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 24.dp))
            } else {
                AnkiCardList(
                    cards = state.cards,
                    busy = busy,
                    onEdit = { editingCard = it; showCardDialog = true },
                    onDelete = { pendingCardDelete = it },
                )
            }
        }
    }

    if (showDeckDialog) {
        AnkiDeckDialog(
            parentName = deckParent?.name,
            saving = state.saving,
            onDismiss = { showDeckDialog = false },
            onCreate = { name ->
                viewModel.createDeck(name, deckParent?.id)
                showDeckDialog = false
            },
        )
    }
    if (showCardDialog) {
        val card = editingCard
        AnkiCardDialog(
            title = if (card == null) "Novo cartão" else "Editar cartão",
            initialFront = card?.front.orEmpty(),
            initialBack = card?.back.orEmpty(),
            initialTags = card?.tags.orEmpty(),
            saving = state.saving,
            onDismiss = { showCardDialog = false; editingCard = null },
            onSave = { front, back, tags ->
                if (card == null) viewModel.createCard(front, back, tags)
                else viewModel.updateCard(card.copy(front = front, back = back, tags = tags))
                showCardDialog = false
                editingCard = null
            },
        )
    }
    if (showSettingsDialog) {
        AnkiSettingsDialog(
            settings = state.deckSettings,
            loading = state.loadingSettings,
            saving = state.saving,
            error = state.error,
            onDismiss = { showSettingsDialog = false },
            onSave = { newLimit, reviewLimit ->
                viewModel.saveDeckSettings(newLimit, reviewLimit)
                showSettingsDialog = false
            },
            onResetProgress = {
                pendingProgressReset = state.selectedDeck
                showSettingsDialog = false
            },
            onRetry = { state.selectedDeck?.let(viewModel::loadDeckSettings) },
        )
    }
    pendingDeckDelete?.let { deck ->
        ConfirmAnkiDeleteDialog(
            title = "Excluir baralho?",
            description = "${deck.name} será ocultado dos baralhos ativos.",
            saving = state.saving,
            onDismiss = { pendingDeckDelete = null },
            onConfirm = { pendingDeckDelete = null; viewModel.deleteDeck(deck) },
        )
    }
    pendingCardDelete?.let { card ->
        ConfirmAnkiDeleteDialog(
            title = "Excluir cartão?",
            description = "O cartão será ocultado do baralho.",
            saving = state.saving,
            onDismiss = { pendingCardDelete = null },
            onConfirm = { pendingCardDelete = null; viewModel.deleteCard(card) },
        )
    }
    pendingProgressReset?.let { deck ->
        ConfirmAnkiDeleteDialog(
            title = "Resetar progresso?",
            description = "O histórico de revisões de ${deck.name} será ocultado e todos os cartões voltarão para Novo.",
            saving = state.saving,
            onDismiss = { pendingProgressReset = null },
            onConfirm = { pendingProgressReset = null; viewModel.resetDeckProgress(deck) },
        )
    }
}

@Composable
private fun AnkiSummary(total: Long, reviews: Long, retention: Double) {
    Row(modifier = Modifier.fillMaxWidth().padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        SummaryItem("Cartões", total.toString(), Modifier.weight(1f))
        SummaryItem("Revisões", reviews.toString(), Modifier.weight(1f))
        SummaryItem("Retenção", "${retention.toInt()}%", Modifier.weight(1f))
    }
}

@Composable
private fun SummaryItem(label: String, value: String, modifier: Modifier) {
    Card(colors = CardDefaults.cardColors(containerColor = DarkSurface), modifier = modifier) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(label, color = TextSecondary, fontSize = 11.sp)
            Text(value, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
    }
}
