package com.synapse.features.focus.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FocusScreen() {
    var selectedPresetMinutes by remember { mutableStateOf(25) }
    var timeLeftSeconds by remember { mutableStateOf(25 * 60) }
    var isRunning by remember { mutableStateOf(false) }
    var sessionsCompletedToday by remember { mutableStateOf(0) }
    var focusMinutesCompletedToday by remember { mutableStateOf(0) }
    var activeSound by remember { mutableStateOf<String?>("chuva") }

    LaunchedEffect(isRunning, timeLeftSeconds) {
        if (isRunning && timeLeftSeconds > 0) {
            delay(1000L)
            timeLeftSeconds--
        } else if (timeLeftSeconds == 0 && isRunning) {
            isRunning = false
            sessionsCompletedToday++
            focusMinutesCompletedToday += selectedPresetMinutes
            timeLeftSeconds = selectedPresetMinutes * 60
        }
    }

    val minutes = timeLeftSeconds / 60
    val seconds = timeLeftSeconds % 60
    val timeFormatted = String.format("%02d:%02d", minutes, seconds)
    val totalSeconds = selectedPresetMinutes * 60
    val progress = if (totalSeconds > 0) (totalSeconds - timeLeftSeconds).toFloat() / totalSeconds else 0f

    val ambientSounds = listOf(
        "chuva" to "🌧️ Chuva",
        "cafe" to "☕ Café",
        "lareira" to "🔥 Fogo",
        "floresta" to "🍃 Floresta",
        "ondas" to "🌊 Ondas"
    )

    Scaffold(
        containerColor = DarkCanvas
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Foco & Lo-Fi Pomodoro",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "$sessionsCompletedToday ciclos concluídos hoje ($focusMinutesCompletedToday min)",
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
                        Icons.Default.HourglassTop,
                        contentDescription = "Foco",
                        tint = BrandIndigoLight,
                        modifier = Modifier.padding(8.dp)
                    )
                }
            }

            // Presets Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(DarkSurface)
                    .border(1.dp, DarkBorder, RoundedCornerShape(12.dp))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                listOf(15 to "15m", 25 to "25m Foco", 45 to "45m", 5 to "5m Pausa").forEach { (mins, label) ->
                    val isSel = selectedPresetMinutes == mins
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSel) DarkSurfaceElevated else Color.Transparent)
                            .clickable {
                                selectedPresetMinutes = mins
                                timeLeftSeconds = mins * 60
                                isRunning = false
                            }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            fontSize = 12.sp,
                            fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSel) BrandIndigoLight else TextSecondary
                        )
                    }
                }
            }

            // Big Timer Display
            Box(
                modifier = Modifier
                    .size(240.dp)
                    .clip(CircleShape)
                    .background(DarkSurface)
                    .border(3.dp, BrandIndigo.copy(alpha = 0.4f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = timeFormatted,
                        fontSize = 48.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = if (isRunning) "EM FOCO" else "PAUSADO",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isRunning) CorrectEmeraldText else TextMuted
                    )
                }
            }

            // Controls (Start / Pause / Reset)
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = {
                        isRunning = false
                        timeLeftSeconds = selectedPresetMinutes * 60
                    },
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(DarkSurfaceElevated)
                        .border(1.dp, DarkBorder, CircleShape)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = "Reiniciar", tint = TextSecondary)
                }

                Button(
                    onClick = { isRunning = !isRunning },
                    modifier = Modifier
                        .height(56.dp)
                        .width(140.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isRunning) IncorrectRose else BrandIndigo
                    ),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text(
                        text = if (isRunning) "Pausar" else "Iniciar",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                IconButton(
                    onClick = {
                        timeLeftSeconds = maxOf(0, timeLeftSeconds - 60)
                    },
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(DarkSurfaceElevated)
                        .border(1.dp, DarkBorder, CircleShape)
                ) {
                    Icon(Icons.Default.FastForward, contentDescription = "Adiantar 1m", tint = TextSecondary)
                }
            }

            // Ambient Sounds
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Sons Ambientes",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextSecondary
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ambientSounds.forEach { (key, label) ->
                        val isSoundActive = activeSound == key
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(8.dp))
                                .clickable {
                                    activeSound = if (isSoundActive) null else key
                                },
                            color = if (isSoundActive) BrandIndigo.copy(alpha = 0.25f) else DarkSurface,
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (isSoundActive) BrandIndigo else DarkBorder
                            )
                        ) {
                            Text(
                                text = label,
                                fontSize = 11.sp,
                                fontWeight = if (isSoundActive) FontWeight.Bold else FontWeight.Normal,
                                color = if (isSoundActive) Color.White else TextSecondary,
                                modifier = Modifier.padding(vertical = 8.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                }
            }
        }
    }
}
