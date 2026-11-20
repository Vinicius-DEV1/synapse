package com.synapse.features.culture.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import com.synapse.ui.theme.*

@Composable
fun CultureMetricsRow(
    totalItems: Int,
    totalWatching: Int,
    totalCompleted: Int,
    averageScore: Double?
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        MetricPill("Catálogo", totalItems.toString(), BrandIndigo, Modifier.weight(1f))
        MetricPill("Assistindo", totalWatching.toString(), AmberWarning, Modifier.weight(1f))
        MetricPill("Concluídos", totalCompleted.toString(), CorrectEmerald, Modifier.weight(1f))
        MetricPill("Média", averageScore?.let { String.format("%.1f", it) } ?: "—", BrandPurple, Modifier.weight(1f))
    }
}

@Composable
private fun MetricPill(label: String, value: String, accentColor: androidx.compose.ui.graphics.Color, modifier: Modifier) {
    Surface(
        modifier = modifier,
        shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
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
