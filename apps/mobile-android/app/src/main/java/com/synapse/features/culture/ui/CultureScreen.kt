package com.synapse.features.culture.ui

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

data class CultureMediaItem(
    val id: String,
    val title: String,
    val type: String, // "movie", "series", "anime", "book"
    val status: String, // "watching", "completed", "plan_to_watch"
    val score: Double = 8.5,
    val currentProgress: Int = 0,
    val totalProgress: Int = 12,
    val notes: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CultureScreen(
    initialItems: List<CultureMediaItem> = listOf(
        CultureMediaItem("1", "Oppenheimer", "movie", "completed", 9.2, 1, 1, "Direção impecável de Nolan e montagem magistral."),
        CultureMediaItem("2", "Severance (Ruptura)", "series", "watching", 9.5, 7, 9, "Excelente comentário sobre alienação no trabalho."),
        CultureMediaItem("3", "Frieren: Beyond Journey's End", "anime", "completed", 9.8, 28, 28, "Melhor anime da década sobre tempo e memória."),
        CultureMediaItem("4", "Duna: Parte 2", "movie", "completed", 9.0, 1, 1, "Espetáculo audiovisual sem precedentes."),
        CultureMediaItem("5", "Cyberpunk: Edgerunners", "anime", "completed", 9.1, 10, 10, "Trilha sonora e ritmo frenético do Studio Trigger."),
        CultureMediaItem("6", "Dark", "series", "completed", 9.4, 26, 26, "Trama temporal amarrada com maestria cirúrgica.")
    )
) {
    var itemsList by remember { mutableStateOf(initialItems) }
    var selectedTypeFilter by remember { mutableStateOf("Todos") }
    var selectedStatusFilter by remember { mutableStateOf("Todos") }
    var searchQuery by remember { mutableStateOf("") }
    var selectedItemForDetails by remember { mutableStateOf<CultureMediaItem?>(null) }
    var isAddingItem by remember { mutableStateOf(false) }

    var newTitle by remember { mutableStateOf("") }
    var newType by remember { mutableStateOf("movie") }
    var newTotal by remember { mutableStateOf("12") }

    val filteredItems = remember(itemsList, selectedTypeFilter, selectedStatusFilter, searchQuery) {
        itemsList.filter { item ->
            val matchType = when (selectedTypeFilter) {
                "Filmes" -> item.type == "movie"
                "Séries" -> item.type == "series"
                "Animes" -> item.type == "anime"
                else -> true
            }
            val matchStatus = when (selectedStatusFilter) {
                "Em Andamento" -> item.status == "watching"
                "Concluídos" -> item.status == "completed"
                "Planejados" -> item.status == "plan_to_watch"
                else -> true
            }
            val matchSearch = searchQuery.isBlank() || item.title.contains(searchQuery, ignoreCase = true)
            matchType && matchStatus && matchSearch
        }
    }

    val totalItems = itemsList.size
    val totalWatching = remember(itemsList) { itemsList.count { it.status == "watching" } }
    val totalCompleted = remember(itemsList) { itemsList.count { it.status == "completed" } }
    val avgScore = remember(itemsList) {
        if (itemsList.isEmpty()) 0.0
        else itemsList.map { it.score }.average()
    }

    Scaffold(
        containerColor = DarkCanvas,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { isAddingItem = true },
                containerColor = BrandIndigo,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Adicionar Mídia")
            }
        }
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
                        text = "Cultura & Cinema",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Catálogo de filmes, animes e séries",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                }
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = DarkSurfaceElevated,
                    border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder),
                    modifier = Modifier.padding(4.dp)
                ) {
                    Icon(
                        Icons.Default.Movie,
                        contentDescription = "Cultura",
                        tint = BrandIndigoLight,
                        modifier = Modifier.padding(8.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 4 KPI Metric Cards
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MetricPill("Catálogo", totalItems.toString(), BrandIndigo, Modifier.weight(1f))
                MetricPill("Assistindo", totalWatching.toString(), AmberWarning, Modifier.weight(1f))
                MetricPill("Concluídos", totalCompleted.toString(), CorrectEmerald, Modifier.weight(1f))
                MetricPill("Média", String.format("%.1f", avgScore), BrandPurple, Modifier.weight(1f))
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Type Filter Chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("Todos", "Filmes", "Séries", "Animes").forEach { typeName ->
                    val isSelected = selectedTypeFilter == typeName
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { selectedTypeFilter = typeName },
                        color = if (isSelected) BrandIndigo.copy(alpha = 0.25f) else DarkSurface,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) BrandIndigo else DarkBorder
                        )
                    ) {
                        Text(
                            text = typeName,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) Color.White else TextSecondary,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Media Items List
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(filteredItems, key = { it.id }) { item ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable { selectedItemForDetails = item },
                        color = DarkSurface,
                        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Poster Box
                            Box(
                                modifier = Modifier
                                    .size(52.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(DarkSurfaceElevated)
                                    .border(1.dp, DarkBorder, RoundedCornerShape(8.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = when (item.type) {
                                        "movie" -> "🎬"
                                        "series" -> "📺"
                                        "anime" -> "🎌"
                                        else -> "📖"
                                    },
                                    fontSize = 24.sp
                                )
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            // Info
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = item.title,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = TextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text(
                                        text = "★ ${item.score}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = AmberWarningText
                                    )
                                    Text(
                                        text = "${item.currentProgress}/${item.totalProgress} ep",
                                        fontSize = 12.sp,
                                        color = TextSecondary
                                    )
                                    Text(
                                        text = when (item.status) {
                                            "watching" -> "Assistindo"
                                            "completed" -> "Concluído"
                                            else -> "Planejado"
                                        },
                                        fontSize = 11.sp,
                                        color = when (item.status) {
                                            "completed" -> CorrectEmeraldText
                                            "watching" -> AmberWarningText
                                            else -> TextMuted
                                        }
                                    )
                                }
                            }

                            // Stepper Controls
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(DarkSurfaceElevated)
                                        .clickable {
                                            if (item.currentProgress > 0) {
                                                itemsList = itemsList.map {
                                                    if (it.id == item.id) it.copy(currentProgress = it.currentProgress - 1) else it
                                                }
                                            }
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("-", color = TextPrimary, fontWeight = FontWeight.Bold)
                                }

                                Box(
                                    modifier = Modifier
                                        .size(28.dp)
                                        .clip(CircleShape)
                                        .background(DarkSurfaceElevated)
                                        .clickable {
                                            if (item.currentProgress < item.totalProgress) {
                                                val nextProg = item.currentProgress + 1
                                                val newStatus = if (nextProg == item.totalProgress) "completed" else item.status
                                                itemsList = itemsList.map {
                                                    if (it.id == item.id) it.copy(currentProgress = nextProg, status = newStatus) else it
                                                }
                                            }
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("+", color = TextPrimary, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }

        // Details Bottom Sheet
        selectedItemForDetails?.let { detailItem ->
            ModalBottomSheet(
                onDismissRequest = { selectedItemForDetails = null },
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
                    Text(
                        text = detailItem.title,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Tipo: ${detailItem.type.uppercase()} • Avaliação: ${detailItem.score}/10",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                    if (detailItem.notes.isNotBlank()) {
                        Text(
                            text = "Sinopse / Notas Pessoais:",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                        Text(
                            text = detailItem.notes,
                            fontSize = 13.sp,
                            color = TextSecondary,
                            lineHeight = 18.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = {
                            itemsList = itemsList.map {
                                if (it.id == detailItem.id) it.copy(status = "completed", currentProgress = it.totalProgress) else it
                            }
                            selectedItemForDetails = null
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = CorrectEmerald),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Marcar como Concluído", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }
        }

        // Add Media Modal
        if (isAddingItem) {
            ModalBottomSheet(
                onDismissRequest = { isAddingItem = false },
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
                    Text(
                        text = "Adicionar Nova Mídia",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    OutlinedTextField(
                        value = newTitle,
                        onValueChange = { newTitle = it },
                        label = { Text("Título da Mídia") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = BrandIndigo,
                            unfocusedBorderColor = DarkBorder
                        )
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        listOf("movie" to "Filme", "series" to "Série", "anime" to "Anime").forEach { (typeVal, label) ->
                            val isSel = newType == typeVal
                            Surface(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable { newType = typeVal },
                                color = if (isSel) BrandIndigo.copy(alpha = 0.25f) else DarkSurface,
                                border = androidx.compose.foundation.BorderStroke(1.dp, if (isSel) BrandIndigo else DarkBorder)
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSel) Color.White else TextSecondary,
                                    modifier = Modifier.padding(vertical = 10.dp),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                            }
                        }
                    }

                    Button(
                        onClick = {
                            if (newTitle.isNotBlank()) {
                                itemsList = itemsList + CultureMediaItem(
                                    id = java.util.UUID.randomUUID().toString(),
                                    title = newTitle.trim(),
                                    type = newType,
                                    status = "watching",
                                    currentProgress = 0,
                                    totalProgress = newTotal.toIntOrNull() ?: 12
                                )
                                newTitle = ""
                                isAddingItem = false
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = BrandIndigo),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Cadastrar Mídia", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricPill(label: String, value: String, accentColor: Color, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        color = DarkSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
    ) {
        Column(
            modifier = Modifier.padding(vertical = 8.dp, horizontal = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = value, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = accentColor)
            Text(text = label, fontSize = 10.sp, color = TextSecondary)
        }
    }
}
