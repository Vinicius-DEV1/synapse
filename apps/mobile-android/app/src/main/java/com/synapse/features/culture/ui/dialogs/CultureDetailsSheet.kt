package com.synapse.features.culture.ui.dialogs

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.culture.model.CultureEpisodeItem
import com.synapse.features.culture.model.CultureMediaItem
import com.synapse.features.culture.ui.components.CultureEpisodesSection
import com.synapse.R
import com.synapse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CultureDetailsSheet(
    item: CultureMediaItem,
    episodes: List<CultureEpisodeItem>,
    episodesLoading: Boolean,
    episodesError: String?,
    isSaving: Boolean,
    isCompleting: Boolean,
    errorMessage: String?,
    onToggleGoal: () -> Unit,
    onCreateEpisodeList: () -> Unit,
    onToggleEpisode: (CultureEpisodeItem) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit,
    onMarkCompleted: () -> Unit
) {
    var showDeleteConfirm by remember(item.id) { mutableStateOf(false) }
    ModalBottomSheet(
        onDismissRequest = { if (!isSaving) onDismiss() },
        containerColor = DarkSurfaceElevated,
        dragHandle = { BottomSheetDefaults.DragHandle(color = TextSecondary) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(item.title, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text(
                "Tipo: ${item.type.uppercase()}",
                fontSize = 13.sp,
                color = TextSecondary
            )
            item.score?.let { score ->
                Text("Avaliação: $score/10", fontSize = 13.sp, color = TextSecondary)
            }
            Text("Progresso: ${item.currentProgress}/${item.totalProgress}", fontSize = 13.sp, color = TextSecondary)
            if (item.notes.isNotBlank()) {
                Text("Sinopse / Notas Pessoais:", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                Text(item.notes, fontSize = 13.sp, color = TextSecondary, lineHeight = 18.sp)
            }
            if (item.type == "anime" || item.type == "série") {
                CultureEpisodesSection(
                    episodes = episodes,
                    totalEpisodes = item.totalProgress,
                    isLoading = episodesLoading,
                    isSaving = isSaving,
                    errorMessage = episodesError,
                    onCreateChecklist = onCreateEpisodeList,
                    onToggleEpisode = onToggleEpisode,
                )
            }
            errorMessage?.let { message ->
                Text(message, fontSize = 13.sp, color = IncorrectRoseText)
            }
            TextButton(onClick = onEdit, enabled = !isSaving, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.culture_item_edit), color = BrandIndigoLight)
            }
            TextButton(onClick = onToggleGoal, enabled = !isSaving) {
                Text(if (item.isGoal) "Remover dos objetivos" else "Adicionar aos objetivos", color = BrandIndigoLight)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onMarkCompleted,
                enabled = item.status != "completed" && !isSaving,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = CorrectEmerald),
                shape = RoundedCornerShape(10.dp)
            ) {
                if (isCompleting) {
                    CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp)
                } else {
                    Text(
                        if (item.status == "completed") "Já Concluído" else "Marcar como Concluído",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                    )
                }
            }
            TextButton(
                onClick = { showDeleteConfirm = true },
                enabled = !isSaving,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Mover para a lixeira", color = IncorrectRoseText)
            }
        }
    }
    if (showDeleteConfirm) {
        ConfirmCultureDeleteDialog(
            item = item,
            isSaving = isSaving,
            onDismiss = { if (!isSaving) showDeleteConfirm = false },
            onConfirm = onDelete,
        )
    }
}
