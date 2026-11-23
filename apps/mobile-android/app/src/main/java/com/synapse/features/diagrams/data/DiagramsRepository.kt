package com.synapse.features.diagrams.data

import android.content.Context
import com.synapse.core.DiagramMetaRecord
import com.synapse.core.DiagramRecord
import com.synapse.core.SynapseDiagramsStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.diagrams.model.DiagramItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class DiagramsRepository(context: Context) : AutoCloseable {
    private val databasePath = SynapseDatabase.path(context)
    private var store: SynapseDiagramsStore? = null

    suspend fun load(): List<DiagramItem> = withContext(Dispatchers.IO) {
        store().getDiagrams().map(::toItem)
    }

    suspend fun create(title: String, icon: String): DiagramItem = withContext(Dispatchers.IO) {
        store().createDiagram(title, icon).toItem()
    }

    suspend fun hasNativeEditableContent(item: DiagramItem): Boolean = withContext(Dispatchers.IO) {
        val record = store().getDiagram(item.id)
            ?: error("Diagram ${item.id} no longer exists")
        record.encryptedContent.isNullOrBlank() && (record.content.isBlank() || record.content == "[]")
    }

    suspend fun delete(item: DiagramItem): Unit = withContext(Dispatchers.IO) {
        check(store().deleteDiagram(item.id)) { "Diagram ${item.id} no longer exists" }
    }

    private fun toItem(record: DiagramMetaRecord): DiagramItem = DiagramItem(
        id = record.id,
        title = record.title,
        icon = record.icon,
        updatedAt = record.updatedAt.orEmpty(),
    )

    private fun DiagramRecord.toItem(): DiagramItem = DiagramItem(
        id = id,
        title = title,
        icon = icon,
        updatedAt = updatedAt.orEmpty(),
    )

    @Synchronized
    private fun store(): SynapseDiagramsStore = store
        ?: SynapseDiagramsStore.open(databasePath).also { store = it }

    @Synchronized
    override fun close() {
        store?.close()
        store = null
    }
}
