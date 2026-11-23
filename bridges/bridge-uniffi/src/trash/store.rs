use super::models::TrashItemRecord;
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::trash::TrashRepository;
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseTrashStore {
    database: Database,
}

#[uniffi::export]
impl SynapseTrashStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_items(&self) -> Result<Vec<TrashItemRecord>, SynapseError> {
        TrashRepository::get_trash_items(&self.database)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn restore_item(&self, id: String, item_type: String) -> Result<bool, SynapseError> {
        TrashRepository::restore_trash_item(&self.database, &id, &item_type).map_err(map_core_error)
    }

    pub fn delete_permanently(&self, id: String, item_type: String) -> Result<bool, SynapseError> {
        TrashRepository::delete_trash_item_permanently(&self.database, &id, &item_type)
            .map_err(map_core_error)
    }

    pub fn empty(&self) -> Result<bool, SynapseError> {
        TrashRepository::empty_trash(&self.database).map_err(map_core_error)
    }
}
