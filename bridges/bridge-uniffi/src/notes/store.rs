use super::models::{NoteMetadataRecord, NotePageRecord, NoteTreeNodeRecord};
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::notes::NotesRepository;
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseNotesStore {
    database: Database,
}

#[uniffi::export]
impl SynapseNotesStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_pages(
        &self,
        filter: Option<String>,
    ) -> Result<Vec<NoteMetadataRecord>, SynapseError> {
        NotesRepository::get_filtered_page_metas(&self.database, filter.as_deref())
            .map(|pages| pages.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn get_pinned_pages(&self) -> Result<Vec<NoteMetadataRecord>, SynapseError> {
        NotesRepository::get_pinned_pages(&self.database)
            .map(|pages| pages.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn get_recent_pages(&self, limit: u32) -> Result<Vec<NoteMetadataRecord>, SynapseError> {
        NotesRepository::get_recent_pages(&self.database, limit.min(100) as usize)
            .map(|pages| pages.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn get_page_tree(
        &self,
        filter: Option<String>,
    ) -> Result<Vec<NoteTreeNodeRecord>, SynapseError> {
        NotesRepository::get_page_tree(&self.database, filter.as_deref())
            .map(|pages| pages.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn get_page(&self, page_id: String) -> Result<Option<NotePageRecord>, SynapseError> {
        NotesRepository::get_page(&self.database, &page_id)
            .map(|page| page.map(Into::into))
            .map_err(map_core_error)
    }

    pub fn create_page(
        &self,
        title: String,
        icon: String,
        parent_id: Option<String>,
    ) -> Result<NotePageRecord, SynapseError> {
        NotesRepository::create_page(&self.database, parent_id.as_deref(), &title, Some(&icon))
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn save_plain_text_page(
        &self,
        page_id: String,
        title: String,
        content: String,
        icon: String,
    ) -> Result<bool, SynapseError> {
        NotesRepository::save_plain_text_page(&self.database, &page_id, &title, &content, &icon)
            .map_err(map_core_error)
    }

    pub fn rename_page(&self, page_id: String, title: String) -> Result<bool, SynapseError> {
        NotesRepository::rename_page(&self.database, &page_id, &title).map_err(map_core_error)
    }

    pub fn toggle_pin_page(&self, page_id: String) -> Result<bool, SynapseError> {
        NotesRepository::toggle_pin_page(&self.database, &page_id).map_err(map_core_error)
    }

    pub fn move_page(
        &self,
        page_id: String,
        new_parent_id: Option<String>,
    ) -> Result<bool, SynapseError> {
        NotesRepository::move_page(&self.database, &page_id, new_parent_id.as_deref())
            .map_err(map_core_error)
    }

    pub fn reorder_pages(
        &self,
        parent_id: Option<String>,
        page_ids: Vec<String>,
    ) -> Result<bool, SynapseError> {
        NotesRepository::reorder_pages(&self.database, parent_id.as_deref(), &page_ids)
            .map_err(map_core_error)
    }

    pub fn delete_page(&self, page_id: String) -> Result<bool, SynapseError> {
        NotesRepository::soft_delete_page_subtree(&self.database, &page_id).map_err(map_core_error)
    }
}
