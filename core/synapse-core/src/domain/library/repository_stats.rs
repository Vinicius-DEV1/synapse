use super::stats;
use super::{LibraryReadingStats, LibraryRepository};
use crate::db::Database;
use crate::error::{Result, SynapseError};

impl LibraryRepository {
    pub fn start_reading_session(
        db: &Database,
        book_id: &str,
        start_page: i32,
    ) -> Result<Option<String>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        stats::start_reading_session(&conn, book_id, start_page)
    }

    pub fn end_reading_session(
        db: &Database,
        session_id: &str,
        end_page: i32,
        start_page: i32,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        stats::end_reading_session(&conn, session_id, end_page, start_page)
    }

    pub fn get_reading_stats(db: &Database) -> Result<LibraryReadingStats> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        stats::get_reading_stats(&conn)
    }
}
