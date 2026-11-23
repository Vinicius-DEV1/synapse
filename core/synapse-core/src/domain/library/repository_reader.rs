use super::reader;
use super::{Bookmark, Highlight, LibraryRepository};
use crate::db::Database;
use crate::error::{Result, SynapseError};

impl LibraryRepository {
    pub fn get_bookmarks(db: &Database, book_id: &str) -> Result<Vec<Bookmark>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        reader::get_bookmarks(&conn, book_id)
    }

    pub fn add_bookmark(
        db: &Database,
        book_id: &str,
        page_number: i32,
        label: Option<&str>,
    ) -> Result<Bookmark> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        reader::add_bookmark(&conn, book_id, page_number, label)
    }

    pub fn update_bookmark(db: &Database, bookmark_id: &str, label: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        reader::update_bookmark(&conn, bookmark_id, label)
    }

    pub fn delete_bookmark(db: &Database, bookmark_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        reader::delete_bookmark(&conn, bookmark_id)
    }

    pub fn get_highlights(db: &Database, book_id: &str) -> Result<Vec<Highlight>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        reader::get_highlights(&conn, book_id)
    }

    pub fn add_highlight(
        db: &Database,
        book_id: &str,
        page_number: i32,
        text_content: &str,
        color: Option<&str>,
        note: Option<&str>,
    ) -> Result<Highlight> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        reader::add_highlight(&conn, book_id, page_number, text_content, color, note)
    }

    pub fn add_highlight_full(
        db: &Database,
        book_id: &str,
        page_number: i32,
        text_content: &str,
        color: Option<&str>,
        rects: Option<&str>,
        highlight_type: Option<&str>,
        note: Option<&str>,
    ) -> Result<Highlight> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        reader::add_highlight_full(
            &conn,
            book_id,
            page_number,
            text_content,
            color,
            rects,
            highlight_type,
            note,
        )
    }

    pub fn update_highlight(
        db: &Database,
        highlight_id: &str,
        color: &str,
        note: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        reader::update_highlight(&conn, highlight_id, color, note)
    }

    pub fn update_highlight_full(
        db: &Database,
        highlight_id: &str,
        text_content: Option<&str>,
        color: Option<&str>,
        rects: Option<&str>,
        highlight_type: Option<&str>,
        note: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        reader::update_highlight_full(
            &conn,
            highlight_id,
            text_content,
            color,
            rects,
            highlight_type,
            note,
        )
    }

    pub fn update_highlight_note(
        db: &Database,
        highlight_id: &str,
        note: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        reader::update_highlight_note(&conn, highlight_id, note)
    }

    pub fn delete_highlight(db: &Database, highlight_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        reader::delete_highlight(&conn, highlight_id)
    }
}
