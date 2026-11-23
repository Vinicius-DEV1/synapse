package com.synapse.features.culture.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.culture.model.CultureEpisodeItem
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun CultureEpisodesSection(
    episodes: List<CultureEpisodeItem>,
    totalEpisodes: Int,
    isLoading: Boolean,
    isSaving: Boolean,
    errorMessage: String?,
    onCreateChecklist: () -> Unit,
    onToggleEpisode: (CultureEpisodeItem) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Episódios e capítulos", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
        if (isLoading) {
            CircularProgressIndicator(color = BrandIndigoLight, strokeWidth = 2.dp)
        } else if (episodes.isEmpty()) {
            Text("Ainda não há episódios registrados para esta obra.", fontSize = 12.sp, color = TextSecondary)
            errorMessage?.let { Text(it, fontSize = 12.sp, color = IncorrectRoseText) }
            Button(
                onClick = onCreateChecklist,
                enabled = !isSaving && totalEpisodes > 0,
                colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo),
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (isSaving) {
                    CircularProgressIndicator(color = androidx.compose.ui.graphics.Color.White, strokeWidth = 2.dp)
                } else {
                    Text("Criar lista básica de $totalEpisodes itens")
                }
            }
        } else {
            errorMessage?.let { Text(it, fontSize = 12.sp, color = IncorrectRoseText) }
            LazyColumn(
                modifier = Modifier.fillMaxWidth().heightIn(max = 240.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                items(episodes, key = { it.id }) { episode ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(
                            checked = episode.isWatched,
                            onCheckedChange = { onToggleEpisode(episode) },
                            enabled = !isSaving,
                        )
                        Text(
                            text = "${episode.seasonNumber?.let { "T$it · " }.orEmpty()}${episode.episodeNumber}. ${episode.title}",
                            color = if (episode.isWatched) TextSecondary else TextPrimary,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(vertical = 8.dp),
                        )
                    }
                }
            }
        }
    }
}
