//! Video domain module for catalog, folders, subtitles, and vocabulary.

pub mod catalog;
pub mod folders;
pub mod models;
pub mod subtitles;
pub mod words;

pub use catalog::*;
pub use folders::*;
pub use models::*;
pub use subtitles::*;
pub use words::*;

#[cfg(test)]
mod tests;

use crate::db::Database;
use crate::error::{Result, SynapseError};

/// Repository facade providing high-level video domain operations.
pub struct VideoRepository;

impl VideoRepository {
    pub fn get_videos(db: &Database, collection_filter: Option<&str>) -> Result<Vec<VideoRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        catalog::get_videos(&conn, collection_filter)
    }

    pub fn get_videos_conn(conn: &rusqlite::Connection, collection_filter: Option<&str>) -> Result<Vec<VideoRecord>> {
        catalog::get_videos(conn, collection_filter)
    }

    pub fn get_video(db: &Database, video_id: &str) -> Result<Option<VideoRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        catalog::get_video(&conn, video_id)
    }

    pub fn get_video_conn(conn: &rusqlite::Connection, video_id: &str) -> Result<Option<VideoRecord>> {
        catalog::get_video(conn, video_id)
    }

    pub fn get_video_collections(db: &Database) -> Result<Vec<serde_json::Value>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        catalog::get_video_collections(&conn)
    }

    pub fn get_video_collections_conn(conn: &rusqlite::Connection) -> Result<Vec<serde_json::Value>> {
        catalog::get_video_collections(conn)
    }

    pub fn insert_video(db: &Database, video: &VideoRecord) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        catalog::insert_video(&conn, video)
    }

    pub fn insert_video_conn(conn: &rusqlite::Connection, video: &VideoRecord) -> Result<()> {
        catalog::insert_video(conn, video)
    }

    pub fn update_video_progress(db: &Database, video_id: &str, progress: f64) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        catalog::update_video_progress(&conn, video_id, progress)
    }

    pub fn update_video_progress_conn(conn: &rusqlite::Connection, video_id: &str, progress: f64) -> Result<bool> {
        catalog::update_video_progress(conn, video_id, progress)
    }

    pub fn update_video_duration(db: &Database, video_id: &str, duration: f64) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        catalog::update_video_duration(&conn, video_id, duration)
    }

    pub fn update_video_duration_conn(conn: &rusqlite::Connection, video_id: &str, duration: f64) -> Result<bool> {
        catalog::update_video_duration(conn, video_id, duration)
    }

    pub fn soft_delete_video(db: &Database, video_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        catalog::soft_delete_video(&conn, video_id)
    }

    pub fn soft_delete_video_conn(conn: &rusqlite::Connection, video_id: &str) -> Result<bool> {
        catalog::soft_delete_video(conn, video_id)
    }

    pub fn get_video_folders(db: &Database) -> Result<Vec<VideoFolder>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::get_video_folders(&conn)
    }

    pub fn get_video_folders_conn(conn: &rusqlite::Connection) -> Result<Vec<VideoFolder>> {
        folders::get_video_folders(conn)
    }

    pub fn save_video_folders(db: &Database, folders_list: &[VideoFolder]) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::save_video_folders(&conn, folders_list)
    }

    pub fn save_video_folders_conn(conn: &rusqlite::Connection, folders_list: &[VideoFolder]) -> Result<bool> {
        folders::save_video_folders(conn, folders_list)
    }

    pub fn create_video_folder(db: &Database, name: &str) -> Result<Option<VideoFolder>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::create_video_folder(&conn, name)
    }

    pub fn create_video_folder_conn(conn: &rusqlite::Connection, name: &str) -> Result<Option<VideoFolder>> {
        folders::create_video_folder(conn, name)
    }

    pub fn rename_video_folder(db: &Database, folder_id: &str, name: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::rename_video_folder(&conn, folder_id, name)
    }

    pub fn rename_video_folder_conn(conn: &rusqlite::Connection, folder_id: &str, name: &str) -> Result<bool> {
        folders::rename_video_folder(conn, folder_id, name)
    }

    pub fn delete_video_folder(db: &Database, folder_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::delete_video_folder(&conn, folder_id)
    }

    pub fn delete_video_folder_conn(conn: &rusqlite::Connection, folder_id: &str) -> Result<bool> {
        folders::delete_video_folder(conn, folder_id)
    }

    pub fn move_video_to_folder(db: &Database, video_id: &str, folder_id: Option<&str>) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::move_video_to_folder(&conn, video_id, folder_id)
    }

    pub fn move_video_to_folder_conn(conn: &rusqlite::Connection, video_id: &str, folder_id: Option<&str>) -> Result<bool> {
        folders::move_video_to_folder(conn, video_id, folder_id)
    }

    pub fn get_video_words(db: &Database, video_id: &str) -> Result<Vec<VideoWord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        words::get_video_words(&conn, video_id)
    }

    pub fn get_video_words_conn(conn: &rusqlite::Connection, video_id: &str) -> Result<Vec<VideoWord>> {
        words::get_video_words(conn, video_id)
    }

    pub fn add_video_word(
        db: &Database,
        video_id: &str,
        word: &str,
        context: Option<&str>,
        timestamp: f64,
    ) -> Result<VideoWord> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        words::add_video_word(&conn, video_id, word, context, timestamp)
    }

    pub fn add_video_word_conn(
        conn: &rusqlite::Connection,
        video_id: &str,
        word: &str,
        context: Option<&str>,
        timestamp: f64,
    ) -> Result<VideoWord> {
        words::add_video_word(conn, video_id, word, context, timestamp)
    }

    pub fn delete_video_word(db: &Database, word_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        words::delete_video_word(&conn, word_id)
    }

    pub fn delete_video_word_conn(conn: &rusqlite::Connection, word_id: &str) -> Result<bool> {
        words::delete_video_word(conn, word_id)
    }
}
