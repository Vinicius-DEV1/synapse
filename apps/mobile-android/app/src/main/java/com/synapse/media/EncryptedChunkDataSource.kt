package com.synapse.media

import android.net.Uri
import androidx.media3.common.C
import androidx.media3.datasource.BaseDataSource
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec
import com.synapse.core.SynapseVideoReader
import java.io.IOException

private val ENCRYPTION_KEY_HEX_PATTERN = Regex("[0-9a-fA-F]{64}")

/** Custom Media3 data source for streaming encrypted media through the native Synapse bridge. */
class EncryptedChunkDataSource(private val defaultKeyHex: String? = null) : BaseDataSource(/* isNetwork = */ false) {

    private var videoReader: SynapseVideoReader? = null
    private var uri: Uri? = null
    private var bytesRemaining: Long = 0
    private var currentPosition: Long = 0
    private var opened = false

    override fun open(dataSpec: DataSpec): Long {
        close()
        uri = dataSpec.uri
        val scheme = uri?.scheme

        if (scheme != "synapse-enc" && scheme != "file") {
            throw IOException("Unsupported URI scheme for encrypted stream: $scheme")
        }

        val filePath = uri?.path ?: throw IOException("Invalid file path in URI: $uri")
        if (filePath.isBlank()) {
            throw IOException("Encrypted video path must not be blank.")
        }
        val keyHex = uri?.getQueryParameter("key") ?: defaultKeyHex
            ?: throw IOException("No decryption key provided for encrypted video: $filePath")
        if (!ENCRYPTION_KEY_HEX_PATTERN.matches(keyHex)) {
            throw IOException("Encrypted video key must be a 32-byte hexadecimal value.")
        }

        transferInitializing(dataSpec)

        var reader: SynapseVideoReader? = null
        try {
            val openedReader = SynapseVideoReader.open(filePath, keyHex)
            reader = openedReader
            val nativeSize = openedReader.size()
            if (nativeSize > Long.MAX_VALUE.toULong()) {
                throw IOException("Encrypted video size exceeds the supported range.")
            }
            val totalSize = nativeSize.toLong()

            if (totalSize < 0) {
                throw IOException("Encrypted video size is unavailable.")
            }

            if (dataSpec.position < 0 || dataSpec.position > totalSize) {
                throw IOException("Requested position ${dataSpec.position} exceeds total size $totalSize")
            }

            val requestedLength = if (dataSpec.length != C.LENGTH_UNSET.toLong()) {
                dataSpec.length
            } else {
                totalSize - dataSpec.position
            }
            if (requestedLength < 0) {
                throw IOException("Requested encrypted video length must not be negative.")
            }

            currentPosition = dataSpec.position
            bytesRemaining = requestedLength

            videoReader = openedReader
            opened = true
            transferStarted(dataSpec)
            reader = null
            return bytesRemaining
        } catch (e: Exception) {
            val wasOpened = opened
            opened = false
            try {
                reader?.close()
            } catch (closeError: Exception) {
                e.addSuppressed(closeError)
            } finally {
                if (wasOpened) {
                    try {
                        transferEnded()
                    } catch (endError: Exception) {
                        e.addSuppressed(endError)
                    }
                }
            }
            videoReader = null
            bytesRemaining = 0
            currentPosition = 0
            uri = null
            throw IOException("Failed to initialize SynapseVideoReader: ${e.message}", e)
        }
    }

    override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
        if (offset < 0 || length < 0 || offset > buffer.size || length > buffer.size - offset) {
            throw IOException("Requested read range is outside the destination buffer.")
        }
        if (length == 0) return 0
        if (bytesRemaining == 0L) return C.RESULT_END_OF_INPUT

        val reader = videoReader ?: throw IOException("DataSource is not open")
        val bytesToRead = length.toLong().coerceAtMost(bytesRemaining).toInt()

        return try {
            val decryptedData = reader.readAt(currentPosition.toULong(), bytesToRead.toUInt())
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
        val wasOpened = opened
        opened = false
        val reader = videoReader
        videoReader = null
        uri = null
        bytesRemaining = 0
        currentPosition = 0
        try {
            reader?.close()
        } finally {
            if (wasOpened) {
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

