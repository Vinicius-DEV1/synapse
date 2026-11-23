package com.synapse.features.files.data

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import com.synapse.core.FileRecord
import com.synapse.core.SynapseFilesStore
import com.synapse.data.SynapseDatabase
import com.synapse.features.files.model.FilesSections
import com.synapse.features.files.model.FilesSnapshot
import com.synapse.features.files.model.StoredFile
import com.synapse.features.files.model.StoredFolder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.UUID

class FilesRepository(context: Context) : AutoCloseable {
    private val appContext = context.applicationContext
    private val databasePath = SynapseDatabase.path(appContext)
    private var filesStore: SynapseFilesStore? = null

    suspend fun load(section: String, folderId: String?): FilesSnapshot = withContext(Dispatchers.IO) {
        val store = store()
        val activeFolder = folderId.takeIf { section == FilesSections.FOLDERS }
        val folders = if (section == FilesSections.FOLDERS) {
            store.getFolders(activeFolder).map { StoredFolder(it.id, it.name, it.parentId, it.color) }
        } else emptyList()
        val allFolders = store.getAllFolders().map { StoredFolder(it.id, it.name, it.parentId, it.color) }
        val files = store.getFiles(section, activeFolder).map(::toStoredFile)
        FilesSnapshot(folders, files, allFolders, store.getDriveFileCount().toInt())
    }

    suspend fun searchFiles(section: String, query: String): List<StoredFile> = withContext(Dispatchers.IO) {
        store().searchFiles(section, query, GLOBAL_SEARCH_LIMIT.toUInt()).map(::toStoredFile)
    }

    suspend fun createFolder(name: String, parentId: String?): Unit = withContext(Dispatchers.IO) {
        check(store().createFolder(name, parentId) != null) { "Informe um nome válido para a pasta." }
    }

    suspend fun renameFolder(id: String, name: String): Unit = withContext(Dispatchers.IO) {
        check(store().renameFolder(id, name)) { "A pasta não está mais disponível." }
    }

    suspend fun deleteFolder(id: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteFolder(id)) { "A pasta não está mais disponível." }
    }

    suspend fun moveFolder(id: String, parentId: String?): Unit = withContext(Dispatchers.IO) {
        check(store().moveFolder(id, parentId)) { "A pasta não foi movida. Escolha um destino fora da própria pasta e de suas subpastas." }
    }

    suspend fun renameFile(id: String, name: String): Unit = withContext(Dispatchers.IO) {
        check(store().renameFile(id, name)) { "O arquivo não está mais disponível." }
    }

    suspend fun deleteFile(id: String): Unit = withContext(Dispatchers.IO) {
        check(store().deleteFile(id)) { "O arquivo não está mais disponível." }
    }

    suspend fun moveFile(id: String, folderId: String?): Unit = withContext(Dispatchers.IO) {
        check(store().moveFile(id, folderId)) { "O arquivo não foi movido para essa pasta." }
    }

    suspend fun duplicateFile(id: String, folderId: String?): Unit = withContext(Dispatchers.IO) {
        check(store().duplicateFile(id, folderId) != null) { "Não foi possível duplicar o arquivo." }
    }

    suspend fun importDocuments(uris: List<Uri>, folderId: String?): Unit = withContext(Dispatchers.IO) {
        if (uris.isEmpty()) return@withContext
        val resolver = appContext.contentResolver
        val grantedUris = mutableListOf<Uri>()
        try {
            val records = uris.map { uri ->
                val metadata = resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)
                    ?.use { cursor ->
                        if (!cursor.moveToFirst()) null else {
                            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                            val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                            (nameIndex.takeIf { it >= 0 }?.let(cursor::getString) ?: "Arquivo importado") to
                                (sizeIndex.takeIf { it >= 0 }?.let(cursor::getLong) ?: 0L)
                        }
                    } ?: error("Não foi possível ler os dados de um arquivo selecionado.")
                val mimeType = resolver.getType(uri)
                resolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                grantedUris += uri
                FileRecord(
                    id = UUID.randomUUID().toString(),
                    name = metadata.first,
                    fileType = store().detectFileType(metadata.first),
                    fileSize = metadata.second.coerceAtLeast(0),
                    localPath = uri.toString(),
                    driveFileId = null,
                    hasDriveCopy = 0,
                    folderId = folderId,
                    mimeType = mimeType,
                    createdAt = null,
                    updatedAt = null,
                )
            }
            check(store().createFiles(records)) { "Não foi possível registrar todos os arquivos no Synapse." }
        } catch (error: Exception) {
            grantedUris.forEach { uri ->
                try {
                    resolver.releasePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                } catch (cleanupError: Exception) {
                    error.addSuppressed(cleanupError)
                }
            }
            throw error
        }
    }

    @Synchronized
    private fun store(): SynapseFilesStore = filesStore
        ?: SynapseFilesStore.open(databasePath).also { filesStore = it }

    private fun toStoredFile(row: FileRecord) = StoredFile(
        id = row.id,
        name = row.name,
        type = row.fileType,
        size = row.fileSize.toLong(),
        uri = row.localPath,
        mimeType = row.mimeType,
        folderId = row.folderId,
        hasDriveCopy = row.hasDriveCopy != 0,
    )

    @Synchronized
    override fun close() {
        filesStore?.close()
        filesStore = null
    }

    private companion object {
        const val GLOBAL_SEARCH_LIMIT = 500
    }
}
