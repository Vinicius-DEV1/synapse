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
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import com.synapse.features.video.ui.components.VideoPlayerOverlay
import com.synapse.features.video.ui.components.videoPlayerGestures
import com.synapse.features.video.VIDEO_SKIP_INTERVAL_MS
import com.synapse.media.EncryptedChunkDataSource
import com.synapse.R
import kotlinx.coroutines.delay
import java.io.File

@OptIn(UnstableApi::class)
@Composable
fun VideoPlayerScreen(
    videoPath: String? = null,
    keyHex: String? = null,
    videoTitle: String = "Video",
    initialProgressSeconds: Double = 0.0,
    onProgressSeconds: (Double) -> Unit = {},
    onDurationSeconds: (Double) -> Unit = {},
    onBack: () -> Unit = {},
) {
    val activeVideoPath = videoPath?.takeIf(String::isNotBlank)
    val activeKeyHex = keyHex?.takeIf(String::isNotBlank)
    if (activeVideoPath == null || (activeKeyHex == null && !activeVideoPath.startsWith("content://"))) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black),
            contentAlignment = Alignment.Center,
        ) {
            Text(stringResource(R.string.video_unselected), color = Color.White, fontSize = 16.sp)
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
    var lastSavedPositionMs by remember(activeVideoPath) { mutableLongStateOf(initialProgressSeconds.times(MILLIS_PER_SECOND).toLong()) }
    var showResumePrompt by remember(activeVideoPath) { mutableStateOf(false) }
    var restoredPosition by remember(activeVideoPath) { mutableStateOf(false) }
    var playbackStarted by remember(activeVideoPath) { mutableStateOf(false) }
    val latestProgressCallback by rememberUpdatedState(onProgressSeconds)
    val latestDurationCallback by rememberUpdatedState(onDurationSeconds)
    val initialPositionMs = remember(activeVideoPath) { (initialProgressSeconds * MILLIS_PER_SECOND).toLong().coerceAtLeast(0L) }

    BackHandler(enabled = true, onBack = onBack)

    val audioManager = remember { context.getSystemService(Context.AUDIO_SERVICE) as AudioManager }
    val originalScreenBrightness = remember(activity) { activity?.window?.attributes?.screenBrightness }

    DisposableEffect(activity, originalScreenBrightness) {
        onDispose {
            if (activity != null && originalScreenBrightness != null) {
                activity.window.attributes = activity.window.attributes.apply {
                    screenBrightness = originalScreenBrightness
                }
            }
        }
    }

    val exoPlayer = remember(context, activeVideoPath, activeKeyHex) {
        val dataSourceFactory = if (activeKeyHex != null) {
            EncryptedChunkDataSource.Factory(activeKeyHex)
        } else {
            DefaultDataSource.Factory(context)
        }
        val mediaSourceFactory = DefaultMediaSourceFactory(context).setDataSourceFactory(dataSourceFactory)

        ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .build()
            .apply {
                val uri = when {
                    activeVideoPath.startsWith("content://") || activeVideoPath.startsWith("file://") -> Uri.parse(activeVideoPath)
                    else -> Uri.fromFile(File(activeVideoPath))
                }
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
                            latestDurationCallback(durationMs / MILLIS_PER_SECOND)
                            if (!restoredPosition) {
                                restoredPosition = true
                                if (initialPositionMs > RESUME_THRESHOLD_SECONDS * MILLIS_PER_SECOND) {
                                    currentPositionMs = initialPositionMs.coerceAtMost((durationMs - 1L).coerceAtLeast(0L))
                                    showResumePrompt = true
                                }
                            }
                        } else if (playbackState == Player.STATE_ENDED) {
                            currentPositionMs = 0L
                            lastSavedPositionMs = 0L
                            playbackStarted = false
                            latestProgressCallback(0.0)
                        }
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        toastMessage = context.getString(R.string.video_playback_error, error.errorCodeName)
                    }
                })
            }
    }

    LaunchedEffect(isPlaying, exoPlayer) {
        while (isPlaying) {
            currentPositionMs = exoPlayer.currentPosition
            if (exoPlayer.currentPosition - lastSavedPositionMs >= PROGRESS_SAVE_INTERVAL_MS) {
                lastSavedPositionMs = exoPlayer.currentPosition
                latestProgressCallback(exoPlayer.currentPosition / MILLIS_PER_SECOND)
            }
            delay(500)
        }
    }

    LaunchedEffect(controlsVisible, isPlaying) {
        if (controlsVisible && isPlaying) {
            delay(4000)
            controlsVisible = false
        }
    }

    DisposableEffect(exoPlayer) {
        onDispose {
            if (playbackStarted) latestProgressCallback(exoPlayer.currentPosition / MILLIS_PER_SECOND)
            exoPlayer.release()
        }
    }

    val startOverPlayback = {
        exoPlayer.seekTo(0L)
        currentPositionMs = 0L
        lastSavedPositionMs = 0L
        playbackStarted = true
        showResumePrompt = false
        exoPlayer.play()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .videoPlayerGestures(
                player = exoPlayer,
                activity = activity,
                audioManager = audioManager,
                haptic = haptic,
                durationMs = durationMs,
                onToggleControls = { controlsVisible = !controlsVisible },
                onPositionChanged = { currentPositionMs = it },
            )
    ) {
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

        VideoPlayerOverlay(
            player = exoPlayer,
            videoTitle = videoTitle,
            isPlaying = isPlaying,
            currentPositionMs = currentPositionMs,
            durationMs = durationMs,
            playbackSpeed = playbackSpeed,
            controlsVisible = controlsVisible,
            toastMessage = toastMessage,
            showResumePrompt = showResumePrompt,
            initialPositionMs = initialPositionMs,
            onToastDismiss = { toastMessage = null },
            onPlaybackSpeedChange = { speed ->
                playbackSpeed = speed
                exoPlayer.setPlaybackSpeed(speed)
            },
            onTogglePlayback = {
                if (isPlaying) {
                    exoPlayer.pause()
                    lastSavedPositionMs = exoPlayer.currentPosition
                    latestProgressCallback(exoPlayer.currentPosition / MILLIS_PER_SECOND)
                } else {
                    playbackStarted = true
                    exoPlayer.play()
                }
            },
            onSkipBackward = {
                val position = (exoPlayer.currentPosition - VIDEO_SKIP_INTERVAL_MS).coerceAtLeast(0L)
                exoPlayer.seekTo(position)
                currentPositionMs = position
                lastSavedPositionMs = position
                latestProgressCallback(position / MILLIS_PER_SECOND)
            },
            onSkipForward = {
                val position = (exoPlayer.currentPosition + VIDEO_SKIP_INTERVAL_MS).coerceAtMost(durationMs)
                exoPlayer.seekTo(position)
                currentPositionMs = position
                lastSavedPositionMs = position
                latestProgressCallback(position / MILLIS_PER_SECOND)
            },
            onScrub = { position ->
                currentPositionMs = position
                exoPlayer.seekTo(position)
            },
            onEnterPictureInPicture = {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val params = PictureInPictureParams.Builder()
                        .setAspectRatio(Rational(16, 9))
                        .build()
                    activity?.enterPictureInPictureMode(params)
                }
            },
            onBack = onBack,
            onResumePromptDismiss = startOverPlayback,
            onResume = {
                exoPlayer.seekTo(currentPositionMs)
                lastSavedPositionMs = currentPositionMs
                playbackStarted = true
                showResumePrompt = false
                exoPlayer.play()
            },
            onStartOver = startOverPlayback,
        )
    }
}

private const val MILLIS_PER_SECOND = 1000.0
private const val RESUME_THRESHOLD_SECONDS = 5L
private const val PROGRESS_SAVE_INTERVAL_MS = 10_000L

