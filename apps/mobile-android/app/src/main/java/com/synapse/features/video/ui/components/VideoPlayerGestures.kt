package com.synapse.features.video.ui.components

import android.app.Activity
import android.media.AudioManager
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.media3.exoplayer.ExoPlayer
import com.synapse.features.video.VIDEO_SKIP_INTERVAL_MS

fun Modifier.videoPlayerGestures(
    player: ExoPlayer,
    activity: Activity?,
    audioManager: AudioManager,
    haptic: HapticFeedback,
    durationMs: Long,
    onToggleControls: () -> Unit,
    onPositionChanged: (Long) -> Unit,
): Modifier = pointerInput(player) {
    detectTapGestures(
        onTap = { onToggleControls() },
        onDoubleTap = { offset ->
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            val position = if (offset.x < size.width / 2) {
                (player.currentPosition - VIDEO_SKIP_INTERVAL_MS).coerceAtLeast(0L)
            } else {
                (player.currentPosition + VIDEO_SKIP_INTERVAL_MS).coerceAtMost(durationMs)
            }
            player.seekTo(position)
            onPositionChanged(position)
        },
    )
}.pointerInput(player, activity, audioManager) {
    detectVerticalDragGestures { change, dragAmount ->
        if (change.position.x < size.width / 2) {
            activity?.window?.let { window ->
                val attributes = window.attributes
                val current = if (attributes.screenBrightness < 0) DEFAULT_SCREEN_BRIGHTNESS else attributes.screenBrightness
                attributes.screenBrightness = (current - dragAmount / BRIGHTNESS_SENSITIVITY).coerceIn(MIN_SCREEN_BRIGHTNESS, 1.0f)
                window.attributes = attributes
            }
        } else {
            val maximum = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val current = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
            val step = if (dragAmount < 0) 1 else -1
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, (current + step).coerceIn(0, maximum), 0)
        }
    }
}

private const val DEFAULT_SCREEN_BRIGHTNESS = 0.5f
private const val MIN_SCREEN_BRIGHTNESS = 0.01f
private const val BRIGHTNESS_SENSITIVITY = 1000f
