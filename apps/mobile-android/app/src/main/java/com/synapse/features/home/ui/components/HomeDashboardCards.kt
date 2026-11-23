package com.synapse.features.home.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.core.FinanceSummary
import com.synapse.features.calendar.model.CalendarEventItem
import com.synapse.features.notes.model.NoteSummary
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.CorrectEmeraldText
import com.synapse.ui.theme.DarkBorder
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary
import java.text.NumberFormat
import java.util.Locale

@Composable
fun HomeAgendaCard(
    todayEvents: List<CalendarEventItem>,
    tomorrowEvents: List<CalendarEventItem>,
    loading: Boolean,
    onOpenCalendar: () -> Unit,
    onOpenNote: (String) -> Unit,
) {
    DashboardCard(title = "📅 Agenda de Hoje", action = "Ver Tudo →", onAction = onOpenCalendar) {
        when {
            loading -> LoadingLine()
            todayEvents.isEmpty() -> Text("Nenhum compromisso para hoje.", fontSize = 13.sp, color = TextMuted)
            else -> todayEvents.take(MAX_AGENDA_EVENTS).forEach { EventLine(it, onOpenNote) }
        }
        if (tomorrowEvents.isNotEmpty()) {
            Text("Amanhã", color = TextSecondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            tomorrowEvents.take(MAX_TOMORROW_EVENTS).forEach { EventLine(it, onOpenNote) }
        }
    }
}

@Composable
fun HomeFinanceCard(summary: FinanceSummary?, loading: Boolean, onOpenFinance: () -> Unit) {
    DashboardCard(
        title = "💰 Resumo Financeiro",
        action = "Ver Finanças →",
        actionColor = CorrectEmeraldText,
        onAction = onOpenFinance,
    ) {
        when {
            loading -> LoadingLine()
            summary == null -> Text("Resumo financeiro indisponível.", fontSize = 13.sp, color = TextMuted)
            else -> {
                val formatter = remember { NumberFormat.getCurrencyInstance(Locale("pt", "BR")) }
                Text("Saldo total · ${formatter.format(summary.totalBalance)}", color = TextPrimary, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                    Text("Entradas ${formatter.format(summary.income)}", color = TextSecondary, fontSize = 12.sp)
                    Text("Saídas ${formatter.format(summary.expense)}", color = TextSecondary, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun HomePagesCard(title: String, notes: List<NoteSummary>, onOpenNote: (String) -> Unit) {
    DashboardCard(title = title) {
        if (notes.isEmpty()) {
            Text("Nenhuma nota disponível.", fontSize = 13.sp, color = TextMuted)
        } else {
            notes.forEach { note ->
                TextButton(
                    onClick = { onOpenNote(note.id) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = "${note.icon}  ${note.title}",
                        modifier = Modifier.fillMaxWidth(),
                        color = TextPrimary,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

@Composable
private fun DashboardCard(
    title: String,
    action: String? = null,
    actionColor: androidx.compose.ui.graphics.Color = BrandIndigoLight,
    onAction: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = DarkSurface,
        border = BorderStroke(1.dp, DarkBorder),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                if (action != null && onAction != null) {
                    Text(
                        text = action,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = actionColor,
                        modifier = Modifier.clickable(onClick = onAction),
                    )
                }
            }
            content()
        }
    }
}

@Composable
private fun EventLine(event: CalendarEventItem, onOpenNote: (String) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(event.time, color = BrandIndigoLight, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        Text(event.title, modifier = Modifier.weight(1f), color = TextPrimary, fontSize = 13.sp, maxLines = 1)
        event.pageId?.let { pageId ->
            IconButton(onClick = { onOpenNote(pageId) }, modifier = Modifier.size(32.dp)) {
                Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = "Abrir nota vinculada", tint = BrandIndigoLight)
            }
        }
    }
}

@Composable
private fun LoadingLine() {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
        Text("Carregando…", fontSize = 13.sp, color = TextMuted)
    }
}

private const val MAX_AGENDA_EVENTS = 4
private const val MAX_TOMORROW_EVENTS = 2
