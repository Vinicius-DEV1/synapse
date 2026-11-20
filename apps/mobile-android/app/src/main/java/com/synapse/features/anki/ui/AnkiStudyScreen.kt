package com.synapse.features.anki.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.core.SynapseFsrs
import com.synapse.ui.theme.*

data class CardItem(
    val id: String,
    val front: String,
    val back: String,
    val stability: Double = 0.0,
    val difficulty: Double = 0.0
)

@Composable
fun AnkiStudyScreen(
    cards: List<CardItem>,
    deckName: String = "Flashcards",
    onFinish: () -> Unit = {}
) {
    var currentIndex by remember { mutableStateOf(0) }
    var isAnswerRevealed by remember { mutableStateOf(false) }
    val fsrs = remember(cards.isEmpty()) {
        if (cards.isEmpty()) null else SynapseFsrs()
    }

    DisposableEffect(fsrs) {
        onDispose {
            fsrs?.close()
        }
    }

    if (cards.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(DarkCanvas),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Nenhum cartão neste baralho.",
                color = TextSecondary,
                fontSize = 16.sp
            )
        }
        return
    }

    val currentCard = cards[currentIndex]

    fun rateCard(rating: Byte) {
        // Calculate new FSRS interval
        checkNotNull(fsrs).review(
            stability = currentCard.stability,
            difficulty = currentCard.difficulty,
            state = 0,
            rating = rating,
            elapsedDays = 0
        )

        if (currentIndex + 1 < cards.size) {
            currentIndex++
            isAnswerRevealed = false
        } else {
            onFinish()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkCanvas)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = deckName,
                    color = BrandPurple,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Cartão ${currentIndex + 1} de ${cards.size}",
                    color = TextSecondary,
                    fontSize = 12.sp
                )
            }

            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0x1AFFFFFF))
                    .clickable { onFinish() },
                contentAlignment = Alignment.Center
            ) {
                Text(text = "✕", color = TextSecondary, fontSize = 16.sp)
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Main Flashcard Surface
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .clip(RoundedCornerShape(20.dp))
                .background(Color(0xFF1A1924))
                .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(20.dp))
                .padding(28.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "FRENTE",
                    color = BrandPurple,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.5.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = currentCard.front,
                    color = TextPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )

                AnimatedVisibility(visible = isAnswerRevealed) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Spacer(modifier = Modifier.height(24.dp))
                        HorizontalDivider(color = Color(0x1AFFFFFF), thickness = 1.dp)
                        Spacer(modifier = Modifier.height(20.dp))

                        Text(
                            text = "VERSO",
                            color = CorrectEmerald,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.5.sp
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = currentCard.back,
                            color = TextSecondary,
                            fontSize = 18.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // Bottom Rating Action Dock
        if (!isAnswerRevealed) {
            Button(
                onClick = { isAnswerRevealed = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandPurple),
                shape = RoundedCornerShape(27.dp)
            ) {
                Text(
                    text = "Mostrar Resposta",
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Again
                RatingButton(
                    modifier = Modifier.weight(1f),
                    label = "Errei",
                    sub = "Again",
                    color = IncorrectRose,
                    onClick = { rateCard(1) }
                )
                // Hard
                RatingButton(
                    modifier = Modifier.weight(1f),
                    label = "Difícil",
                    sub = "Hard",
                    color = AmberWarning,
                    onClick = { rateCard(2) }
                )
                // Good
                RatingButton(
                    modifier = Modifier.weight(1f),
                    label = "Bom",
                    sub = "Good",
                    color = CorrectEmerald,
                    onClick = { rateCard(3) }
                )
                // Easy
                RatingButton(
                    modifier = Modifier.weight(1f),
                    label = "Fácil",
                    sub = "Easy",
                    color = Color(0xFF38BDF8),
                    onClick = { rateCard(4) }
                )
            }
        }
    }
}

@Composable
private fun RatingButton(
    modifier: Modifier = Modifier,
    label: String,
    sub: String,
    color: Color,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .height(56.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF1A1924))
            .border(1.dp, color.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = label,
                color = color,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = sub,
                color = TextMuted,
                fontSize = 9.sp
            )
        }
    }
}

