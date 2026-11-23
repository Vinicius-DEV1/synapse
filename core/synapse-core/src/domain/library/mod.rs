//! Library domain module for books, collections, reader bookmarks/highlights, and stats.

pub mod books;
pub mod collections;
mod create;
pub mod models;
pub mod reader;
mod repository_management;
mod repository_reader;
mod repository_stats;
pub mod stats;

pub use books::*;
pub use collections::*;
pub use models::*;
pub use reader::*;
pub use stats::*;

#[cfg(test)]
mod tests;

use crate::db::Database;
use crate::error::{Result, SynapseError};

/// Repository facade providing high-level library operations.
pub struct LibraryRepository;

impl LibraryRepository {
    pub fn get_books(db: &Database, filter: Option<&str>) -> Result<Vec<BookRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        books::get_books(&conn, filter)
    }

    pub fn get_books_conn(
        conn: &rusqlite::Connection,
        filter: Option<&str>,
    ) -> Result<Vec<BookRecord>> {
        books::get_books(conn, filter)
    }

    pub fn get_book(db: &Database, book_id: &str) -> Result<Option<BookRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        books::get_book(&conn, book_id)
    }

    pub fn get_book_conn(conn: &rusqlite::Connection, book_id: &str) -> Result<Option<BookRecord>> {
        books::get_book(conn, book_id)
    }

    pub fn insert_book(db: &Database, book: &BookRecord) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        books::insert_book(&conn, book)
    }

    pub fn insert_book_conn(conn: &rusqlite::Connection, book: &BookRecord) -> Result<()> {
        books::insert_book(conn, book)
    }

    pub fn update_book_progress(
        db: &Database,
        book_id: &str,
        current_page: i32,
        total_pages: i32,
        reading_status: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        books::update_book_progress(&conn, book_id, current_page, total_pages, reading_status)
    }

    pub fn update_book_progress_conn(
        conn: &rusqlite::Connection,
        book_id: &str,
        current_page: i32,
        total_pages: i32,
        reading_status: Option<&str>,
    ) -> Result<bool> {
        books::update_book_progress(conn, book_id, current_page, total_pages, reading_status)
    }

    pub fn update_book_status(db: &Database, book_id: &str, status: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        books::update_book_status(&conn, book_id, status)
    }

    pub fn set_book_archived(db: &Database, book_id: &str, archived: bool) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        books::set_book_archived(&conn, book_id, archived)
    }

    pub fn update_book_metadata(
        db: &Database,
        book_id: &str,
        title: &str,
        author: &str,
        description: Option<&str>,
        published_year: Option<i32>,
        publisher: Option<&str>,
        language: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        books::update_book_metadata(
            &conn,
            book_id,
            title,
            author,
            description,
            published_year,
            publisher,
            language,
        )
    }

    pub fn update_book_metadata_conn(
        conn: &rusqlite::Connection,
        book_id: &str,
        title: &str,
        author: &str,
        description: Option<&str>,
        published_year: Option<i32>,
        publisher: Option<&str>,
        language: Option<&str>,
    ) -> Result<bool> {
        books::update_book_metadata(
            conn,
            book_id,
            title,
            author,
            description,
            published_year,
            publisher,
            language,
        )
    }

    pub fn update_book_cover(
        db: &Database,
        book_id: &str,
        cover_image: Option<&str>,
        cover_color: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        books::update_book_cover(&conn, book_id, cover_image, cover_color)
    }

    pub fn update_book_cover_conn(
        conn: &rusqlite::Connection,
        book_id: &str,
        cover_image: Option<&str>,
        cover_color: Option<&str>,
    ) -> Result<bool> {
        books::update_book_cover(conn, book_id, cover_image, cover_color)
    }

    pub fn soft_delete_book(db: &Database, book_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        books::soft_delete_book(&conn, book_id)
    }

    pub fn soft_delete_book_conn(conn: &rusqlite::Connection, book_id: &str) -> Result<bool> {
        books::soft_delete_book(conn, book_id)
    }

    pub fn get_collections(db: &Database) -> Result<Vec<BookCollection>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        collections::get_collections(&conn)
    }

    pub fn get_collections_conn(conn: &rusqlite::Connection) -> Result<Vec<BookCollection>> {
        collections::get_collections(conn)
    }

    pub fn create_collection(
        db: &Database,
        name: &str,
        color: &str,
    ) -> Result<Option<BookCollection>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        collections::create_collection(&conn, name, color)
    }

    pub fn create_collection_conn(
        conn: &rusqlite::Connection,
        name: &str,
        color: &str,
    ) -> Result<Option<BookCollection>> {
        collections::create_collection(conn, name, color)
    }

    pub fn update_collection(
        db: &Database,
        collection_id: &str,
        name: &str,
        color: &str,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        collections::update_collection(&conn, collection_id, name, color)
    }

    pub fn update_collection_conn(
        conn: &rusqlite::Connection,
        collection_id: &str,
        name: &str,
        color: &str,
    ) -> Result<bool> {
        collections::update_collection(conn, collection_id, name, color)
    }

    pub fn delete_collection(db: &Database, collection_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        collections::delete_collection(&conn, collection_id)
    }

    pub fn delete_collection_conn(
        conn: &rusqlite::Connection,
        collection_id: &str,
    ) -> Result<bool> {
        collections::delete_collection(conn, collection_id)
    }

    pub fn set_book_collections(
        db: &Database,
        book_id: &str,
        collection_ids: &[String],
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        collections::set_book_collections(&conn, book_id, collection_ids)
    }

    pub fn set_book_collections_conn(
        conn: &rusqlite::Connection,
        book_id: &str,
        collection_ids: &[String],
    ) -> Result<bool> {
        collections::set_book_collections(conn, book_id, collection_ids)
    }
}
