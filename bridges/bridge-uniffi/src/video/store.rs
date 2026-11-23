use super::models::{VideoCatalogRecord, VideoFolderRecord};
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::video::VideoRepository;
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseVideoStore {
    database: Database,
}

#[uniffi::export]
impl SynapseVideoStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_videos(
        &self,
        collection_filter: Option<String>,
    ) -> Result<Vec<VideoCatalogRecord>, SynapseError> {
        VideoRepository::get_videos(&self.database, collection_filter.as_deref())
            .map(|videos| videos.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_local_video(
        &self,
        title: String,
        original_name: String,
        file_path: String,
    ) -> Result<VideoCatalogRecord, SynapseError> {
        VideoRepository::create_local_video(&self.database, &title, &original_name, &file_path)
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn update_progress(
        &self,
        video_id: String,
        progress_seconds: f64,
    ) -> Result<bool, SynapseError> {
        VideoRepository::update_video_progress(&self.database, &video_id, progress_seconds)
            .map_err(map_core_error)
    }

    pub fn update_duration(
        &self,
        video_id: String,
        duration_seconds: f64,
    ) -> Result<bool, SynapseError> {
        VideoRepository::update_video_duration(&self.database, &video_id, duration_seconds)
            .map_err(map_core_error)
    }

    pub fn get_folders(&self) -> Result<Vec<VideoFolderRecord>, SynapseError> {
        VideoRepository::get_video_folders(&self.database)
            .map(|folders| folders.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_folder(&self, name: String) -> Result<Option<VideoFolderRecord>, SynapseError> {
        VideoRepository::create_video_folder(&self.database, &name)
            .map(|folder| folder.map(Into::into))
            .map_err(map_core_error)
    }

    pub fn rename_folder(&self, folder_id: String, name: String) -> Result<bool, SynapseError> {
        VideoRepository::rename_video_folder(&self.database, &folder_id, &name)
            .map_err(map_core_error)
    }

    pub fn delete_folder(&self, folder_id: String) -> Result<bool, SynapseError> {
        VideoRepository::delete_video_folder(&self.database, &folder_id).map_err(map_core_error)
    }

    pub fn move_video_to_folder(
        &self,
        video_id: String,
        folder_id: Option<String>,
    ) -> Result<bool, SynapseError> {
        VideoRepository::move_video_to_folder(&self.database, &video_id, folder_id.as_deref())
            .map_err(map_core_error)
    }
}
