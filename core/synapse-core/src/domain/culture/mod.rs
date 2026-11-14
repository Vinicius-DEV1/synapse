pub mod episodes;
pub mod items;
pub mod models;
#[cfg(test)]
mod tests;

pub use episodes::*;
pub use items::*;
pub use models::*;

use crate::db::Database;
use crate::error::{Result, SynapseError};

pub struct CultureRepository;

impl CultureRepository {
    pub fn get_items(db: &Database, status_filter: Option<&str>) -> Result<Vec<CultureItem>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::get_culture_items(&conn, status_filter)
    }

    pub fn get_items_conn(conn: &rusqlite::Connection, status_filter: Option<&str>) -> Result<Vec<CultureItem>> {
        items::get_culture_items(conn, status_filter)
    }

    pub fn create_item(db: &Database, item: CultureItem) -> Result<CultureItem> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::create_culture_item(&conn, item)
    }

    pub fn create_item_conn(conn: &rusqlite::Connection, item: CultureItem) -> Result<CultureItem> {
        items::create_culture_item(conn, item)
    }

    pub fn update_item(db: &Database, id: &str, item: &CultureItem) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::update_culture_item(&conn, id, item)
    }

    pub fn update_item_conn(conn: &rusqlite::Connection, id: &str, item: &CultureItem) -> Result<bool> {
        items::update_culture_item(conn, id, item)
    }

    pub fn increment_progress(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::increment_culture_progress(&conn, id)
    }

    pub fn increment_progress_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        items::increment_culture_progress(conn, id)
    }

    pub fn update_progress(db: &Database, id: &str, progress: i32) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::update_culture_progress(&conn, id, progress)
    }

    pub fn update_progress_conn(conn: &rusqlite::Connection, id: &str, progress: i32) -> Result<bool> {
        items::update_culture_progress(conn, id, progress)
    }

    pub fn update_status(db: &Database, id: &str, status: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::update_culture_status(&conn, id, status)
    }

    pub fn update_status_conn(conn: &rusqlite::Connection, id: &str, status: &str) -> Result<bool> {
        items::update_culture_status(conn, id, status)
    }

    pub fn set_goal(db: &Database, id: &str, is_goal: bool, goal_note: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::set_culture_goal(&conn, id, is_goal, goal_note)
    }

    pub fn set_goal_conn(conn: &rusqlite::Connection, id: &str, is_goal: bool, goal_note: &str) -> Result<bool> {
        items::set_culture_goal(conn, id, is_goal, goal_note)
    }

    pub fn delete_item(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::delete_culture_item(&conn, id)
    }

    pub fn delete_item_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        items::delete_culture_item(conn, id)
    }

    pub fn get_episodes(db: &Database, item_id: &str) -> Result<Vec<CultureEpisode>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        episodes::get_culture_episodes(&conn, item_id)
    }

    pub fn get_episodes_conn(conn: &rusqlite::Connection, item_id: &str) -> Result<Vec<CultureEpisode>> {
        episodes::get_culture_episodes(conn, item_id)
    }

    pub fn add_episode(
        db: &Database,
        item_id: &str,
        episode_number: i32,
        title: &str,
        synopsis: &str,
        season_number: i32,
        episode_in_season: i32,
        aired_at: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        episodes::add_culture_episode(
            &conn,
            item_id,
            episode_number,
            title,
            synopsis,
            season_number,
            episode_in_season,
            aired_at,
        )
    }

    pub fn add_episode_conn(
        conn: &rusqlite::Connection,
        item_id: &str,
        episode_number: i32,
        title: &str,
        synopsis: &str,
        season_number: i32,
        episode_in_season: i32,
        aired_at: Option<&str>,
    ) -> Result<bool> {
        episodes::add_culture_episode(
            conn,
            item_id,
            episode_number,
            title,
            synopsis,
            season_number,
            episode_in_season,
            aired_at,
        )
    }

    pub fn toggle_episode_watched(db: &Database, episode_id: &str, item_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        episodes::toggle_episode_watched(&conn, episode_id, item_id)
    }

    pub fn toggle_episode_watched_conn(conn: &rusqlite::Connection, episode_id: &str, item_id: &str) -> Result<bool> {
        episodes::toggle_episode_watched(conn, episode_id, item_id)
    }

    pub fn bulk_create_episodes(db: &Database, item_id: &str, count: i32) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        episodes::bulk_create_episodes(&conn, item_id, count)
    }

    pub fn bulk_create_episodes_conn(conn: &rusqlite::Connection, item_id: &str, count: i32) -> Result<bool> {
        episodes::bulk_create_episodes(conn, item_id, count)
    }

    pub fn save_episodes(db: &Database, item_id: &str, eps: &[CultureEpisode]) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        episodes::save_episodes(&conn, item_id, eps)
    }

    pub fn save_episodes_conn(conn: &rusqlite::Connection, item_id: &str, eps: &[CultureEpisode]) -> Result<bool> {
        episodes::save_episodes(conn, item_id, eps)
    }

    pub fn delete_episode(db: &Database, episode_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        episodes::delete_culture_episode(&conn, episode_id)
    }

    pub fn delete_episode_conn(conn: &rusqlite::Connection, episode_id: &str) -> Result<bool> {
        episodes::delete_culture_episode(conn, episode_id)
    }
}
