package com.synapse.features.culture.data

import android.content.Context
import com.synapse.core.CultureItemRecord
import com.synapse.core.SynapseCultureStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.culture.model.CultureEpisodeItem
import com.synapse.features.culture.model.CultureMediaItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class CultureRepository(context: Context) : AutoCloseable {
    private val databasePath = SynapseDatabase.path(context)
    private var store: SynapseCultureStore? = null

    suspend fun load(): List<CultureMediaItem> = withContext(Dispatchers.IO) {
        store().getItems(null).map(::toItem)
    }

    suspend fun create(title: String, type: String, totalProgress: Int): CultureMediaItem =
        withContext(Dispatchers.IO) {
            toItem(store().createItem(
                CultureItemRecord(
                    id = "",
                    title = title,
                    itemType = typeToCore(type),
                    synopsis = null,
                    coverImage = null,
                    accessLink = null,
                    progress = 0,
                    totalProgress = totalProgress,
                    totalEpisodes = totalProgress,
                    isGoal = false,
                    goalNote = null,
                    apiId = null,
                    apiSource = null,
                    status = null,
                    lastSyncAt = null,
                    volumes = null,
                    chapters = null,
                    episodesCount = null,
                    createdAt = null,
                    updatedAt = null,
                ),
            ))
        }

    suspend fun update(item: CultureMediaItem): Unit = withContext(Dispatchers.IO) {
        val record = CultureItemRecord(
            id = item.id,
            title = item.title,
            itemType = typeToCore(item.type),
            synopsis = item.notes.takeIf(String::isNotBlank),
            coverImage = item.coverImage,
            accessLink = item.accessLink,
            progress = item.currentProgress,
            totalProgress = item.totalProgress,
            totalEpisodes = item.totalProgress,
            isGoal = item.isGoal,
            goalNote = item.goalNote.takeIf(String::isNotBlank),
            apiId = item.apiId,
            apiSource = item.apiSource,
            status = item.sourceStatus,
            lastSyncAt = item.lastSyncAt,
            volumes = item.volumes,
            chapters = item.chapters,
            episodesCount = item.episodesCount,
            createdAt = item.createdAt,
            updatedAt = item.updatedAt,
        )
        check(store().updateItem(item.id, record)) { "Culture item ${item.id} no longer exists" }
    }

    suspend fun updateProgress(item: CultureMediaItem, progress: Int): Unit = withContext(Dispatchers.IO) {
        requireUpdated(store().updateProgress(item.id, progress), item.id)
    }

    suspend fun markCompleted(item: CultureMediaItem): Unit = withContext(Dispatchers.IO) {
        val progress = item.totalProgress.takeIf { it > 0 } ?: item.currentProgress.takeIf { it > 0 } ?: 1
        requireUpdated(store().updateProgress(item.id, progress), item.id)
    }

    suspend fun setGoal(item: CultureMediaItem, enabled: Boolean): Unit = withContext(Dispatchers.IO) {
        requireUpdated(store().setGoal(item.id, enabled, item.goalNote), item.id)
    }

    suspend fun delete(item: CultureMediaItem): Unit = withContext(Dispatchers.IO) {
        check(store().deleteItem(item.id)) { "Culture item ${item.id} no longer exists" }
    }

    suspend fun loadEpisodes(item: CultureMediaItem): List<CultureEpisodeItem> = withContext(Dispatchers.IO) {
        store().getEpisodes(item.id).map { episode ->
            CultureEpisodeItem(
                id = episode.id,
                itemId = episode.itemId,
                episodeNumber = episode.episodeNumber,
                seasonNumber = episode.seasonNumber,
                title = episode.title,
                isWatched = episode.isWatched,
            )
        }
    }

    suspend fun createEpisodeChecklist(item: CultureMediaItem): Unit = withContext(Dispatchers.IO) {
        require(item.totalProgress > 0) { "Set a total episode count before creating the checklist" }
        check(store().bulkCreateEpisodes(item.id, item.totalProgress)) { "Could not create episodes for ${item.id}" }
    }

    suspend fun toggleEpisode(item: CultureMediaItem, episode: CultureEpisodeItem): Unit = withContext(Dispatchers.IO) {
        check(store().toggleEpisodeWatched(episode.id, item.id)) { "Culture episode ${episode.id} no longer exists" }
    }

    private fun toItem(record: CultureItemRecord): CultureMediaItem = CultureMediaItem(
        id = record.id,
        title = record.title,
        type = record.itemType,
        status = when {
            record.totalProgress > 0 && record.progress >= record.totalProgress -> "completed"
            record.progress > 0 -> "watching"
            else -> "plan_to_watch"
        },
        currentProgress = record.progress,
        totalProgress = record.totalProgress.takeIf { it > 0 } ?: record.totalEpisodes,
        notes = record.synopsis.orEmpty(),
        isGoal = record.isGoal,
        goalNote = record.goalNote.orEmpty(),
        coverImage = record.coverImage,
        accessLink = record.accessLink,
        totalEpisodes = record.totalEpisodes,
        apiId = record.apiId,
        apiSource = record.apiSource,
        sourceStatus = record.status,
        lastSyncAt = record.lastSyncAt,
        volumes = record.volumes,
        chapters = record.chapters,
        episodesCount = record.episodesCount,
        createdAt = record.createdAt,
        updatedAt = record.updatedAt,
    )

    private fun typeToCore(type: String): String = when (type) {
        "movie" -> "filme"
        "series" -> "série"
        else -> type
    }

    private fun requireUpdated(updated: Boolean, id: String) {
        check(updated) { "Culture item $id no longer exists" }
    }

    @Synchronized
    private fun store(): SynapseCultureStore = store
        ?: SynapseCultureStore.open(databasePath).also { store = it }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
    }
}
