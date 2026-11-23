use super::books;
use super::models::BookRecord;
use super::LibraryRepository;
use crate::db::Database;
use crate::error::{Result, SynapseError};
use chrono::Utc;

impl LibraryRepository {
    pub fn create_book(
        db: &Database,
        title: &str,
        author: Option<&str>,
        total_pages: i32,
    ) -> Result<BookRecord> {
        let title = title.trim();
        if title.is_empty() || total_pages <= 0 {
            return Err(SynapseError::Validation(
                "Book title and a positive page count are required".into(),
            ));
        }

        let now = Utc::now().to_rfc3339();
        let book = BookRecord {
            id: uuid::Uuid::new_v4().to_string(),
            title: title.to_string(),
            author: author
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string),
            file_path: None,
            drive_file_id: None,
            cover_color: None,
            cover_image: None,
            collections: Some("[]".into()),
            total_pages: Some(total_pages),
            current_page: Some(0),
            reading_status: Some("unread".into()),
            last_read_page: None,
            epub_locations: None,
            reading_preferences: None,
            language: None,
            last_read_at: None,
            original_name: None,
            published_year: None,
            publisher: None,
            description: None,
            is_local: Some(true),
            is_archived: Some(false),
            archived_at: None,
            created_at: Some(now.clone()),
            updated_at: Some(now),
            deleted_at: None,
        };

        let conn = db.lock().map_err(SynapseError::Database)?;
        books::insert_book(&conn, &book)?;
        Ok(book)
    }

    pub fn adjust_book_progress(db: &Database, book_id: &str, delta: i32) -> Result<bool> {
        if delta == 0 {
            return Err(SynapseError::Validation(
                "Progress adjustment cannot be zero".into(),
            ));
        }
        let conn = db.lock().map_err(SynapseError::Database)?;
        let transaction = conn.unchecked_transaction()?;
        let Some(book) = books::get_book(&transaction, book_id)? else {
            return Ok(false);
        };
        let total_pages = book.total_pages.unwrap_or(0);
        if total_pages <= 0 {
            return Err(SynapseError::Validation(
                "Book must have a positive page count".into(),
            ));
        }
        let current_page = book.current_page.unwrap_or(0);
        let next_page = current_page.saturating_add(delta).clamp(0, total_pages);
        let status = if next_page == total_pages {
            "finished"
        } else if next_page > 0 {
            "reading"
        } else {
            "unread"
        };
        let updated = books::update_book_progress(
            &transaction,
            book_id,
            next_page,
            total_pages,
            Some(status),
        )?;
        transaction.commit()?;
        Ok(updated)
    }
}
