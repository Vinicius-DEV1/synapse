package com.synapse.features.home.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.synapse.features.home.ui.components.HomeAgendaCard
import com.synapse.features.home.ui.components.HomeFinanceCard
import com.synapse.features.home.ui.components.HomePagesCard
import com.synapse.features.home.viewmodel.HomeDashboardViewModel
import com.synapse.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun HomeScreen(
    onNavigateToTab: (String) -> Unit,
    onOpenNote: (String) -> Unit,
    onCreateNote: () -> Unit,
) {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                require(modelClass.isAssignableFrom(HomeDashboardViewModel::class.java))
                return modelClass.cast(HomeDashboardViewModel(context))
            }
        }
    }
    val viewModel: HomeDashboardViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    val snapshot = state.snapshot

    LaunchedEffect(viewModel) { viewModel.refresh() }

    val greeting = remember {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        when {
            hour in 5..11 -> "Bom dia"
            hour in 12..17 -> "Boa tarde"
            else -> "Boa noite"
        }
    }

    val currentDateStr = remember {
        val sdf = SimpleDateFormat("EEEE, d 'de' MMMM", Locale("pt", "BR"))
        sdf.format(Date()).replaceFirstChar { it.uppercase() }
    }

    Scaffold(
        containerColor = DarkCanvas
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "$greeting!",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Hoje é $currentDateStr",
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
                            Icons.Default.Bolt,
                            contentDescription = "Energia",
                            tint = BrandIndigoLight,
                            modifier = Modifier.padding(8.dp)
                        )
                    }
                }
            }

            // Quick Actions (2x2 Grid)
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        ActionCard(
                            icon = "📝",
                            title = "Nova Nota",
                            subtitle = "Abrir editor",
                            color = BrandPurple,
                            modifier = Modifier.weight(1f),
                            onClick = onCreateNote
                        )
                        ActionCard(
                            icon = "🎴",
                            title = "Flashcards",
                            subtitle = when {
                                state.loading && snapshot == null -> "Carregando revisões"
                                state.error != null && snapshot == null -> "Revisões indisponíveis"
                                snapshot?.dueCardCount == 0L -> "Tudo revisado"
                                else -> "${snapshot?.dueCardCount ?: 0} para revisar"
                            },
                            color = BrandIndigo,
                            modifier = Modifier.weight(1f),
                            onClick = { onNavigateToTab("anki") }
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        ActionCard(
                            icon = "⏳",
                            title = "Foco Pomodoro",
                            subtitle = "Ciclo 25m Lo-Fi",
                            color = CorrectEmerald,
                            modifier = Modifier.weight(1f),
                            onClick = { onNavigateToTab("focus") }
                        )
                        ActionCard(
                            icon = "⚡",
                            title = "Hábitos",
                            subtitle = "Ofensiva diária",
                            color = AmberWarning,
                            modifier = Modifier.weight(1f),
                            onClick = { onNavigateToTab("habits") }
                        )
                    }
                }
            }

            state.error?.let { message ->
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = DarkSurface),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(message, color = IncorrectRoseText, modifier = Modifier.weight(1f))
                            TextButton(onClick = viewModel::refresh) { Text("Tentar novamente") }
                        }
                    }
                }
            }

            item {
                HomeAgendaCard(
                    todayEvents = snapshot?.todayEvents.orEmpty(),
                    tomorrowEvents = snapshot?.tomorrowEvents.orEmpty(),
                    loading = state.loading && snapshot == null,
                    onOpenCalendar = { onNavigateToTab("calendar") },
                    onOpenNote = onOpenNote,
                )
            }

            item {
                HomeFinanceCard(
                    summary = snapshot?.financeSummary,
                    loading = state.loading && snapshot == null,
                    onOpenFinance = { onNavigateToTab("finance") },
                )
            }

            item {
                HomePagesCard("📌 Notas Fixadas", snapshot?.pinnedNotes.orEmpty(), onOpenNote)
            }

            item {
                HomePagesCard("🕘 Notas Recentes", snapshot?.recentNotes.orEmpty(), onOpenNote)
            }
        }
    }
}

@Composable
private fun ActionCard(
    icon: String,
    title: String,
    subtitle: String,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() },
        color = DarkSurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(color.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Text(icon, fontSize = 20.sp)
            }
            Column {
                Text(title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Text(subtitle, fontSize = 11.sp, color = TextSecondary)
            }
        }
    }
}
