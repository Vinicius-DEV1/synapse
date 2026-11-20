package com.synapse.features.questions.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.features.questions.data.CURATED_MOBILE_QUESTIONS
import com.synapse.features.questions.ui.components.QuizAnswerOption
import com.synapse.features.questions.ui.components.QuizCompletionScreen
import com.synapse.ui.theme.*

@Composable
fun ZenQuizScreen() {
    val haptic = LocalHapticFeedback.current

    val questions = CURATED_MOBILE_QUESTIONS

    var currentIndex by remember { mutableIntStateOf(0) }
    var selectedOption by remember { mutableIntStateOf(-1) }
    var isConfirmed by remember { mutableStateOf(false) }
    var showExplanation by remember { mutableStateOf(false) }
    var score by remember { mutableIntStateOf(0) }
    var isFinished by remember { mutableStateOf(false) }

    val currentQ = questions[currentIndex]
    val totalCount = questions.size

    val scrollState = rememberScrollState()

    LaunchedEffect(currentIndex) {
        scrollState.scrollTo(0)
    }

    if (isFinished) {
        QuizCompletionScreen(
            score = score,
            totalQuestions = totalCount,
            onRestart = {
                currentIndex = 0
                selectedOption = -1
                isConfirmed = false
                showExplanation = false
                score = 0
                isFinished = false
            },
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkCanvas)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        // Minimalist Top Bar with Progress Line
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(DarkSurface)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "🎯 Modo Zen Focus",
                    color = TextSecondary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "${String.format("%02d", currentIndex + 1)} / ${String.format("%02d", totalCount)}",
                    color = TextPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
            }

            // 2px Progress Indicator
            LinearProgressIndicator(
                progress = { (currentIndex + (if (isConfirmed) 1f else 0.2f)) / totalCount },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(2.dp),
                color = BrandIndigo,
                trackColor = Color(0x1AFFFFFF),
            )
        }

        // Scrollable Reading and Question Area
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(scrollState)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Enunciado
            Text(
                text = currentQ.prompt,
                color = TextPrimary,
                fontSize = 17.sp,
                fontWeight = FontWeight.Normal,
                lineHeight = 25.sp
            )

            // Options List
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                currentQ.options.forEachIndexed { index, optionText ->
                    QuizAnswerOption(
                        index = index,
                        text = optionText,
                        selected = selectedOption == index,
                        correct = index == currentQ.correctIndex,
                        confirmed = isConfirmed,
                        onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                selectedOption = index
                        },
                    )
                }
            }

            // Gabarito / Explanation Box
            AnimatedVisibility(
                visible = isConfirmed && showExplanation,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                Surface(
                    color = AmberWarningBg,
                    shape = RoundedCornerShape(10.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, AmberWarning),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "💡 Explicação do Gabarito",
                            color = AmberWarningText,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = currentQ.explanation,
                            color = Color(0xFFFEF3C7),
                            fontSize = 14.sp,
                            lineHeight = 20.sp
                        )
                    }
                }
            }
        }

        // Bottom Action Bar
        Surface(
            color = DarkSurface,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isConfirmed) {
                    OutlinedButton(
                        onClick = { showExplanation = !showExplanation },
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = AmberWarningText)
                    ) {
                        Text(text = if (showExplanation) "Ocultar" else "Gabarito")
                    }
                }

                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        if (!isConfirmed) {
                            if (selectedOption != -1) {
                                isConfirmed = true
                                if (selectedOption == currentQ.correctIndex) {
                                    score++
                                }
                            }
                        } else {
                            if (currentIndex < totalCount - 1) {
                                currentIndex++
                                selectedOption = -1
                                isConfirmed = false
                                showExplanation = false
                            } else {
                                isFinished = true
                            }
                        }
                    },
                    enabled = selectedOption != -1,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = BrandIndigo,
                        disabledContainerColor = Color(0x26FFFFFF)
                    ),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.weight(1f).height(46.dp)
                ) {
                    Text(
                        text = when {
                            !isConfirmed -> "Confirmar Resposta"
                            currentIndex < totalCount - 1 -> "Próxima Questão →"
                            else -> "Finalizar Sessão 🎉"
                        },
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

