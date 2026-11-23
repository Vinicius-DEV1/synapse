package com.synapse.features.anki.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.Composable
import com.synapse.features.anki.model.AnkiDeck
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun AnkiDeckList(
    decks: List<AnkiDeck>,
    busy: Boolean,
    onOpen: (AnkiDeck) -> Unit,
    onStudy: (AnkiDeck) -> Unit,
    onCreateChild: (AnkiDeck) -> Unit,
    onDelete: (AnkiDeck) -> Unit,
) {
    if (decks.isEmpty()) {
        Column(modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Crie um baralho para começar a estudar.", color = TextSecondary)
        }
        return
    }
    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(decks, key = AnkiDeck::id) { deck ->
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurface),
                modifier = Modifier.fillMaxWidth().padding(start = (deck.depth * 16).dp),
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(
                            modifier = Modifier.weight(1f).clickable(enabled = !busy) { onOpen(deck) },
                        ) {
                            Text(deck.name, color = TextPrimary, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                            Text(
                                "${deck.cardCount} cartões · ${deck.newCount} novos · ${deck.learningCount} aprendendo · ${deck.reviewCount} revisar",
                                color = TextSecondary,
                                fontSize = 12.sp,
                            )
                        }
                        IconButton(onClick = { onDelete(deck) }, enabled = !busy) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = "Excluir ${deck.name}", tint = TextSecondary)
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Button(onClick = { onStudy(deck) }, enabled = !busy) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Estudar")
                        }
                        TextButton(onClick = { onOpen(deck) }, enabled = !busy) { Text("Cartões") }
                        TextButton(onClick = { onCreateChild(deck) }, enabled = !busy) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Text("Subbaralho")
                        }
                    }
                }
            }
        }
    }
}
