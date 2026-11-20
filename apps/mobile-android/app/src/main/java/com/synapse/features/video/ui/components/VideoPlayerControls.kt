package com.synapse.features.video.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.FastRewind
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PictureInPicture
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.synapse.ui.theme.BrandIndigo

@Composable
fun VideoPlayerControls(
    visible: Boolean,
    videoTitle: String,
    isPlaying: Boolean,
    currentPositionMs: Long,
    durationMs: Long,
    playbackSpeed: Float,
    onPlaybackSpeedChange: (Float) -> Unit,
    onTogglePlayback: () -> Unit,
    onSkipBackward: () -> Unit,
    onSkipForward: () -> Unit,
    onScrub: (Long) -> Unit,
    onEnterPictureInPicture: () -> Unit
) {
    val playbackSpeeds = remember { listOf(0.75f, 1.0f, 1.25f, 1.5f, 2.0f) }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = Modifier.fillMaxSize()
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0x80000000))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "🎬 $videoTitle",
                    color = Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0x33FFFFFF),
                        modifier = Modifier.clickable {
                            val nextIndex = (playbackSpeeds.indexOf(playbackSpeed) + 1) % playbackSpeeds.size
                            onPlaybackSpeedChange(playbackSpeeds[nextIndex])
                        }
                    ) {
                        Text(
                            text = "${playbackSpeed}x",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                    IconButton(onClick = onEnterPictureInPicture) {
                        Icon(
                            imageVector = Icons.Default.PictureInPicture,
                            contentDescription = "Picture in Picture",
                            tint = Color.White
                        )
                    }
                }
            }
            Row(
                modifier = Modifier.align(Alignment.Center),
                horizontalArrangement = Arrangement.spacedBy(32.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onSkipBackward) {
                    Icon(
                        imageVector = Icons.Default.FastRewind,
                        contentDescription = "Rewind 10s",
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                }
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(BrandIndigo)
                        .clickable(onClick = onTogglePlayback),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = if (isPlaying) "Pause" else "Play",
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                }
                IconButton(onClick = onSkipForward) {
                    Icon(
                        imageVector = Icons.Default.FastForward,
                        contentDescription = "Forward 10s",
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                }
            }
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Slider(
                    value = currentPositionMs.toFloat(),
                    onValueChange = { onScrub(it.toLong()) },
                    valueRange = 0f..durationMs.toFloat(),
                    colors = SliderDefaults.colors(
                        thumbColor = Color.White,
                        activeTrackColor = BrandIndigo,
                        inactiveTrackColor = Color(0x40FFFFFF)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = formatMs(currentPositionMs),
                        color = Color(0xFFD4D4D8),
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = formatMs(durationMs),
                        color = Color(0xFFD4D4D8),
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }
}

private fun formatMs(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format("%02d:%02d", minutes, seconds)
}
