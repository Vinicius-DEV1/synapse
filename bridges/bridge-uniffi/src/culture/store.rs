use super::models::{CultureEpisodeRecord, CultureItemRecord};
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::culture::CultureRepository;
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseCultureStore {
    database: Database,
}

#[uniffi::export]
impl SynapseCultureStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_items(
        &self,
        status_filter: Option<String>,
    ) -> Result<Vec<CultureItemRecord>, SynapseError> {
        CultureRepository::get_items(&self.database, status_filter.as_deref())
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_item(&self, item: CultureItemRecord) -> Result<CultureItemRecord, SynapseError> {
        CultureRepository::create_item(&self.database, item.into())
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn update_item(
        &self,
        item_id: String,
        item: CultureItemRecord,
    ) -> Result<bool, SynapseError> {
        CultureRepository::update_item(&self.database, &item_id, &item.into())
            .map_err(map_core_error)
    }

    pub fn update_progress(&self, item_id: String, progress: i32) -> Result<bool, SynapseError> {
        CultureRepository::update_progress(&self.database, &item_id, progress)
            .map_err(map_core_error)
    }

    pub fn update_status(&self, item_id: String, status: String) -> Result<bool, SynapseError> {
        CultureRepository::update_status(&self.database, &item_id, &status).map_err(map_core_error)
    }

    pub fn set_goal(
        &self,
        item_id: String,
        is_goal: bool,
        goal_note: String,
    ) -> Result<bool, SynapseError> {
        CultureRepository::set_goal(&self.database, &item_id, is_goal, &goal_note)
            .map_err(map_core_error)
    }

    pub fn get_episodes(&self, item_id: String) -> Result<Vec<CultureEpisodeRecord>, SynapseError> {
        CultureRepository::get_episodes(&self.database, &item_id)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn bulk_create_episodes(&self, item_id: String, count: i32) -> Result<bool, SynapseError> {
        CultureRepository::bulk_create_episodes(&self.database, &item_id, count)
            .map_err(map_core_error)
    }

    pub fn toggle_episode_watched(
        &self,
        episode_id: String,
        item_id: String,
    ) -> Result<bool, SynapseError> {
        CultureRepository::toggle_episode_watched(&self.database, &episode_id, &item_id)
            .map_err(map_core_error)
    }

    pub fn delete_item(&self, item_id: String) -> Result<bool, SynapseError> {
        CultureRepository::delete_item(&self.database, &item_id).map_err(map_core_error)
    }
}
