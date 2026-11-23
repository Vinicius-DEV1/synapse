package com.synapse.features.anki.ui

import android.media.AudioManager
import android.media.ToneGenerator
import android.view.KeyEvent as NativeKeyEvent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.LaunchedEffect
import com.synapse.features.anki.model.AnkiCard
import com.synapse.features.settings.model.AndroidSettings
import com.synapse.R
import com.synapse.ui.theme.AmberWarning
import com.synapse.ui.theme.BrandPurple
import com.synapse.ui.theme.CorrectEmerald
import com.synapse.ui.theme.DarkCanvas
import com.synapse.ui.theme.IncorrectRose
import com.synapse.ui.theme.TextMuted
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary

@Composable
fun AnkiStudyScreen(
    card: AnkiCard,
    deckName: String,
    cardIndex: Int,
    totalCards: Int,
    answerRevealed: Boolean,
    saving: Boolean,
    error: String?,
    settings: AndroidSettings,
    onReveal: () -> Unit,
    onRate: (Int) -> Unit,
    onFinish: () -> Unit,
) {
    val context = LocalContext.current
    val toneGenerator = remember(context) {
        ToneGenerator(AudioManager.STREAM_MUSIC, STUDY_TONE_VOLUME)
    }
    val focusRequester = remember { FocusRequester() }
    val flipRotation = animateFloatAsState(
        targetValue = if (settings.study3DFlip && answerRevealed) 180f else 0f,
        animationSpec = tween(durationMillis = CARD_FLIP_DURATION_MS),
        label = "anki-card-flip",
    )
    DisposableEffect(toneGenerator) {
        onDispose { toneGenerator.release() }
    }

    val rateCard: (Int) -> Unit = { grade ->
        if (settings.studySoundEffects) {
            val tone = when (grade) {
                1 -> ToneGenerator.TONE_PROP_NACK
                2 -> ToneGenerator.TONE_PROP_BEEP
                else -> ToneGenerator.TONE_PROP_ACK
            }
            toneGenerator.startTone(tone, STUDY_TONE_DURATION_MS)
        }
        onRate(grade)
    }
    val revealAnswer: () -> Unit = {
        if (settings.studySoundEffects) toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP, STUDY_TONE_DURATION_MS)
        onReveal()
    }

    LaunchedEffect(focusRequester) { focusRequester.requestFocus() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .focusRequester(focusRequester)
            .focusable()
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                if (event.nativeKeyEvent.repeatCount > 0) return@onPreviewKeyEvent true
                when (event.nativeKeyEvent.keyCode) {
                    NativeKeyEvent.KEYCODE_ESCAPE -> {
                        if (!saving) onFinish()
                        true
                    }
                    NativeKeyEvent.KEYCODE_SPACE -> {
                        if (!answerRevealed) revealAnswer()
                        true
                    }
                    NativeKeyEvent.KEYCODE_1, NativeKeyEvent.KEYCODE_NUMPAD_1 -> {
                        if (answerRevealed && !saving) rateCard(1)
                        true
                    }
                    NativeKeyEvent.KEYCODE_2, NativeKeyEvent.KEYCODE_NUMPAD_2 -> {
                        if (answerRevealed && !saving) rateCard(2)
                        true
                    }
                    NativeKeyEvent.KEYCODE_3, NativeKeyEvent.KEYCODE_NUMPAD_3 -> {
                        if (answerRevealed && !saving) rateCard(3)
                        true
                    }
                    NativeKeyEvent.KEYCODE_4, NativeKeyEvent.KEYCODE_NUMPAD_4 -> {
                        if (answerRevealed && !saving) rateCard(4)
                        true
                    }
                    else -> false
                }
            }
            .background(DarkCanvas)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(deckName, color = BrandPurple, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                Text("Cartão $cardIndex de $totalCards", color = TextSecondary, fontSize = 12.sp)
            }
            Text(stringResource(R.string.anki_shortcut_escape), color = TextMuted, fontSize = 10.sp)
            IconButton(onClick = onFinish, enabled = !saving) {
                Icon(Icons.Default.Close, contentDescription = "Sair da revisão", tint = TextSecondary)
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .clip(RoundedCornerShape(20.dp))
                .background(Color(0xFF1A1924))
                .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(20.dp))
                .padding(28.dp),
            contentAlignment = Alignment.Center,
        ) {
            if (settings.study3DFlip) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .graphicsLayer {
                            rotationY = flipRotation.value
                            cameraDistance = CARD_CAMERA_DISTANCE_MULTIPLIER * density
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    if (flipRotation.value <= 90f) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("FRENTE", color = BrandPurple, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(card.front, color = TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                        }
                    } else {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .graphicsLayer { rotationY = 180f },
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text("FRENTE", color = BrandPurple, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(card.front, color = TextSecondary, fontSize = 16.sp, textAlign = TextAlign.Center)
                            Spacer(modifier = Modifier.height(20.dp))
                            HorizontalDivider(color = Color(0x1AFFFFFF), thickness = 1.dp)
                            Spacer(modifier = Modifier.height(20.dp))
                            Text("VERSO", color = CorrectEmerald, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(card.back, color = TextPrimary, fontSize = 20.sp, textAlign = TextAlign.Center)
                        }
                    }
                }
            } else {
                Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("FRENTE", color = BrandPurple, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(card.front, color = TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                    AnimatedVisibility(visible = answerRevealed) {
                        Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                            Spacer(modifier = Modifier.height(24.dp))
                            HorizontalDivider(color = Color(0x1AFFFFFF), thickness = 1.dp)
                            Spacer(modifier = Modifier.height(20.dp))
                            Text("VERSO", color = CorrectEmerald, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(card.back, color = TextSecondary, fontSize = 18.sp, textAlign = TextAlign.Center)
                        }
                    }
                }
            }
        }

        if (error != null) {
            Text(error, color = IncorrectRose, fontSize = 13.sp, modifier = Modifier.padding(top = 12.dp))
        }
        Spacer(modifier = Modifier.height(28.dp))
        if (!answerRevealed) {
            Button(
                onClick = revealAnswer,
                modifier = Modifier.fillMaxWidth().height(54.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandPurple),
                shape = RoundedCornerShape(27.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Mostrar resposta", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    Text(stringResource(R.string.anki_shortcut_space), color = Color.White.copy(alpha = 0.7f), fontSize = 10.sp)
                }
            }
        } else {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                RatingButton(Modifier.weight(1f), "Errei", stringResource(R.string.anki_shortcut_again), IncorrectRose, saving) { rateCard(1) }
                RatingButton(Modifier.weight(1f), "Difícil", stringResource(R.string.anki_shortcut_hard), AmberWarning, saving) { rateCard(2) }
                RatingButton(Modifier.weight(1f), "Bom", stringResource(R.string.anki_shortcut_good), CorrectEmerald, saving) { rateCard(3) }
                RatingButton(Modifier.weight(1f), "Fácil", stringResource(R.string.anki_shortcut_easy), Color(0xFF38BDF8), saving) { rateCard(4) }
            }
        }
    }
}

private const val CARD_FLIP_DURATION_MS = 420
private const val CARD_CAMERA_DISTANCE_MULTIPLIER = 12f
private const val STUDY_TONE_DURATION_MS = 90
private const val STUDY_TONE_VOLUME = 65

@Composable
private fun RatingButton(
    modifier: Modifier,
    label: String,
    subtitle: String,
    color: Color,
    saving: Boolean,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .height(56.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF1A1924))
            .border(1.dp, color.copy(alpha = if (saving) 0.18f else 0.35f), RoundedCornerShape(12.dp))
            .clickable(enabled = !saving, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, color = color.copy(alpha = if (saving) 0.5f else 1f), fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Text(subtitle, color = TextMuted, fontSize = 9.sp)
        }
    }
}
