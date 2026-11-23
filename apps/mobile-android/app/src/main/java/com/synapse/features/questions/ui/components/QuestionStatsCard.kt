package com.synapse.features.questions.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.questions.model.QuizStats
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun QuestionStatsCard(stats: QuizStats, onShowAttemptHistory: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = DarkSurface),
        modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            StatValue("Respondidas", stats.answeredQuestions.toString())
            StatValue("Tentativas", stats.totalAttempts.toString())
            StatValue("Precisão", "${stats.accuracyRate}%")
        }
        androidx.compose.material3.TextButton(
            onClick = onShowAttemptHistory,
            modifier = Modifier.align(Alignment.End).padding(end = 8.dp, bottom = 4.dp),
        ) { Text("Histórico de tentativas", color = TextSecondary, fontSize = 12.sp) }
    }
}

@Composable
private fun StatValue(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 17.sp)
        Text(label, color = TextSecondary, fontSize = 11.sp)
    }
}
