use super::models::{FileFolderRecord, FileRecord};
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::files::FilesRepository;
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseFilesStore {
    database: Database,
}

#[uniffi::export]
impl SynapseFilesStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_folders(
        &self,
        parent_id: Option<String>,
    ) -> Result<Vec<FileFolderRecord>, SynapseError> {
        FilesRepository::get_folders(&self.database, parent_id.as_deref())
            .map(|folders| folders.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn detect_file_type(&self, file_name: String) -> String {
        synapse_core::domain::files::detect_file_type(&file_name).to_string()
    }

    pub fn get_all_folders(&self) -> Result<Vec<FileFolderRecord>, SynapseError> {
        FilesRepository::get_all_folders(&self.database)
            .map(|folders| folders.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn get_files(
        &self,
        section: String,
        folder_id: Option<String>,
    ) -> Result<Vec<FileRecord>, SynapseError> {
        FilesRepository::get_files_for_section(&self.database, &section, folder_id.as_deref())
            .map(|files| files.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn search_files(
        &self,
        section: String,
        query: String,
        limit: u32,
    ) -> Result<Vec<FileRecord>, SynapseError> {
        FilesRepository::search_files(&self.database, &section, &query, i64::from(limit))
            .map(|files| files.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_folder(
        &self,
        name: String,
        parent_id: Option<String>,
    ) -> Result<Option<FileFolderRecord>, SynapseError> {
        FilesRepository::create_folder(&self.database, &name, parent_id.as_deref(), None)
            .map(|folder| folder.map(Into::into))
            .map_err(map_core_error)
    }

    pub fn rename_folder(&self, id: String, name: String) -> Result<bool, SynapseError> {
        FilesRepository::rename_folder(&self.database, &id, &name).map_err(map_core_error)
    }

    pub fn move_folder(&self, id: String, parent_id: Option<String>) -> Result<bool, SynapseError> {
        FilesRepository::move_folder(&self.database, &id, parent_id.as_deref())
            .map_err(map_core_error)
    }

    pub fn delete_folder(&self, id: String) -> Result<bool, SynapseError> {
        FilesRepository::delete_folder(&self.database, &id).map_err(map_core_error)
    }

    pub fn create_files(&self, files: Vec<FileRecord>) -> Result<bool, SynapseError> {
        let records = files.into_iter().map(Into::into).collect::<Vec<_>>();
        FilesRepository::create_files(&self.database, &records).map_err(map_core_error)
    }

    pub fn rename_file(&self, id: String, name: String) -> Result<bool, SynapseError> {
        FilesRepository::rename_file(&self.database, &id, &name).map_err(map_core_error)
    }

    pub fn move_file(&self, id: String, folder_id: Option<String>) -> Result<bool, SynapseError> {
        FilesRepository::move_file(&self.database, &id, folder_id.as_deref())
            .map_err(map_core_error)
    }

    pub fn duplicate_file(
        &self,
        id: String,
        folder_id: Option<String>,
    ) -> Result<Option<String>, SynapseError> {
        FilesRepository::duplicate_file(&self.database, &id, folder_id.as_deref())
            .map_err(map_core_error)
    }

    pub fn delete_file(&self, id: String) -> Result<bool, SynapseError> {
        FilesRepository::delete_file(&self.database, &id).map_err(map_core_error)
    }

    pub fn get_drive_file_count(&self) -> Result<i32, SynapseError> {
        FilesRepository::get_drive_file_count(&self.database).map_err(map_core_error)
    }

    pub fn get_deleted_file_local_path(
        &self,
        file_id: String,
    ) -> Result<Option<String>, SynapseError> {
        FilesRepository::get_deleted_file_local_path(&self.database, &file_id)
            .map_err(map_core_error)
    }

    pub fn get_deleted_file_local_paths(&self) -> Result<Vec<String>, SynapseError> {
        FilesRepository::get_deleted_file_local_paths(&self.database).map_err(map_core_error)
    }

    pub fn is_file_local_path_referenced(&self, local_path: String) -> Result<bool, SynapseError> {
        FilesRepository::is_file_local_path_referenced(&self.database, &local_path)
            .map_err(map_core_error)
    }
}
