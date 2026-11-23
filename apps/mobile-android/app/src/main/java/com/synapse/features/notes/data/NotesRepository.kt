package com.synapse.features.notes.data

import android.content.Context
import com.synapse.core.SynapseNotesStore
import com.synapse.core.NoteMetadataRecord
import com.synapse.data.SynapseDatabase
import com.synapse.features.notes.model.NoteDocument
import com.synapse.features.notes.model.NoteSummary
import com.synapse.features.notes.model.NotesCatalog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class NotesRepository(context: Context) : AutoCloseable {
    private val databasePath = SynapseDatabase.path(context)
    private var store: SynapseNotesStore? = null

    suspend fun loadCatalog(filter: String): NotesCatalog = withContext(Dispatchers.IO) {
        val noteStore = store()
        val rows = noteStore.getPages(filter.takeIf(String::isNotBlank))
        val notes = rows.map(::toSummary)
        val summaries = notes.associateBy { it.id }
        noteStore.getPageTree(filter.takeIf(String::isNotBlank)).mapNotNull { node ->
            summaries[node.id]?.copy(
                parentId = node.parentId,
                depth = node.depth,
                hasChildren = node.hasChildren,
            )
        }.let { tree -> NotesCatalog(notes, tree) }
    }

    suspend fun loadNotes(filter: String): List<NoteSummary> = loadCatalog(filter).notes

    suspend fun loadPinnedNotes(): List<NoteSummary> = withContext(Dispatchers.IO) {
        store().getPinnedPages().map(::toSummary)
    }

    suspend fun loadRecentNotes(limit: Int): List<NoteSummary> = withContext(Dispatchers.IO) {
        store().getRecentPages(limit.coerceIn(1, 100).toUInt()).map(::toSummary)
    }

    suspend fun loadNote(id: String): NoteDocument = withContext(Dispatchers.IO) {
        val row = store().getPage(id) ?: error("Esta nota não está mais disponível.")
        NoteDocument(
            row.id,
            row.parentId,
            row.title,
            row.content,
            row.icon,
            row.updatedAt,
            row.isPinned,
            row.isLocked,
            row.isProtected,
            row.editableAsPlainText,
        )
    }

    suspend fun createNote(title: String, parentId: String? = null): NoteDocument = withContext(Dispatchers.IO) {
        val row = store().createPage(title, NOTE_ICON, parentId)
        NoteDocument(
            row.id,
            row.parentId,
            row.title,
            row.content,
            row.icon,
            row.updatedAt,
            row.isPinned,
            row.isLocked,
            row.isProtected,
            row.editableAsPlainText,
        )
    }

    suspend fun saveNote(note: NoteDocument): Unit = withContext(Dispatchers.IO) {
        check(note.editableAsPlainText && !note.isProtected && !note.isLocked) {
            "Esta nota não pode ser editada como texto simples no Android."
        }
        check(store().savePlainTextPage(note.id, note.title, note.content, note.icon)) {
            "A nota não está mais disponível para edição."
        }
        Unit
    }

    suspend fun renameNote(id: String, title: String): Unit = withContext(Dispatchers.IO) {
        check(store().renamePage(id, title.trim())) { "A nota não está mais disponível." }
        Unit
    }

    suspend fun togglePin(id: String): Unit = withContext(Dispatchers.IO) {
        check(store().togglePinPage(id)) { "Não foi possível atualizar o destaque da nota." }
        Unit
    }

    suspend fun deleteNote(id: String): Unit = withContext(Dispatchers.IO) {
        check(store().deletePage(id)) { "A nota não está mais disponível." }
        Unit
    }

    suspend fun moveNote(id: String, newParentId: String?): Unit = withContext(Dispatchers.IO) {
        check(store().movePage(id, newParentId)) {
            "A nota não foi movida. Escolha um destino válido fora das subpáginas dela."
        }
        Unit
    }

    suspend fun reorderPages(parentId: String?, pageIds: List<String>): Unit =
        withContext(Dispatchers.IO) {
            check(store().reorderPages(parentId, pageIds)) {
                "A ordem das páginas mudou. Atualize a lista e tente novamente."
            }
            Unit
        }

    @Synchronized
    private fun store(): SynapseNotesStore = store
        ?: SynapseNotesStore.open(databasePath).also { store = it }

    private fun toSummary(row: NoteMetadataRecord): NoteSummary = NoteSummary(
        row.id,
        row.parentId,
        row.title,
        row.icon,
        row.updatedAt,
        row.isPinned,
        row.isLocked,
    )

    @Synchronized
    override fun close() {
        store?.close()
        store = null
    }

    private companion object {
        const val NOTE_ICON = "📝"
    }
}
