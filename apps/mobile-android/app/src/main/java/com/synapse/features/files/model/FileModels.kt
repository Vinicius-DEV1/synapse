package com.synapse.features.files.model

internal object FilesSections {
    const val FOLDERS = "folders"
    const val RECENT = "recent"
    const val DRIVE = "drive"
}

data class StoredFile(
    val id: String,
    val name: String,
    val type: String,
    val size: Long,
    val uri: String?,
    val mimeType: String?,
    val folderId: String?,
    val hasDriveCopy: Boolean,
)

data class StoredFolder(
    val id: String,
    val name: String,
    val parentId: String?,
    val color: String,
)

data class FilesSnapshot(
    val folders: List<StoredFolder>,
    val files: List<StoredFile>,
    val allFolders: List<StoredFolder>,
    val driveFileCount: Int,
)

data class FilesUiState(
    val loading: Boolean = true,
    val searching: Boolean = false,
    val saving: Boolean = false,
    val section: String = FilesSections.FOLDERS,
    val folderId: String? = null,
    val folderName: String? = null,
    val folderPath: List<StoredFolder> = emptyList(),
    val folders: List<StoredFolder> = emptyList(),
    val files: List<StoredFile> = emptyList(),
    val searchResults: List<StoredFile> = emptyList(),
    val allFolders: List<StoredFolder> = emptyList(),
    val driveFileCount: Int = 0,
    val error: String? = null,
)
