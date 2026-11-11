package com.synapse.features.questions.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import com.synapse.ui.theme.*

data class MobileQuestion(
    val id: String,
    val prompt: String,
    val options: List<String>,
    val correctIndex: Int,
    val explanation: String
)

@Composable
fun ZenQuizScreen() {
    val haptic = LocalHapticFeedback.current

    val questions = remember {
        listOf(
            MobileQuestion(
                id = "q1",
                prompt = "No protocolo Diffie-Hellman sobre curvas elípticas (ECDH), qual é a principal vantagem em relação ao Diffie-Hellman clássico baseado no problema do logaritmo discreto sobre corpos finitos?",
                options = listOf(
                    "Permite chaves significativamente menores para o mesmo nível equivalente de segurança criptográfica.",
                    "Dispensa completamente o uso de números primos grandes na geração dos parâmetros de domínio.",
                    "Torna a troca de chaves imune a ataques por computadores quânticos através do algoritmo de Shor.",
                    "Permite cifração direta de mensagens sem a necessidade de uma cifra simétrica auxiliar."
                ),
                correctIndex = 0,
                explanation = "As curvas elípticas oferecem segurança equivalente com chaves muito menores (ex: chave ECC de 256 bits equivale a RSA de 3072 bits), reduzindo drasticamente consumo de banda e CPU."
            ),
            MobileQuestion(
                id = "q2",
                prompt = "Qual modo de operação de cifra de bloco fornece simultaneamente confidencialidade e autenticação de integridade (AEAD) através da multiplicação em Galois Field GF(2^128)?",
                options = listOf(
                    "CBC (Cipher Block Chaining)",
                    "CTR (Counter Mode)",
                    "GCM (Galois/Counter Mode)",
                    "OFB (Output Feedback)"
                ),
                correctIndex = 2,
                explanation = "O AES-GCM combina o modo CTR para confidencialidade com o autenticador GMAC baseado em multiplicação polinomial em GF(2^128)."
            ),
            MobileQuestion(
                id = "q3",
                prompt = "No algoritmo FSRS v5 (Free Spaced Repetition Scheduler), quais são as três variáveis fundamentais de memória modeladas pelo DSR Model?",
                options = listOf(
                    "Dificuldade (D), Estabilidade (S) e Retrievabilidade (R)",
                    "Duração (D), Severidade (S) e Recorrência (R)",
                    "Densidade (D), Separação (S) e Retenção (R)",
                    "Divergência (D), Sensibilidade (S) e Repetição (R)"
                ),
                correctIndex = 0,
                explanation = "O FSRS v5 baseia-se no modelo DSR: D (Dificuldade do cartão), S (Estabilidade em dias) e R (Retrievabilidade percentual)."
            )
        )
    }

    var currentIndex by remember { mutableIntStateOf(0) }
    var selectedOption by remember { mutableIntStateOf(-1) }
    var isConfirmed by remember { mutableStateOf(false) }
    var showExplanation by remember { mutableStateOf(false) }
    var score by remember { mutableIntStateOf(0) }
    var isFinished by remember { mutableStateOf(false) }

    val currentQ = questions[currentIndex]
    val totalCount = questions.size

    val scrollState = rememberScrollState()

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
                    val isSelected = selectedOption == index
                    val isCorrect = index == currentQ.correctIndex

                    val cardBg = when {
                        !isConfirmed -> if (isSelected) DarkSurfaceElevated else DarkSurface
                        isCorrect -> CorrectEmeraldBg
                        isSelected && !isCorrect -> IncorrectRoseBg
                        else -> DarkSurface
                    }

                    val cardBorder = when {
                        !isConfirmed -> if (isSelected) BrandIndigo else DarkBorder
                        isCorrect -> CorrectEmerald
                        isSelected && !isCorrect -> IncorrectRose
                        else -> DarkBorder
                    }

                    val textColor = when {
                        !isConfirmed -> if (isSelected) Color.White else TextPrimary
                        isCorrect -> CorrectEmeraldText
                        isSelected && !isCorrect -> IncorrectRoseText
                        else -> TextSecondary
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(cardBg)
                            .border(1.dp, cardBorder, RoundedCornerShape(10.dp))
                            .clickable(enabled = !isConfirmed) {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                selectedOption = index
                            }
                            .padding(16.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            // Letter Badge (A, B, C, D)
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(if (isSelected) BrandIndigo else Color(0x26FFFFFF)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = ('A'.code + index).toChar().toString(),
                                    color = if (isSelected) Color.White else TextSecondary,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            Text(
                                text = optionText,
                                color = textColor,
                                fontSize = 15.sp,
                                lineHeight = 22.sp,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
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

