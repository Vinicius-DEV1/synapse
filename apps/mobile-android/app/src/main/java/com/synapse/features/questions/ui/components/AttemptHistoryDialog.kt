package com.synapse.features.questions.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.questions.model.QuizAttemptHistory
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.CorrectEmeraldBg
import com.synapse.ui.theme.CorrectEmeraldText
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.IncorrectRoseBg
import com.synapse.ui.theme.IncorrectRoseText
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

@Composable
fun AttemptHistoryDialog(
    attempts: List<QuizAttemptHistory>,
    loading: Boolean,
    error: String?,
    onRetry: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurface,
        title = { Text("Histórico de tentativas", color = TextPrimary) },
        text = {
            Column(modifier = Modifier.fillMaxWidth().heightIn(max = 520.dp)) {
                when {
                    loading -> CircularProgressIndicator(
                        color = BrandIndigo,
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                    )
                    error != null -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(error, color = TextSecondary)
                        TextButton(onClick = onRetry) { Text("Tentar novamente", color = BrandIndigo) }
                    }
                    attempts.isEmpty() -> Text(
                        "As tentativas aparecerão aqui depois da primeira resposta.",
                        color = TextSecondary,
                    )
                    else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(attempts, key = QuizAttemptHistory::id) { attempt -> AttemptHistoryCard(attempt) }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Fechar", color = TextSecondary) } },
    )
}

@Composable
private fun AttemptHistoryCard(attempt: QuizAttemptHistory) {
    Card(
        colors = CardDefaults.cardColors(containerColor = DarkSurface.copy(alpha = 0.72f)),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = if (attempt.isCorrect) CorrectEmeraldBg else IncorrectRoseBg,
                    shape = RoundedCornerShape(20.dp),
                ) {
                    Text(
                        if (attempt.isCorrect) "Correta" else "Incorreta",
                        color = if (attempt.isCorrect) CorrectEmeraldText else IncorrectRoseText,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
                    )
                }
                Spacer(Modifier.width(8.dp))
                Text(formatTimestamp(attempt.createdAt), color = TextSecondary, fontSize = 11.sp)
            }
            Text(
                attempt.question.ifBlank { "Questão removida" },
                color = TextPrimary,
                fontWeight = FontWeight.SemiBold,
            )
            AnswerLine("Sua resposta", attempt.userAnswer ?: attempt.userTypedAnswer ?: "Sem resposta registrada")
            if (!attempt.isCorrect && attempt.correctAnswer.isNotBlank()) {
                AnswerLine("Resposta correta", attempt.correctAnswer)
            }
            attempt.explanation?.takeIf(String::isNotBlank)?.let { AnswerLine("Explicação", it) }
            if (attempt.durationMs > 0) {
                Text("Tempo: ${"%.1f".format(attempt.durationMs / 1000.0)} s", color = TextSecondary, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun AnswerLine(label: String, answer: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, color = TextSecondary, fontSize = 11.sp)
        Text(answer, color = TextPrimary, fontSize = 13.sp)
    }
}

private fun formatTimestamp(raw: String?): String {
    if (raw.isNullOrBlank()) return "Data indisponível"
    val normalized = raw.trim().replace(' ', 'T')
    val formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy · HH:mm")
    return try {
        OffsetDateTime.parse(normalized).atZoneSameInstant(ZoneId.systemDefault()).format(formatter)
    } catch (_: DateTimeParseException) {
        try {
            LocalDateTime.parse(normalized).atZone(ZoneId.systemDefault()).format(formatter)
        } catch (_: DateTimeParseException) {
            raw
        }
    }
}
