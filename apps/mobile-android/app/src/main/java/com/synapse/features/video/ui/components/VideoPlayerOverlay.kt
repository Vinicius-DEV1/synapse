package com.synapse.features.video.ui.components

import androidx.annotation.OptIn
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import com.synapse.R
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.DarkSurfaceElevated
import com.synapse.ui.theme.TextPrimary
import com.synapse.ui.theme.TextSecondary
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
fun BoxScope.VideoPlayerOverlay(
    player: ExoPlayer,
    videoTitle: String,
    isPlaying: Boolean,
    currentPositionMs: Long,
    durationMs: Long,
    playbackSpeed: Float,
    controlsVisible: Boolean,
    toastMessage: String?,
    showResumePrompt: Boolean,
    initialPositionMs: Long,
    onToastDismiss: () -> Unit,
    onPlaybackSpeedChange: (Float) -> Unit,
    onTogglePlayback: () -> Unit,
    onSkipBackward: () -> Unit,
    onSkipForward: () -> Unit,
    onScrub: (Long) -> Unit,
    onBack: () -> Unit,
    onEnterPictureInPicture: () -> Unit,
    onResumePromptDismiss: () -> Unit,
    onResume: () -> Unit,
    onStartOver: () -> Unit,
) {
    toastMessage?.let { message ->
        LaunchedEffect(message) {
            delay(2500)
            onToastDismiss()
        }
        Surface(
            modifier = Modifier.align(Alignment.TopCenter).padding(top = 48.dp),
            color = DarkSurfaceElevated,
            shape = RoundedCornerShape(20.dp),
            border = BorderStroke(1.dp, BrandIndigo),
        ) {
            Text(
                text = message,
                color = BrandIndigoLight,
                fontSize = 13.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }
    }

    VideoPlayerControls(
        visible = controlsVisible,
        videoTitle = videoTitle,
        isPlaying = isPlaying,
        currentPositionMs = currentPositionMs,
        durationMs = durationMs,
        playbackSpeed = playbackSpeed,
        onPlaybackSpeedChange = onPlaybackSpeedChange,
        onTogglePlayback = onTogglePlayback,
        onSkipBackward = onSkipBackward,
        onSkipForward = onSkipForward,
        onScrub = onScrub,
        onEnterPictureInPicture = onEnterPictureInPicture,
        onBack = onBack,
    )

    if (showResumePrompt) {
        val totalSeconds = initialPositionMs / MILLIS_PER_SECOND
        val resumePosition = stringResource(
            R.string.video_player_position_format,
            (totalSeconds / SECONDS_PER_MINUTE).toInt(),
            (totalSeconds % SECONDS_PER_MINUTE).toInt(),
        )
        AlertDialog(
            onDismissRequest = onResumePromptDismiss,
            containerColor = DarkSurfaceElevated,
            title = { Text(videoTitle, color = TextPrimary) },
            text = { Text(stringResource(R.string.video_player_resume_prompt, resumePosition), color = TextSecondary) },
            confirmButton = {
                TextButton(onClick = onResume) {
                    Text(stringResource(R.string.video_player_resume), color = BrandIndigoLight)
                }
            },
            dismissButton = {
                TextButton(onClick = onStartOver) {
                    Text(stringResource(R.string.video_player_start_over), color = TextSecondary)
                }
            },
        )
    }
}

private const val MILLIS_PER_SECOND = 1000L
private const val SECONDS_PER_MINUTE = 60L
