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
import com.synapse.features.culture.model.CultureMediaItem
import com.synapse.features.culture.ui.components.CultureMediaCard
import com.synapse.features.culture.ui.components.CultureMetricsRow
import com.synapse.features.culture.ui.dialogs.AddMediaSheet
import com.synapse.features.culture.ui.dialogs.CultureDetailsSheet
import com.synapse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CultureScreen(
    initialItems: List<CultureMediaItem> = emptyList()
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

            CultureMetricsRow(
                totalItems = totalItems,
                totalWatching = totalWatching,
                totalCompleted = totalCompleted,
                averageScore = if (itemsList.isEmpty()) null else avgScore
            )

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
                if (filteredItems.isEmpty()) {
                    item {
                        Text(
                            text = "Nenhum título disponível neste dispositivo.",
                            color = TextMuted,
                            fontSize = 14.sp,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 32.dp)
                        )
                    }
                }

                items(filteredItems, key = { it.id }) { item ->
                    CultureMediaCard(
                        item = item,
                        onOpenDetails = { selectedItemForDetails = item },
                        onDecrementProgress = {
                            if (item.currentProgress > 0) {
                                itemsList = itemsList.map {
                                    if (it.id == item.id) it.copy(currentProgress = it.currentProgress - 1) else it
                                }
                            }
                        },
                        onIncrementProgress = {
                            if (item.currentProgress < item.totalProgress) {
                                val nextProgress = item.currentProgress + 1
                                val newStatus = if (nextProgress == item.totalProgress) "completed" else item.status
                                itemsList = itemsList.map {
                                    if (it.id == item.id) it.copy(currentProgress = nextProgress, status = newStatus) else it
                                }
                            }
                        }
                    )
                }
            }
        }

        selectedItemForDetails?.let { detailItem ->
            CultureDetailsSheet(
                item = detailItem,
                onDismiss = { selectedItemForDetails = null },
                onMarkCompleted = {
                    itemsList = itemsList.map {
                        if (it.id == detailItem.id) it.copy(status = "completed", currentProgress = it.totalProgress) else it
                    }
                    selectedItemForDetails = null
                }
            )
        }

        if (isAddingItem) {
            AddMediaSheet(
                title = newTitle,
                type = newType,
                onTitleChange = { newTitle = it },
                onTypeChange = { newType = it },
                onDismiss = { isAddingItem = false },
                onAdd = {
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
                }
            )
        }
    }
}
