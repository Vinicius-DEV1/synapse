package com.synapse.features.trash.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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

data class TrashedItem(
    val id: String,
    val title: String,
    val itemType: String,
    val deletedAt: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrashScreen(
    initialItems: List<TrashedItem> = emptyList()
) {
    var items by remember { mutableStateOf(initialItems) }
    var selectedFilter by remember { mutableStateOf("Todos") }
    var showEmptyDialog by remember { mutableStateOf(false) }

    val filteredItems = remember(items, selectedFilter) {
        if (selectedFilter == "Todos") items
        else items.filter {
            when (selectedFilter) {
                "Notas" -> it.itemType == "page"
                "Baralhos" -> it.itemType == "anki_deck"
                "Finanças" -> it.itemType == "finance"
                else -> true
            }
        }
    }

    Scaffold(
        containerColor = DarkCanvas
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Lixeira do Sistema",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "${items.size} itens na lixeira",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                }

                if (items.isNotEmpty()) {
                    Button(
                        onClick = { showEmptyDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = IncorrectRose),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text("Esvaziar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Filter Tabs
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("Todos", "Notas", "Baralhos", "Finanças").forEach { filterLabel ->
                    val isSel = selectedFilter == filterLabel
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { selectedFilter = filterLabel },
                        color = if (isSel) BrandIndigo.copy(alpha = 0.25f) else DarkSurface,
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (isSel) BrandIndigo else DarkBorder)
                    ) {
                        Text(
                            text = filterLabel,
                            fontSize = 12.sp,
                            fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSel) Color.White else TextSecondary,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Items List
            if (filteredItems.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text("A lixeira está vazia.", color = TextMuted, fontSize = 14.sp)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredItems, key = { it.id }) { item ->
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            color = DarkSurface,
                            border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Badge
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(BrandIndigo.copy(alpha = 0.15f))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = when (item.itemType) {
                                            "page" -> "Nota"
                                            "anki_deck" -> "Baralho"
                                            "finance" -> "Finança"
                                            else -> item.itemType
                                        },
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = BrandIndigoLight
                                    )
                                }

                                Spacer(modifier = Modifier.width(10.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = item.title,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = TextPrimary,
                                        maxLines = 1
                                    )
                                    Text(
                                        text = "Excluído em ${item.deletedAt}",
                                        fontSize = 11.sp,
                                        color = TextSecondary
                                    )
                                }

                                // Restore Action Button
                                TextButton(
                                    onClick = {
                                        items = items.filter { it.id != item.id }
                                    },
                                    colors = ButtonDefaults.textButtonColors(contentColor = CorrectEmeraldText)
                                ) {
                                    Text("Restaurar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }

                                // Hard Delete Action Button
                                IconButton(
                                    onClick = {
                                        items = items.filter { it.id != item.id }
                                    },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        Icons.Default.DeleteForever,
                                        contentDescription = "Excluir Definitivamente",
                                        tint = IncorrectRoseText,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Empty Trash Dialog
        if (showEmptyDialog) {
            AlertDialog(
                onDismissRequest = { showEmptyDialog = false },
                containerColor = DarkSurfaceElevated,
                title = { Text("Esvaziar Lixeira?", color = TextPrimary, fontWeight = FontWeight.Bold) },
                text = {
                    Text(
                        "Todos os itens da lixeira serão excluídos definitivamente. Esta ação não pode ser desfeita.",
                        color = TextSecondary,
                        fontSize = 13.sp
                    )
                },
                confirmButton = {
                    Button(
                        onClick = {
                            items = emptyList()
                            showEmptyDialog = false
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = IncorrectRose)
                    ) {
                        Text("Sim, Esvaziar", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showEmptyDialog = false }) {
                        Text("Cancelar", color = TextSecondary)
                    }
                }
            )
        }
    }
}

