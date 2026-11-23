package com.synapse.features.anki.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.anki.model.AnkiCard
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun AnkiCardList(
    cards: List<AnkiCard>,
    busy: Boolean,
    onEdit: (AnkiCard) -> Unit,
    onDelete: (AnkiCard) -> Unit,
) {
    if (cards.isEmpty()) {
        Text("Este baralho ainda não tem cartões.", color = TextSecondary, modifier = Modifier.padding(vertical = 24.dp))
        return
    }
    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(cards, key = AnkiCard::id) { card ->
            Card(colors = CardDefaults.cardColors(containerColor = DarkSurface), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(card.front, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                    Text(card.back, color = TextSecondary, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
                    if (!card.tags.isNullOrBlank()) {
                        Text(card.tags, color = TextSecondary, fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        TextButton(onClick = { onEdit(card) }, enabled = !busy) { Text("Editar") }
                        TextButton(onClick = { onDelete(card) }, enabled = !busy) { Text("Excluir") }
                    }
                }
            }
        }
    }
}
