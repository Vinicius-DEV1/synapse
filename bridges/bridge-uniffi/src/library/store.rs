use super::models::{
    LibraryBookRecord, LibraryBookmarkRecord, LibraryCollectionRecord, LibraryHighlightRecord,
    LibraryStatsRecord,
};
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::library::LibraryRepository;
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseLibraryStore {
    database: Database,
}

#[uniffi::export]
impl SynapseLibraryStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_books(
        &self,
        filter: Option<String>,
    ) -> Result<Vec<LibraryBookRecord>, SynapseError> {
        LibraryRepository::get_books(&self.database, filter.as_deref())
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_book(
        &self,
        title: String,
        author: Option<String>,
        total_pages: i32,
    ) -> Result<LibraryBookRecord, SynapseError> {
        LibraryRepository::create_book(&self.database, &title, author.as_deref(), total_pages)
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn update_book_metadata(
        &self,
        book_id: String,
        title: String,
        author: String,
        description: Option<String>,
    ) -> Result<bool, SynapseError> {
        LibraryRepository::update_book_metadata(
            &self.database,
            &book_id,
            &title,
            &author,
            description.as_deref(),
            None,
            None,
            None,
        )
        .map_err(map_core_error)
    }

    pub fn update_book_and_collections(
        &self,
        book_id: String,
        title: String,
        author: String,
        collection_ids: Vec<String>,
    ) -> Result<bool, SynapseError> {
        LibraryRepository::update_book_and_collections(
            &self.database,
            &book_id,
            &title,
            &author,
            &collection_ids,
        )
        .map_err(map_core_error)
    }

    pub fn get_collections(&self) -> Result<Vec<LibraryCollectionRecord>, SynapseError> {
        LibraryRepository::get_collections(&self.database)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_collection(
        &self,
        name: String,
        color: String,
    ) -> Result<LibraryCollectionRecord, SynapseError> {
        LibraryRepository::create_collection(&self.database, &name, &color)
            .map_err(map_core_error)?
            .map(Into::into)
            .ok_or_else(|| SynapseError::InvalidInput {
                msg: "Collection name or color is invalid".to_owned(),
            })
    }

    pub fn update_collection(
        &self,
        collection_id: String,
        name: String,
        color: String,
    ) -> Result<bool, SynapseError> {
        LibraryRepository::update_collection(&self.database, &collection_id, &name, &color)
            .map_err(map_core_error)
    }

    pub fn delete_collection(&self, collection_id: String) -> Result<bool, SynapseError> {
        LibraryRepository::delete_collection(&self.database, &collection_id).map_err(map_core_error)
    }

    pub fn set_book_archived(&self, book_id: String, archived: bool) -> Result<bool, SynapseError> {
        LibraryRepository::set_book_archived(&self.database, &book_id, archived)
            .map_err(map_core_error)
    }

    pub fn delete_book(&self, book_id: String) -> Result<bool, SynapseError> {
        LibraryRepository::soft_delete_book(&self.database, &book_id).map_err(map_core_error)
    }

    pub fn adjust_progress(&self, book_id: String, delta: i32) -> Result<bool, SynapseError> {
        LibraryRepository::adjust_book_progress(&self.database, &book_id, delta)
            .map_err(map_core_error)
    }

    pub fn get_stats(&self) -> Result<LibraryStatsRecord, SynapseError> {
        LibraryRepository::get_reading_stats(&self.database)
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn get_bookmarks(
        &self,
        book_id: String,
    ) -> Result<Vec<LibraryBookmarkRecord>, SynapseError> {
        LibraryRepository::get_bookmarks(&self.database, &book_id)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_bookmark(
        &self,
        book_id: String,
        page_number: i32,
        label: Option<String>,
    ) -> Result<LibraryBookmarkRecord, SynapseError> {
        LibraryRepository::add_bookmark(&self.database, &book_id, page_number, label.as_deref())
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn update_bookmark(
        &self,
        bookmark_id: String,
        label: String,
    ) -> Result<bool, SynapseError> {
        LibraryRepository::update_bookmark(&self.database, &bookmark_id, &label)
            .map_err(map_core_error)
    }

    pub fn delete_bookmark(&self, bookmark_id: String) -> Result<bool, SynapseError> {
        LibraryRepository::delete_bookmark(&self.database, &bookmark_id).map_err(map_core_error)
    }

    pub fn get_highlights(
        &self,
        book_id: String,
    ) -> Result<Vec<LibraryHighlightRecord>, SynapseError> {
        LibraryRepository::get_highlights(&self.database, &book_id)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_highlight(
        &self,
        book_id: String,
        page_number: i32,
        text_content: String,
        color: Option<String>,
        rects: Option<String>,
        highlight_type: Option<String>,
        note: Option<String>,
    ) -> Result<LibraryHighlightRecord, SynapseError> {
        LibraryRepository::add_highlight_full(
            &self.database,
            &book_id,
            page_number,
            &text_content,
            color.as_deref(),
            rects.as_deref(),
            highlight_type.as_deref(),
            note.as_deref(),
        )
        .map(Into::into)
        .map_err(map_core_error)
    }

    pub fn update_highlight(
        &self,
        highlight_id: String,
        text_content: Option<String>,
        color: Option<String>,
        rects: Option<String>,
        highlight_type: Option<String>,
        note: Option<String>,
    ) -> Result<bool, SynapseError> {
        LibraryRepository::update_highlight_full(
            &self.database,
            &highlight_id,
            text_content.as_deref(),
            color.as_deref(),
            rects.as_deref(),
            highlight_type.as_deref(),
            note.as_deref(),
        )
        .map_err(map_core_error)
    }

    pub fn delete_highlight(&self, highlight_id: String) -> Result<bool, SynapseError> {
        LibraryRepository::delete_highlight(&self.database, &highlight_id).map_err(map_core_error)
    }
}
