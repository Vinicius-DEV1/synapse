package com.synapse.features.questions.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.questions.model.QuestionsUiState
import com.synapse.ui.theme.AmberWarning
import com.synapse.ui.theme.AmberWarningBg
import com.synapse.ui.theme.AmberWarningText
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.DarkSurface
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun QuizStudyScreen(
    state: QuestionsUiState,
    onSelectOption: (Int) -> Unit,
    onConfirmOrContinue: () -> Unit,
    onToggleExplanation: () -> Unit,
    onReturn: () -> Unit,
) {
    val question = state.questions[state.currentIndex]
    val confirmed = state.outcome != null
    val scrollState = rememberScrollState()

    Column(modifier = Modifier.fillMaxSize().background(DarkCanvas)) {
        Column(modifier = Modifier.fillMaxWidth().background(DarkSurface)) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(state.sessionTitle, color = TextSecondary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                Text(
                    text = "${String.format("%02d", state.currentIndex + 1)} / ${String.format("%02d", state.questions.size)}",
                    color = TextPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                )
            }
            LinearProgressIndicator(
                progress = { (state.currentIndex + if (confirmed) 1f else 0.2f) / state.questions.size },
                modifier = Modifier.fillMaxWidth().height(2.dp),
                color = BrandIndigo,
                trackColor = Color(0x1AFFFFFF),
            )
        }

        Column(
            modifier = Modifier.weight(1f).fillMaxWidth().verticalScroll(scrollState).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            state.error?.let { Text(it, color = AmberWarningText, fontSize = 13.sp) }
            Text(question.prompt, color = TextPrimary, fontSize = 17.sp, lineHeight = 25.sp)
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                question.options.forEachIndexed { index, optionText ->
                    QuizAnswerOption(
                        index = index,
                        text = optionText,
                        selected = state.selectedOption == index,
                        correct = state.outcome?.correctIndex == index,
                        confirmed = confirmed,
                        onClick = { onSelectOption(index) },
                    )
                }
            }
            AnimatedVisibility(
                visible = confirmed && state.showExplanation,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut(),
            ) {
                Surface(
                    color = AmberWarningBg,
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, AmberWarning),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Gabarito", color = AmberWarningText, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        state.outcome?.let { outcome ->
                            Text(outcome.correctAnswer, color = Color(0xFFFEF3C7), fontSize = 14.sp)
                            outcome.explanation?.takeIf(String::isNotBlank)?.let { explanation ->
                                Text(explanation, color = Color(0xFFFEF3C7), fontSize = 14.sp, lineHeight = 20.sp)
                            }
                        }
                    }
                }
            }
        }

        Surface(color = DarkSurface, modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (confirmed) {
                    OutlinedButton(onClick = onToggleExplanation, enabled = !state.saving) {
                        Text(if (state.showExplanation) "Ocultar" else "Gabarito")
                    }
                }
                OutlinedButton(onClick = onReturn, enabled = !state.saving) { Text("Sair") }
                Button(
                    onClick = onConfirmOrContinue,
                    enabled = !state.saving && (confirmed || state.selectedOption >= 0),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = BrandIndigo,
                        disabledContainerColor = Color(0x26FFFFFF),
                    ),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.weight(1f).height(46.dp),
                ) {
                    if (state.saving) {
                        CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text(
                            text = when {
                                !confirmed -> "Confirmar Resposta"
                                state.currentIndex < state.questions.lastIndex -> "Próxima Questão →"
                                else -> "Finalizar Sessão 🎉"
                            },
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                        )
                    }
                }
            }
        }
    }
}
