package com.synapse.features.trash.data

import android.content.Context
import android.content.Intent
import android.net.Uri
import com.synapse.core.SynapseTrashStore
import com.synapse.core.SynapseFilesStore
import com.synapse.core.SynapseFocusStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.trash.model.TrashedItem
import com.synapse.features.trash.model.TrashItemTypes
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class TrashRepository(context: Context) : AutoCloseable {
    private val appContext = context.applicationContext
    private val databasePath = SynapseDatabase.path(appContext)
    private var store: SynapseTrashStore? = null
    private var fileStore: SynapseFilesStore? = null
    private var focusStore: SynapseFocusStore? = null

    suspend fun load(): List<TrashedItem> = withContext(Dispatchers.IO) {
        store().getItems().map { item ->
            TrashedItem(
                id = item.id,
                title = item.title,
                itemType = item.itemType,
                deletedAt = item.deletedAt,
            )
        }
    }

    suspend fun restore(item: TrashedItem): Unit = withContext(Dispatchers.IO) {
        check(store().restoreItem(item.id, item.itemType)) { "Trash item ${item.id} no longer exists" }
    }

    suspend fun deletePermanently(item: TrashedItem): Unit = withContext(Dispatchers.IO) {
        val deletedPath = when (item.itemType) {
            TrashItemTypes.FILE -> fileStore().getDeletedFileLocalPath(item.id)
            TrashItemTypes.LOFI -> focusStore().getDeletedLofiFilePath(item.id)
            else -> null
        }
        check(store().deletePermanently(item.id, item.itemType)) { "Trash item ${item.id} no longer exists" }
        when (item.itemType) {
            TrashItemTypes.FILE -> deletedPath?.let(::releaseFileGrantIfOrphaned)
            TrashItemTypes.LOFI -> deletedPath?.let(::releaseLofiGrantIfOrphaned)
        }
    }

    suspend fun empty(): Unit = withContext(Dispatchers.IO) {
        val deletedPaths = fileStore().getDeletedFileLocalPaths()
        val deletedLofiPaths = focusStore().getDeletedLofiFilePaths()
        check(store().empty()) { "Could not empty trash" }
        deletedPaths.distinct().forEach(::releaseFileGrantIfOrphaned)
        deletedLofiPaths.distinct().forEach(::releaseLofiGrantIfOrphaned)
    }

    private fun releaseFileGrantIfOrphaned(localPath: String) {
        if (fileStore().isFileLocalPathReferenced(localPath) || focusStore().isLofiFilePathReferenced(localPath)) return
        releasePersistedReadGrant(localPath)
    }

    private fun releaseLofiGrantIfOrphaned(localPath: String) {
        if (focusStore().isLofiFilePathReferenced(localPath) || fileStore().isFileLocalPathReferenced(localPath)) return
        releasePersistedReadGrant(localPath)
    }

    private fun releasePersistedReadGrant(localPath: String) {
        val uri = Uri.parse(localPath)
        if (uri.scheme != "content") return
        val resolver = appContext.contentResolver
        val hasReadGrant = resolver.persistedUriPermissions.any { it.uri == uri && it.isReadPermission }
        if (hasReadGrant) resolver.releasePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }

    @Synchronized
    private fun store(): SynapseTrashStore = store
        ?: SynapseTrashStore.open(databasePath).also { store = it }

    @Synchronized
    private fun fileStore(): SynapseFilesStore = fileStore
        ?: SynapseFilesStore.open(databasePath).also { fileStore = it }

    @Synchronized
    private fun focusStore(): SynapseFocusStore = focusStore
        ?: SynapseFocusStore.open(databasePath).also { focusStore = it }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
        fileStore?.close()
        fileStore = null
        focusStore?.close()
        focusStore = null
    }
}
