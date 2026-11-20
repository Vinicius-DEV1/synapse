package com.synapse.core

import com.sun.jna.Library
import com.sun.jna.Native
import com.sun.jna.Pointer
import com.sun.jna.ptr.PointerByReference
import java.io.Closeable

/**
 * Data class representing the result of an FSRS card review
 */
data class SrsCardResult(
    val stability: Double,
    val difficulty: Double,
    val scheduledDays: Int,
    val retrievability: Double,
    val state: Byte
)

/** A SQLite database handle backed by the shared Rust domain core. */
class SynapseDatabase internal constructor(handle: Pointer) : Closeable {
    private var nativeHandle: Pointer? = handle

    private fun requireOpenHandle(): Pointer = checkNotNull(nativeHandle) {
        "SynapseDatabase is already closed."
    }

    @Synchronized
    fun execute(sql: String): Long {
        return NativeBridge.INSTANCE.synapse_db_execute(requireOpenHandle(), sql)
    }

    @Synchronized
    fun querySingleString(sql: String): String? {
        val ptr = NativeBridge.INSTANCE.synapse_db_query_single_string(requireOpenHandle(), sql)
        return ptr?.getString(0)
    }

    @Synchronized
    fun tableExists(tableName: String): Boolean {
        return NativeBridge.INSTANCE.synapse_db_table_exists(requireOpenHandle(), tableName) != 0
    }

    @Synchronized
    override fun close() {
        val handle = nativeHandle ?: return
        nativeHandle = null
        NativeBridge.INSTANCE.synapse_db_close(handle)
    }

    companion object {
        fun open(path: String): SynapseDatabase {
            val handle = NativeBridge.INSTANCE.synapse_db_open(path)
                ?: throw RuntimeException("Failed to open Synapse database at $path")
            return SynapseDatabase(handle)
        }
    }
}

/**
 * Synapse Encrypted Video Reader for streaming 1MB ENC1 chunks directly to ExoPlayer
 */
class SynapseVideoReader internal constructor(handle: Pointer) : Closeable {
    private var nativeHandle: Pointer? = handle

    private fun requireOpenHandle(): Pointer = checkNotNull(nativeHandle) {
        "SynapseVideoReader is already closed."
    }

    @Synchronized
    fun size(): Long {
        return NativeBridge.INSTANCE.synapse_video_reader_size(requireOpenHandle())
    }

    @Synchronized
    fun readAt(offset: Long, length: Int): ByteArray {
        require(offset >= 0) { "Read offset must not be negative." }
        require(length >= 0) { "Read length must not be negative." }
        val buffer = ByteArray(length)
        val readBytes = NativeBridge.INSTANCE.synapse_video_reader_read_at(
            requireOpenHandle(), offset, buffer, length
        )
        if (readBytes < 0) {
            throw RuntimeException("Error reading encrypted video chunk at offset $offset")
        }
        return if (readBytes == length) buffer else buffer.copyOf(readBytes)
    }

    @Synchronized
    override fun close() {
        val handle = nativeHandle ?: return
        nativeHandle = null
        NativeBridge.INSTANCE.synapse_video_reader_free(handle)
    }

    companion object {
        fun open(filePath: String, keyHex: String): SynapseVideoReader {
            val handle = NativeBridge.INSTANCE.synapse_video_reader_open(filePath, keyHex)
                ?: throw RuntimeException("Failed to open encrypted video reader for $filePath")
            return SynapseVideoReader(handle)
        }
    }
}

/**
 * Synapse FSRS v5 spaced repetition engine
 */
class SynapseFsrs : Closeable {
    private var nativeHandle: Pointer? = NativeBridge.INSTANCE.synapse_fsrs_new()

    private fun requireOpenHandle(): Pointer = checkNotNull(nativeHandle) {
        "SynapseFsrs is already closed."
    }

    @Synchronized
    fun review(stability: Double, difficulty: Double, state: Byte, rating: Byte, elapsedDays: Int): SrsCardResult {
        val outStability = DoubleArray(1)
        val outDifficulty = DoubleArray(1)
        val outScheduledDays = IntArray(1)
        val outRetrievability = DoubleArray(1)
        val outState = ByteArray(1)

        NativeBridge.INSTANCE.synapse_fsrs_calculate(
            requireOpenHandle(),
            stability,
            difficulty,
            state,
            rating,
            elapsedDays,
            outStability,
            outDifficulty,
            outScheduledDays,
            outRetrievability,
            outState
        )

        return SrsCardResult(
            stability = outStability[0],
            difficulty = outDifficulty[0],
            scheduledDays = outScheduledDays[0],
            retrievability = outRetrievability[0],
            state = outState[0]
        )
    }

    @Synchronized
    fun retrievability(elapsedDays: Double, stability: Double): Double {
        return NativeBridge.INSTANCE.synapse_fsrs_retrievability(
            requireOpenHandle(), elapsedDays, stability
        )
    }

    @Synchronized
    override fun close() {
        val handle = nativeHandle ?: return
        nativeHandle = null
        NativeBridge.INSTANCE.synapse_fsrs_free(handle)
    }
}

/**
 * Cryptographic helpers (PBKDF2 600,000 iterations, AES-GCM)
 */
object SynapseCrypto {
    fun deriveMasterKey(password: String): String {
        return NativeBridge.INSTANCE.synapse_crypto_derive_master_key(password)
    }

    fun hashAuthPassword(password: String): String {
        return NativeBridge.INSTANCE.synapse_crypto_hash_password(password)
    }
}

/**
 * Internal JNA Native Bridge loading libsynapse_bridge_uniffi.so
 */
internal interface NativeBridge : Library {
    fun synapse_db_open(path: String): Pointer?
    fun synapse_db_close(handle: Pointer)
    fun synapse_db_execute(handle: Pointer, sql: String): Long
    fun synapse_db_query_single_string(handle: Pointer, sql: String): Pointer?
    fun synapse_db_table_exists(handle: Pointer, tableName: String): Int

    fun synapse_video_reader_open(filePath: String, keyHex: String): Pointer?
    fun synapse_video_reader_size(handle: Pointer): Long
    fun synapse_video_reader_read_at(handle: Pointer, offset: Long, buffer: ByteArray, length: Int): Int
    fun synapse_video_reader_free(handle: Pointer)

    fun synapse_fsrs_new(): Pointer
    fun synapse_fsrs_calculate(
        handle: Pointer,
        stability: Double,
        difficulty: Double,
        state: Byte,
        rating: Byte,
        elapsedDays: Int,
        outStability: DoubleArray,
        outDifficulty: DoubleArray,
        outScheduledDays: IntArray,
        outRetrievability: DoubleArray,
        outState: ByteArray
    )
    fun synapse_fsrs_retrievability(handle: Pointer, elapsedDays: Double, stability: Double): Double
    fun synapse_fsrs_free(handle: Pointer)

    fun synapse_crypto_derive_master_key(password: String): String
    fun synapse_crypto_hash_password(password: String): String

    companion object {
        val INSTANCE: NativeBridge by lazy {
            try {
                Native.load("synapse_bridge_uniffi", NativeBridge::class.java)
            } catch (error: UnsatisfiedLinkError) {
                throw IllegalStateException(
                    "The Android UniFFI bridge is missing for this ABI; the Qt C ABI is not compatible.",
                    error,
                )
            }
        }
    }
}

