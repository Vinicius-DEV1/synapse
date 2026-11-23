package com.synapse.features.focus.platform

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.synapse.R
import com.synapse.features.focus.model.FocusLofiItem
import java.io.File

internal class FocusLofiPlayer(
    context: Context,
    onPlayingChanged: (Boolean) -> Unit,
    onPlaybackError: (String) -> Unit,
) {
    private val appContext = context.applicationContext
    private val player = ExoPlayer.Builder(appContext).build()

    init {
        player.setAudioAttributes(
            AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(),
            true,
        )
        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) = onPlayingChanged(isPlaying)

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) player.seekTo(0)
            }

            override fun onPlayerError(error: PlaybackException) {
                Log.e(TAG, "Failed to play Focus audio", error)
                onPlaybackError(appContext.getString(R.string.focus_lofi_playback_error))
            }
        })
    }

    fun toggle(track: FocusLofiItem, activeTrackId: String?) {
        if (activeTrackId == track.id) {
            if (player.isPlaying) player.pause() else player.play()
            return
        }
        player.setMediaItem(MediaItem.fromUri(resolveAudioUri(track.filePath)))
        player.prepare()
        player.play()
    }

    fun stop() = player.stop()

    fun release() = player.release()

    private fun resolveAudioUri(path: String): Uri {
        val parsed = Uri.parse(path)
        if (parsed.scheme == "content" || parsed.scheme == "file") return parsed
        val file = File(path)
        if (file.isFile && file.canRead()) return Uri.fromFile(file)
        throw IllegalArgumentException(appContext.getString(R.string.focus_lofi_unavailable))
    }

    private companion object {
        const val TAG = "SynapseFocusLofi"
    }
}
