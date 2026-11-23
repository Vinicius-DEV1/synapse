package com.synapse.features.habits.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.habits.model.HabitItem
import com.synapse.ui.theme.AmberWarning
import com.synapse.ui.theme.AmberWarningBg
import com.synapse.ui.theme.AmberWarningText
import com.synapse.ui.theme.CorrectEmerald
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

private val WEEKDAY_LABELS = listOf("S", "T", "Q", "Q", "S", "S", "D")

@Composable
fun HabitCard(
    habit: HabitItem,
    saving: Boolean,
    onCheckin: (String) -> Unit,
    onDelete: () -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }
    var showDeleteConfirmation by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)),
        color = DarkSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(habit.icon, fontSize = 20.sp)
                    Column {
                        Text(habit.name, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(habit.category, fontSize = 11.sp, color = TextMuted)
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = AmberWarningBg,
                        border = androidx.compose.foundation.BorderStroke(1.dp, AmberWarning.copy(alpha = 0.3f)),
                    ) {
                        Text(
                            text = "🔥 ${habit.currentStreak} dias",
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            color = AmberWarningText,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    IconButton(onClick = { showMenu = true }, enabled = !saving) {
                        Icon(Icons.Default.MoreVert, contentDescription = "Ações do hábito", tint = TextSecondary)
                    }
                    DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                        DropdownMenuItem(
                            text = { Text("Excluir hábito") },
                            leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null) },
                            onClick = {
                                showMenu = false
                                showDeleteConfirmation = true
                            },
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.size(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                habit.daysCompleted.forEachIndexed { index, completed ->
                    val date = habit.dayDates.getOrNull(index)
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(WEEKDAY_LABELS.getOrElse(index) { "?" }, fontSize = 10.sp, color = TextMuted)
                        androidx.compose.foundation.layout.Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(if (completed) CorrectEmerald else DarkSurfaceElevated)
                                .border(1.dp, if (completed) CorrectEmerald else DarkBorder, CircleShape)
                                .semantics {
                                    contentDescription = if (completed) "Dia concluído" else "Dia pendente"
                                }
                                .clickable(enabled = !saving && date != null) {
                                    date?.let(onCheckin)
                                },
                            contentAlignment = Alignment.Center,
                        ) {
                            if (completed) {
                                Icon(
                                    Icons.Default.Check,
                                    contentDescription = "Concluído",
                                    tint = Color.White,
                                    modifier = Modifier.size(16.dp),
                                )
                            }
                        }
                    }
                }
            }

            Text(
                "${habit.completionRate30Days}% nos últimos 30 dias · ${habit.bestStreak} dias de recorde",
                fontSize = 11.sp,
                color = TextSecondary,
                modifier = Modifier.padding(top = 12.dp),
            )
        }
    }

    if (showDeleteConfirmation) {
        AlertDialog(
            onDismissRequest = { if (!saving) showDeleteConfirmation = false },
            containerColor = DarkSurfaceElevated,
            title = { Text("Excluir hábito?", color = TextPrimary) },
            text = { Text("${habit.name} será removido do rastreador.", color = TextSecondary) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteConfirmation = false
                        onDelete()
                    },
                    enabled = !saving,
                ) { Text("Excluir", color = AmberWarning) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirmation = false }, enabled = !saving) {
                    Text("Cancelar", color = TextSecondary)
                }
            },
        )
    }
}
