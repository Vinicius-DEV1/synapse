use synapse_core::domain::files::{FileFolder, FileRecord as CoreFileRecord};

#[derive(uniffi::Record, Clone)]
pub struct FileFolderRecord {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub color: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

impl From<FileFolder> for FileFolderRecord {
    fn from(folder: FileFolder) -> Self {
        Self {
            id: folder.id,
            name: folder.name,
            parent_id: folder.parent_id,
            color: folder.color,
            created_at: folder.created_at,
            updated_at: folder.updated_at,
        }
    }
}

#[derive(uniffi::Record, Clone)]
pub struct FileRecord {
    pub id: String,
    pub name: String,
    pub file_type: String,
    pub file_size: i64,
    pub local_path: Option<String>,
    pub drive_file_id: Option<String>,
    pub has_drive_copy: i32,
    pub folder_id: Option<String>,
    pub mime_type: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

impl From<CoreFileRecord> for FileRecord {
    fn from(file: CoreFileRecord) -> Self {
        Self {
            id: file.id,
            name: file.name,
            file_type: file.file_type,
            file_size: file.file_size,
            local_path: file.local_path,
            drive_file_id: file.drive_file_id,
            has_drive_copy: file.has_drive_copy,
            folder_id: file.folder_id,
            mime_type: file.mime_type,
            created_at: file.created_at,
            updated_at: file.updated_at,
        }
    }
}

impl From<FileRecord> for CoreFileRecord {
    fn from(file: FileRecord) -> Self {
        Self {
            id: file.id,
            name: file.name,
            file_type: file.file_type,
            file_size: file.file_size,
            local_path: file.local_path,
            drive_file_id: file.drive_file_id,
            has_drive_copy: file.has_drive_copy,
            folder_id: file.folder_id,
            mime_type: file.mime_type,
            created_at: file.created_at,
            updated_at: file.updated_at,
        }
    }
}
