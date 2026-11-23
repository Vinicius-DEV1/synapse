use super::{books, collections, LibraryRepository};
use crate::db::Database;
use crate::error::{Result, SynapseError};

impl LibraryRepository {
    pub fn update_book_and_collections(
        db: &Database,
        book_id: &str,
        title: &str,
        author: &str,
        collection_ids: &[String],
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        let transaction = conn.unchecked_transaction()?;
        let updated = books::update_book_metadata(
            &transaction,
            book_id,
            title,
            author,
            None,
            None,
            None,
            None,
        )?;
        if !updated
            || !collections::set_book_collections_in_transaction(
                &transaction,
                book_id,
                collection_ids,
            )?
        {
            return Ok(false);
        }

        transaction.commit()?;
        Ok(true)
    }
}
