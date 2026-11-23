package com.synapse.features.focus.data

import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Log

internal data class ImportedLofiAudio(
    val title: String,
    val uri: String,
    val durationSeconds: Double,
)

internal class FocusLofiImporter(context: Context) {
    private val appContext = context.applicationContext

    fun readMetadata(uri: Uri): ImportedLofiAudio {
        persistReadPermission(uri)
        val displayName = appContext.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
            ?.use { cursor ->
                val nameColumn = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameColumn >= 0 && cursor.moveToFirst()) cursor.getString(nameColumn) else null
            }
            .orEmpty()
            .ifBlank { uri.lastPathSegment.orEmpty().ifBlank { "Audio" } }
        val title = displayName.substringBeforeLast('.', displayName).ifBlank { displayName }
        return ImportedLofiAudio(title, uri.toString(), readDuration(uri))
    }

    fun persistReadPermission(uri: Uri) {
        appContext.contentResolver.takePersistableUriPermission(uri, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }

    fun revokeReadPermission(uri: Uri) {
        appContext.contentResolver.releasePersistableUriPermission(
            uri,
            android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION,
        )
    }

    private fun readDuration(uri: Uri): Double {
        val retriever = MediaMetadataRetriever()
        return try {
            retriever.setDataSource(appContext, uri)
            retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toDoubleOrNull()
                ?.div(MILLIS_PER_SECOND)
                ?: 0.0
        } catch (error: Exception) {
            Log.w(TAG, "Could not read duration for imported focus audio $uri", error)
            0.0
        } finally {
            retriever.release()
        }
    }

    private companion object {
        const val TAG = "SynapseFocusLofi"
        const val MILLIS_PER_SECOND = 1000.0
    }
}
