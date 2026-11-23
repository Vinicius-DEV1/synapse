package com.synapse.features.focus.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.synapse.features.focus.viewmodel.FocusViewModel
import com.synapse.features.focus.ui.components.FocusHistoryDialog
import com.synapse.features.focus.ui.components.FocusAlarmsDialog
import com.synapse.features.focus.ui.components.FocusScreenHeader
import com.synapse.features.focus.ui.components.FocusLofiDialog
import com.synapse.features.focus.ui.components.FocusHelpDialog
import com.synapse.ui.theme.*
import androidx.core.content.ContextCompat

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FocusScreen() {
    val context = LocalContext.current.applicationContext
    val factory = remember(context) {
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = FocusViewModel(context) as T
        }
    }
    val viewModel: FocusViewModel = viewModel(factory = factory)
    val focusState by viewModel.state.collectAsState()
    var showHistory by remember { mutableStateOf(false) }
    var showAlarms by remember { mutableStateOf(false) }
    var showLofi by remember { mutableStateOf(false) }
    var showHelp by remember { mutableStateOf(false) }
    val audioPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        uri?.let(viewModel::importLofiTrack)
    }
    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
        viewModel::onNotificationPermissionResult,
    )
    val requestAlarmNotificationPermission: () -> Unit = {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
    val timer = focusState.timer
    val selectedPresetMinutes = timer.selectedPresetMinutes
    val timeLeftSeconds = timer.remainingSeconds
    val isRunning = timer.isRunning
    val activeSound = timer.activeSound

    LaunchedEffect(viewModel) { viewModel.refresh() }

    val minutes = timeLeftSeconds / 60
    val seconds = timeLeftSeconds % 60
    val timeFormatted = String.format("%02d:%02d", minutes, seconds)
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
            FocusScreenHeader(
                stats = focusState.stats,
                onOpenHelp = { showHelp = true },
                onOpenLofi = { showLofi = true },
                onOpenAlarms = { showAlarms = true },
                onOpenHistory = { showHistory = true },
            )

            if (focusState.error != null) {
                Text(focusState.error.orEmpty(), color = IncorrectRoseText, fontSize = 12.sp)
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
                                viewModel.selectPreset(mins)
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
                        viewModel.resetTimer()
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
                    onClick = viewModel::toggleTimer,
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
                        viewModel.skipMinute()
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
                                    viewModel.toggleSound(key)
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

    if (showHistory) {
        FocusHistoryDialog(focusState.sessions) { showHistory = false }
    }
    if (showAlarms) {
        FocusAlarmsDialog(
            alarms = focusState.alarms,
            saving = focusState.saving,
            onDismiss = { showAlarms = false },
            onCreate = { time, label ->
                viewModel.createAlarm(time, label)
                requestAlarmNotificationPermission()
            },
            onToggle = { id, enabled ->
                viewModel.setAlarmEnabled(id, enabled)
                if (enabled) requestAlarmNotificationPermission()
            },
            onDelete = viewModel::deleteAlarm,
        )
    }
    if (showLofi) {
        FocusLofiDialog(
            tracks = focusState.lofiTracks,
            activeTrackId = focusState.activeLofiId,
            isPlaying = focusState.isLofiPlaying,
            saving = focusState.saving,
            onDismiss = { showLofi = false },
            onImport = { audioPicker.launch(arrayOf("audio/*")) },
            onTogglePlayback = viewModel::toggleLofiTrack,
            onDelete = viewModel::deleteLofiTrack,
        )
    }
    if (showHelp) FocusHelpDialog(onDismiss = { showHelp = false })
}
