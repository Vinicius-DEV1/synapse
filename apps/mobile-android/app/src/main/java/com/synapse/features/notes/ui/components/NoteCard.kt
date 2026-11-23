package com.synapse.features.notes.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.notes.model.NoteSummary
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary
import com.synapse.ui.theme.TextMuted

@Composable
fun NoteCard(
    note: NoteSummary,
    showTreeControls: Boolean = false,
    expanded: Boolean = true,
    saving: Boolean = false,
    canMoveUp: Boolean = false,
    canMoveDown: Boolean = false,
    onToggleExpanded: (() -> Unit)? = null,
    onMoveUp: (() -> Unit)? = null,
    onMoveDown: (() -> Unit)? = null,
    onClick: () -> Unit,
) {
    Surface(
        modifier = Modifier
            .padding(start = (note.depth * 14).dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        color = DarkSurface,
        border = BorderStroke(1.dp, DarkBorder),
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(text = note.icon, fontSize = 20.sp)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    note.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(formatNoteUpdatedAt(note.updatedAt), fontSize = 12.sp, color = TextSecondary)
            }
            if (note.isLocked) {
                Icon(Icons.Default.Lock, contentDescription = "Protegida", tint = TextMuted, modifier = Modifier.size(16.dp))
            }
            if (note.isPinned) {
                Icon(
                    imageVector = Icons.Default.PushPin,
                    contentDescription = "Fixada",
                    tint = BrandIndigoLight,
                    modifier = Modifier.size(16.dp),
                )
            }
            if (showTreeControls) {
                if (canMoveUp && onMoveUp != null) {
                    IconButton(onClick = onMoveUp, enabled = !saving, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.ArrowUpward, contentDescription = "Mover acima", tint = TextSecondary)
                    }
                }
                if (canMoveDown && onMoveDown != null) {
                    IconButton(onClick = onMoveDown, enabled = !saving, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.ArrowDownward, contentDescription = "Mover abaixo", tint = TextSecondary)
                    }
                }
                if (note.hasChildren && onToggleExpanded != null) {
                    IconButton(onClick = onToggleExpanded, enabled = !saving, modifier = Modifier.size(32.dp)) {
                        Icon(
                            imageVector = if (expanded) Icons.Default.ExpandMore else Icons.Default.ChevronRight,
                            contentDescription = if (expanded) "Recolher subpáginas" else "Expandir subpáginas",
                            tint = TextSecondary,
                        )
                    }
                }
            }
        }
    }
}
