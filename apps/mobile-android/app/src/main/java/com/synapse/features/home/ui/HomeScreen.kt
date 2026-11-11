package com.synapse.features.home.ui

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
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun HomeScreen(
    onNavigateToTab: (String) -> Unit = {}
) {
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
                            text = "$greeting, Vinícius!",
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
                            onClick = { onNavigateToTab("notes") }
                        )
                        ActionCard(
                            icon = "🎴",
                            title = "Flashcards",
                            subtitle = "Revisar Anki FSRS",
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

            // Agenda Section Card
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    color = DarkSurface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "📅 Agenda de Hoje",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Ver Tudo →",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = BrandIndigoLight,
                                modifier = Modifier.clickable { onNavigateToTab("calendar") }
                            )
                        }

                        // Event Item 1
                        AgendaMiniItem(
                            title = "Revisão Geral de Algoritmos",
                            time = "Hoje às 14:00",
                            color = BrandIndigo
                        )

                        // Event Item 2
                        AgendaMiniItem(
                            title = "Simulado Completo de Redes",
                            time = "Amanhã às 10:00",
                            color = CorrectEmerald
                        )
                    }
                }
            }

            // Financial Snapshot Card
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    color = DarkSurface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "💰 Resumo Financeiro",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "Ver Finanças →",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = CorrectEmeraldText,
                                modifier = Modifier.clickable { onNavigateToTab("finance") }
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            MiniStat("Receitas", "R$ 5.200,00", CorrectEmeraldText, Modifier.weight(1f))
                            MiniStat("Despesas", "R$ 1.840,00", IncorrectRoseText, Modifier.weight(1f))
                            MiniStat("Saldo", "R$ 3.360,00", TextPrimary, Modifier.weight(1f))
                        }
                    }
                }
            }

            // Pinned Notes
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    color = DarkSurface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, DarkBorder)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "📌 Notas Fixadas",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )

                        listOf(
                            "💡" to "PROGRAMACAO - Arquitetura de Software",
                            "💰" to "FINANCAS - Planejamento Anual",
                            "🇬🇧" to "ENGLISH - Vocabulário & Phrasal Verbs",
                            "🎯" to "MURAL - Metas & Objetivos 2026"
                        ).forEach { (icon, title) ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(DarkSurfaceElevated)
                                    .clickable { onNavigateToTab("notes") }
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text(icon, fontSize = 14.sp)
                                Text(
                                    title,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = TextPrimary,
                                    maxLines = 1
                                )
                            }
                        }
                    }
                }
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

@Composable
private fun AgendaMiniItem(title: String, time: String, color: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(DarkSurfaceElevated)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Box(
            modifier = Modifier
                .width(4.dp)
                .height(28.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(color)
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, maxLines = 1)
            Text(time, fontSize = 11.sp, color = TextSecondary)
        }
    }
}

@Composable
private fun MiniStat(label: String, value: String, valueColor: Color, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(DarkSurfaceElevated)
            .padding(vertical = 8.dp, horizontal = 6.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, fontSize = 10.sp, color = TextSecondary)
            Spacer(modifier = Modifier.height(2.dp))
            Text(value, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = valueColor, maxLines = 1)
        }
    }
}

