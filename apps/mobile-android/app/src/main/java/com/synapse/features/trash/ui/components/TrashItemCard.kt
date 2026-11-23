package com.synapse.features.trash.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Restore
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.trash.model.TrashedItem
import com.synapse.features.trash.model.TrashItemTypes
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun TrashItemCard(
    item: TrashedItem,
    saving: Boolean,
    canDeletePermanently: Boolean,
    onRestore: () -> Unit,
    onDelete: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        color = DarkSurface,
        border = BorderStroke(1.dp, DarkBorder),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.background(BrandIndigoLight.copy(alpha = 0.12f), RoundedCornerShape(6.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
            ) {
                Text(item.itemType.toTrashTypeLabel(), color = BrandIndigoLight, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    text = item.title.ifBlank { "Sem título" },
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text("Excluído em ${item.deletedAt}", fontSize = 11.sp, color = TextSecondary, maxLines = 1)
                if (!canDeletePermanently) {
                    Text("Exclua esta mídia no cliente React para remover o arquivo.", fontSize = 10.sp, color = TextSecondary)
                }
            }
            TextButton(onClick = onRestore, enabled = !saving) {
                Icon(Icons.Default.Restore, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Restaurar", fontSize = 12.sp)
            }
            IconButton(onClick = onDelete, enabled = !saving && canDeletePermanently, modifier = Modifier.size(36.dp)) {
                Icon(
                    Icons.Default.DeleteForever,
                    contentDescription = "Excluir ${item.title} definitivamente",
                    tint = IncorrectRoseText,
                    modifier = Modifier.size(19.dp),
                )
            }
        }
    }
}

private fun String.toTrashTypeLabel(): String = when (this) {
    TrashItemTypes.PAGE -> "Nota"
    TrashItemTypes.ANKI_DECK -> "Baralho"
    TrashItemTypes.ANKI_CARD -> "Flashcard"
    TrashItemTypes.FILE -> "Arquivo"
    TrashItemTypes.FINANCE -> "Transação"
    TrashItemTypes.WISHLIST -> "Desejo"
    TrashItemTypes.VAULT, TrashItemTypes.VAULT_ITEM -> "Cofre"
    TrashItemTypes.VIDEO -> "Vídeo"
    TrashItemTypes.LOFI -> "Lofi"
    TrashItemTypes.BOOK -> "Livro"
    TrashItemTypes.CALENDAR -> "Agenda"
    TrashItemTypes.CULTURE -> "Cultura"
    TrashItemTypes.HABIT -> "Hábito"
    TrashItemTypes.QUIZ_BATTERY -> "Simulado"
    else -> "Desconhecido"
}
