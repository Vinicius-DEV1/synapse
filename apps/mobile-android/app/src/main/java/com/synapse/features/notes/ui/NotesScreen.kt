package com.synapse.features.notes.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.theme.*

data class NoteItem(
    val id: String,
    val title: String,
    val content: String,
    val icon: String = "📄",
    val isPinned: Boolean = false,
    val updatedAt: String = "Hoje"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotesScreen(
    initialNotes: List<NoteItem> = listOf(
        NoteItem("1", "MURAL", "# Mural Principal\n\nBem-vindo ao Caderno Synapse.", "📌", true, "Hoje"),
        NoteItem("2", "CURSOS", "Anotações e roadmap de estudos.", "🎓", true, "Ontem"),
        NoteItem("3", "PROGRAMACAO", "Arquitetura Rust, Kotlin e Qt 6 C++.", "💻", true, "08/11"),
        NoteItem("4", "ENGLISH", "Daily vocabulary and idiomatic phrases.", "🇬🇧", true, "07/11"),
        NoteItem("5", "FINANCAS", "Controle de despesas, investimentos e wishlist.", "💰", true, "06/11"),
        NoteItem("6", "Criptografia E2EE", "Especificação Two-Tier Keychain com AES-256-GCM.", "🔒", false, "05/11"),
        NoteItem("7", "Algoritmo FSRS v5", "Variáveis DSR (Dificuldade, Estabilidade, Retenção).", "🧠", false, "04/11")
    )
) {
    var notes by remember { mutableStateOf(initialNotes) }
    var selectedNote by remember { mutableStateOf<NoteItem?>(null) }
    var searchQuery by remember { mutableStateOf("") }

    // Android hardware / gesture back navigation pipeline
    BackHandler(enabled = selectedNote != null) {
        selectedNote = null
    }

    if (selectedNote != null) {
        // Note Detail & Reading View
        val note = selectedNote!!
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(DarkCanvas)
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { selectedNote = null }) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Voltar",
                        tint = TextPrimary
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "${note.icon} ${note.title}",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .clip(RoundedCornerShape(12.dp)),
                color = DarkSurface
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "Atualizado em ${note.updatedAt}",
                        fontSize = 12.sp,
                        color = TextMuted
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = note.content,
                        fontSize = 15.sp,
                        color = TextPrimary,
                        lineHeight = 22.sp
                    )
                }
            }
        }
    } else {
        // Notes Explorer List
        val filteredNotes = remember(notes, searchQuery) {
            if (searchQuery.isBlank()) notes
            else notes.filter {
                it.title.contains(searchQuery, ignoreCase = true) ||
                it.content.contains(searchQuery, ignoreCase = true)
            }
        }

        val pinnedNotes = remember(filteredNotes) { filteredNotes.filter { it.isPinned } }
        val otherNotes = remember(filteredNotes) { filteredNotes.filter { !it.isPinned } }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(DarkCanvas)
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            // Header
            Text(
                text = "📝 Caderno & Notas",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(12.dp))

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Buscar notas...", color = TextMuted) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Buscar", tint = TextSecondary) },
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BrandIndigo,
                    unfocusedBorderColor = DarkBorder,
                    focusedContainerColor = DarkSurface,
                    unfocusedContainerColor = DarkSurface
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (pinnedNotes.isNotEmpty()) {
                    item {
                        Text(
                            text = "📌 FIXADOS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = BrandIndigoLight,
                            letterSpacing = 1.sp
                        )
                    }
                    items(pinnedNotes) { note ->
                        NoteCard(note = note, onClick = { selectedNote = note })
                    }
                }

                if (otherNotes.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "TODAS AS NOTAS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextMuted,
                            letterSpacing = 1.sp
                        )
                    }
                    items(otherNotes) { note ->
                        NoteCard(note = note, onClick = { selectedNote = note })
                    }
                }
            }
        }
    }
}

@Composable
fun NoteCard(note: NoteItem, onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        color = DarkSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = note.icon, fontSize = 20.sp)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = note.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                Text(
                    text = note.updatedAt,
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }
            if (note.isPinned) {
                Icon(
                    imageVector = Icons.Default.PushPin,
                    contentDescription = "Fixado",
                    tint = BrandIndigoLight,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}
