package com.synapse.features.focus.data

import android.content.Context
import android.net.Uri
import android.util.Log
import com.synapse.core.FocusSessionRecord
import com.synapse.core.FocusAlarmRecord
import com.synapse.core.FocusLofiRecord
import com.synapse.core.SynapseFocusStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.focus.model.FocusSessionItem
import com.synapse.features.focus.model.FocusAlarmItem
import com.synapse.features.focus.model.FocusLofiItem
import com.synapse.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.OffsetDateTime

data class FocusDailyStats(
    val completedSessions: Int,
    val completedMinutes: Int,
)

class FocusRepository(context: Context) : AutoCloseable {
    private val databasePath = SynapseDatabase.path(context)
    private val appContext = context.applicationContext
    private val lofiImporter = FocusLofiImporter(context)
    private var store: SynapseFocusStore? = null

    suspend fun loadStats(today: LocalDate): FocusDailyStats = withContext(Dispatchers.IO) {
        val stats = store().getStats(today.toString())
        FocusDailyStats(stats.completedSessionsToday, stats.completedMinutesToday)
    }

    suspend fun loadSessions(): List<FocusSessionItem> = withContext(Dispatchers.IO) {
        store().getSessions().map(::toSessionItem)
    }

    suspend fun loadAlarms(): List<FocusAlarmItem> = withContext(Dispatchers.IO) {
        store().getAlarms().map(::toAlarmItem)
    }

    suspend fun createAlarm(time: String, label: String): FocusAlarmItem = withContext(Dispatchers.IO) {
        toAlarmItem(store().createAlarm(time, label))
    }

    suspend fun toggleAlarm(id: String): Unit = withContext(Dispatchers.IO) {
        check(store().toggleAlarm(id)) { "Could not update focus alarm" }
    }

    suspend fun deleteAlarm(id: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteAlarm(id)) { "Could not delete focus alarm" }
    }

    suspend fun loadLofiTracks(): List<FocusLofiItem> = withContext(Dispatchers.IO) {
        store().getLofiTracks().map(::toLofiItem)
    }

    suspend fun importLofiTrack(uri: Uri): Unit = withContext(Dispatchers.IO) {
        val activeTrack = store().getLofiTracks().any { it.filePath == uri.toString() }
        if (activeTrack) {
            lofiImporter.persistReadPermission(uri)
            throw IllegalArgumentException(appContext.getString(R.string.focus_lofi_already_imported))
        }
        val isInTrash = store().isLofiFilePathReferenced(uri.toString())
        if (isInTrash) throw IllegalArgumentException(appContext.getString(R.string.focus_lofi_in_trash))
        try {
            val imported = lofiImporter.readMetadata(uri)
            check(store().addLofiTrack(imported.title, imported.uri, imported.durationSeconds)) {
                "Could not add focus audio track"
            }
        } catch (error: Exception) {
            try {
                lofiImporter.revokeReadPermission(uri)
            } catch (cleanupError: Exception) {
                Log.e(TAG, "Could not release the failed Focus audio import grant: $uri", cleanupError)
                error.addSuppressed(cleanupError)
            }
            throw error
        }
    }

    suspend fun deleteLofiTrack(id: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteLofiTrack(id)) { "Could not delete focus audio track" }
    }

    suspend fun recordCompletedSession(minutes: Int, completedAt: OffsetDateTime): Unit =
        withContext(Dispatchers.IO) {
            check(store().recordCompletedSession(minutes, completedAt.toString())) {
                "Could not save completed focus session"
            }
        }

    @Synchronized
    private fun store(): SynapseFocusStore = store
        ?: SynapseFocusStore.open(databasePath).also { store = it }

    private fun toSessionItem(record: FocusSessionRecord) = FocusSessionItem(
        id = record.id,
        tag = record.tag,
        description = record.description,
        durationMinutes = record.targetTimeMinutes,
        status = record.status,
        summary = record.summary,
        justification = record.justification,
        createdAt = record.createdAt,
    )

    private fun toAlarmItem(record: FocusAlarmRecord) = FocusAlarmItem(
        id = record.id,
        time = record.time,
        label = record.label.orEmpty(),
        enabled = record.enabled == 1,
    )

    private fun toLofiItem(record: FocusLofiRecord) = FocusLofiItem(
        id = record.id,
        title = record.title,
        filePath = record.filePath,
        durationSeconds = record.duration,
    )

    private companion object {
        const val TAG = "SynapseFocusRepository"
    }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
    }
}
