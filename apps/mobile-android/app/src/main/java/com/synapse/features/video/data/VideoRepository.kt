package com.synapse.features.video.data

import android.content.Context
import android.content.Intent
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Log
import com.synapse.R
import com.synapse.core.VideoFolderRecord
import com.synapse.core.SynapseVideoStore
import com.synapse.core.VideoCatalogRecord
import com.synapse.data.SynapseDatabase
import com.synapse.features.video.model.VideoLibraryItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class VideoRepository(context: Context) : AutoCloseable {
    private val appContext = context.applicationContext
    private val databasePath = SynapseDatabase.path(appContext)
    private var store: SynapseVideoStore? = null

    suspend fun load(folderId: String? = null): List<VideoLibraryItem> = withContext(Dispatchers.IO) {
        withStore { videoStore -> videoStore.getVideos(folderId) }.map { it.toLibraryItem() }
    }

    suspend fun loadFolders(): List<VideoFolderRecord> = withContext(Dispatchers.IO) {
        withStore { it.getFolders() }
    }

    suspend fun createFolder(name: String): VideoFolderRecord? = withContext(Dispatchers.IO) {
        withStore { it.createFolder(name) }
    }

    suspend fun renameFolder(folderId: String, name: String): Boolean = withContext(Dispatchers.IO) {
        withStore { it.renameFolder(folderId, name) }
    }

    suspend fun deleteFolder(folderId: String): Boolean = withContext(Dispatchers.IO) {
        withStore { it.deleteFolder(folderId) }
    }

    suspend fun moveToFolder(videoId: String, folderId: String?): Boolean = withContext(Dispatchers.IO) {
        withStore { it.moveVideoToFolder(videoId, folderId) }
    }

    suspend fun importLocalVideo(uri: Uri, folderId: String?): VideoLibraryItem = withContext(Dispatchers.IO) {
        val path = uri.toString()
        val existing = withStore { videoStore -> videoStore.getVideos(null).firstOrNull { it.filePath == path } }
        if (existing != null) {
            return@withContext existing.toLibraryItem()
        }

        val displayName = try {
            resolveDisplayName(uri)
        } catch (error: Exception) {
            releaseUnusedGrant(uri)
            throw error
        }
        val title = displayName.substringBeforeLast('.', displayName).ifBlank { displayName }
        val record = try {
            withStore { it.createLocalVideo(title, displayName, path) }
        } catch (error: Exception) {
            releaseUnusedGrant(uri)
            throw error
        }
        if (folderId != null && !withStore { it.moveVideoToFolder(record.id, folderId) }) {
            throw IllegalStateException("The selected video folder is no longer available")
        }
        val duration = resolveDurationSeconds(uri)
        if (duration > 0) {
            try {
                withStore { it.updateDuration(record.id, duration) }
            } catch (error: Exception) {
                Log.w(TAG, "Could not save the selected video's duration", error)
            }
        }

        record.toLibraryItem(duration)
    }

    suspend fun saveProgress(videoId: String, seconds: Double): Unit = withContext(Dispatchers.IO) {
        check(withStore { it.updateProgress(videoId, seconds) }) { "Video $videoId no longer exists" }
    }

    suspend fun saveDuration(videoId: String, seconds: Double): Unit = withContext(Dispatchers.IO) {
        withStore { it.updateDuration(videoId, seconds) }
        Unit
    }

    private fun resolveDisplayName(uri: Uri): String {
        val name = appContext.contentResolver.query(
            uri,
            arrayOf(OpenableColumns.DISPLAY_NAME),
            null,
            null,
            null,
        )?.use { cursor ->
            if (cursor.moveToFirst()) cursor.getString(0)?.trim()?.takeIf { it.isNotEmpty() } else null
        }
        return name ?: uri.lastPathSegment?.substringAfterLast('/')?.takeIf(String::isNotBlank)
            ?: appContext.getString(R.string.video_default_title)
    }

    private fun resolveDurationSeconds(uri: Uri): Double {
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(appContext, uri)
            retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                ?.toDoubleOrNull()
                ?.div(MILLIS_PER_SECOND)
                ?: 0.0
        } catch (error: Exception) {
            Log.w(TAG, "Could not read the selected video's duration", error)
            0.0
        } finally {
            try {
                retriever.release()
            } catch (error: Exception) {
                Log.w(TAG, "Could not release the video metadata reader", error)
            }
        }
    }

    private fun releaseUnusedGrant(uri: Uri) {
        try {
            appContext.contentResolver.releasePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        } catch (error: SecurityException) {
            Log.w(TAG, "Could not release an unused video URI permission", error)
        }
    }

    @Synchronized
    private fun store(): SynapseVideoStore = store
        ?: SynapseVideoStore.open(databasePath).also { store = it }

    private inline fun <T> withStore(operation: (SynapseVideoStore) -> T): T = synchronized(this) {
        operation(store())
    }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
    }

    private companion object {
        const val TAG = "SynapseVideo"
        const val MILLIS_PER_SECOND = 1000.0
    }
}

private fun VideoCatalogRecord.toLibraryItem(): VideoLibraryItem = toLibraryItem(duration ?: 0.0)

private fun VideoCatalogRecord.toLibraryItem(durationSeconds: Double): VideoLibraryItem =
    VideoLibraryItem(
        id = id,
        title = title,
        originalName = originalName,
        filePath = filePath,
        durationSeconds = durationSeconds,
        progressSeconds = progress ?: 0.0,
        isLocal = isLocal == 1,
    )
