package com.synapse.features.video.ui

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.Context
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.util.Rational
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import com.synapse.features.video.ui.components.VideoPlayerControls
import com.synapse.media.EncryptedChunkDataSource
import com.synapse.ui.theme.BrandIndigo
import com.synapse.ui.theme.BrandIndigoLight
import com.synapse.ui.theme.DarkSurfaceElevated
import kotlinx.coroutines.delay
import java.io.File

@OptIn(UnstableApi::class)
@Composable
fun VideoPlayerScreen(
    videoPath: String? = null,
    keyHex: String? = null,
) {
    val activeVideoPath = videoPath?.takeIf(String::isNotBlank)
    val activeKeyHex = keyHex?.takeIf(String::isNotBlank)
    if (activeVideoPath == null || activeKeyHex == null) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black),
            contentAlignment = Alignment.Center,
        ) {
            Text("Nenhum vídeo selecionado.", color = Color.White, fontSize = 16.sp)
        }
        return
    }

    val context = LocalContext.current
    val activity = context as? Activity
    val haptic = LocalHapticFeedback.current

    var isPlaying by remember { mutableStateOf(false) }
    var currentPositionMs by remember { mutableLongStateOf(0L) }
    var durationMs by remember { mutableLongStateOf(1L) }
    var controlsVisible by remember { mutableStateOf(true) }
    var toastMessage by remember { mutableStateOf<String?>(null) }
    var playbackSpeed by remember { mutableFloatStateOf(1.0f) }

    val audioManager = remember { context.getSystemService(Context.AUDIO_SERVICE) as AudioManager }

    val exoPlayer = remember(context, activeVideoPath, activeKeyHex) {
        val dataSourceFactory = EncryptedChunkDataSource.Factory(activeKeyHex)
        val mediaSourceFactory = DefaultMediaSourceFactory(context).setDataSourceFactory(dataSourceFactory)

        ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .build()
            .apply {
                val uri = Uri.fromFile(File(activeVideoPath))
                setMediaItem(MediaItem.fromUri(uri))
                prepare()
                playWhenReady = false

                addListener(object : Player.Listener {
                    override fun onIsPlayingChanged(playing: Boolean) {
                        isPlaying = playing
                    }

                    override fun onPlaybackStateChanged(playbackState: Int) {
                        if (playbackState == Player.STATE_READY) {
                            durationMs = duration.coerceAtLeast(1L)
                        }
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        toastMessage = "Não foi possível reproduzir o vídeo: ${error.errorCodeName}"
                    }
                })
            }
    }

    // Auto-update playback progress
    LaunchedEffect(isPlaying, exoPlayer) {
        while (isPlaying) {
            currentPositionMs = exoPlayer.currentPosition
            delay(500)
        }
    }

    // Auto-hide controls
    LaunchedEffect(controlsVisible, isPlaying) {
        if (controlsVisible && isPlaying) {
            delay(4000)
            controlsVisible = false
        }
    }

    // Cleanup ExoPlayer on dispose
    DisposableEffect(exoPlayer) {
        onDispose {
            exoPlayer.release()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .pointerInput(exoPlayer) {
                detectTapGestures(
                    onTap = { controlsVisible = !controlsVisible },
                    onDoubleTap = { offset ->
                        val screenWidth = size.width
                        if (offset.x < screenWidth / 2) {
                            // Rewind 10s
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            val newPos = (exoPlayer.currentPosition - 10000).coerceAtLeast(0)
                            exoPlayer.seekTo(newPos)
                            currentPositionMs = newPos
                        } else {
                            // Forward 10s
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            val newPos = (exoPlayer.currentPosition + 10000).coerceAtMost(durationMs)
                            exoPlayer.seekTo(newPos)
                            currentPositionMs = newPos
                        }
                    }
                )
            }
            .pointerInput(exoPlayer) {
                detectVerticalDragGestures { change, dragAmount ->
                    val screenWidth = size.width
                    if (change.position.x < screenWidth / 2) {
                        // Left side swipe: adjust Screen Brightness
                        activity?.window?.let { window ->
                            val attrs = window.attributes
                            val currentBrightness = if (attrs.screenBrightness < 0) 0.5f else attrs.screenBrightness
                            val newBrightness = (currentBrightness - dragAmount / 1000f).coerceIn(0.01f, 1.0f)
                            attrs.screenBrightness = newBrightness
                            window.attributes = attrs
                        }
                    } else {
                        // Right side swipe: adjust Volume
                        val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                        val currentVol = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
                        val delta = if (dragAmount < 0) 1 else -1
                        audioManager.setStreamVolume(
                            AudioManager.STREAM_MUSIC,
                            (currentVol + delta).coerceIn(0, maxVol),
                            0
                        )
                    }
                }
            }
    ) {
        // Native ExoPlayer View
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = false
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                }
            }
        )

        // Playback error notification
        toastMessage?.let { msg ->
            LaunchedEffect(msg) {
                delay(2500)
                toastMessage = null
            }
            Surface(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 48.dp),
                color = DarkSurfaceElevated,
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, BrandIndigo)
            ) {
                Text(
                    text = msg,
                    color = BrandIndigoLight,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
        }

        VideoPlayerControls(
            visible = controlsVisible,
            videoTitle = File(activeVideoPath).nameWithoutExtension.ifBlank { "Vídeo" },
            isPlaying = isPlaying,
            currentPositionMs = currentPositionMs,
            durationMs = durationMs,
            playbackSpeed = playbackSpeed,
            onPlaybackSpeedChange = { speed ->
                playbackSpeed = speed
                exoPlayer.setPlaybackSpeed(speed)
            },
            onTogglePlayback = { if (isPlaying) exoPlayer.pause() else exoPlayer.play() },
            onSkipBackward = {
                exoPlayer.seekTo((exoPlayer.currentPosition - 10000).coerceAtLeast(0))
            },
            onSkipForward = {
                exoPlayer.seekTo((exoPlayer.currentPosition + 10000).coerceAtMost(durationMs))
            },
            onScrub = { newPosition ->
                currentPositionMs = newPosition
                exoPlayer.seekTo(newPosition)
            },
            onEnterPictureInPicture = {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val params = PictureInPictureParams.Builder()
                        .setAspectRatio(Rational(16, 9))
                        .build()
                    activity?.enterPictureInPictureMode(params)
                }
            }
        )
    }
}

