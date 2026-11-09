package com.synapse.media

import android.net.Uri
import androidx.media3.common.C
import androidx.media3.datasource.BaseDataSource
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import com.synapse.core.SynapseVideoReader
import java.io.IOException

/**
 * Custom Media3 / ExoPlayer DataSource for zero-copy streaming of encrypted .enc media
 * Directly backed by synapse-core Rust engine via JNI.
 */
class EncryptedChunkDataSource(private val defaultKeyHex: String? = null) : BaseDataSource(/* isNetwork = */ false) {

    private var videoReader: SynapseVideoReader? = null
    private var uri: Uri? = null
    private var bytesRemaining: Long = 0
    private var currentPosition: Long = 0
    private var opened = false

    override fun open(dataSpec: DataSpec): Long {
        uri = dataSpec.uri
        val scheme = uri?.scheme

        if (scheme != "synapse-enc" && scheme != "file") {
            throw IOException("Unsupported URI scheme for encrypted stream: $scheme")
        }

        val filePath = uri?.path ?: throw IOException("Invalid file path in URI: $uri")
        val keyHex = uri?.getQueryParameter("key") ?: defaultKeyHex
            ?: throw IOException("No decryption key provided for encrypted video: $filePath")

        transferInitializing(dataSpec)

        try {
            val reader = SynapseVideoReader.open(filePath, keyHex)
            videoReader = reader
            val totalSize = reader.size()

            if (dataSpec.position > totalSize) {
                throw IOException("Requested position ${dataSpec.position} exceeds total size $totalSize")
            }

            currentPosition = dataSpec.position
            bytesRemaining = if (dataSpec.length != C.LENGTH_UNSET.toLong()) {
                dataSpec.length
            } else {
                totalSize - dataSpec.position
            }

            opened = true
            transferStarted(dataSpec)
            return bytesRemaining
        } catch (e: Exception) {
            throw IOException("Failed to initialize SynapseVideoReader: ${e.message}", e)
        }
    }

    override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
        if (length == 0) return 0
        if (bytesRemaining == 0L) return C.RESULT_END_OF_INPUT

        val reader = videoReader ?: throw IOException("DataSource is not open")
        val bytesToRead = length.toLong().coerceAtMost(bytesRemaining).toInt()

        return try {
            val decryptedData = reader.readAt(currentPosition, bytesToRead)
            if (decryptedData.isEmpty()) {
                return C.RESULT_END_OF_INPUT
            }

            System.arraycopy(decryptedData, 0, buffer, offset, decryptedData.size)
            currentPosition += decryptedData.size
            bytesRemaining -= decryptedData.size
            bytesTransferred(decryptedData.size)

            decryptedData.size
        } catch (e: Exception) {
            throw IOException("Decryption read error at position $currentPosition: ${e.message}", e)
        }
    }

    override fun getUri(): Uri? = uri

    override fun close() {
        uri = null
        if (opened) {
            opened = false
            try {
                videoReader?.close()
            } finally {
                videoReader = null
                transferEnded()
            }
        }
    }

    /**
     * Factory class for creating EncryptedChunkDataSource instances in ExoPlayer
     */
    class Factory(private val keyHex: String? = null) : DataSource.Factory {
        override fun createDataSource(): DataSource {
            return EncryptedChunkDataSource(keyHex)
        }
    }
}

