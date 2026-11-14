pub mod models;
pub mod repository;
#[cfg(test)]
mod tests;

pub use models::*;
pub use repository::*;

use crate::db::Database;
use crate::error::{Result, SynapseError};

pub struct TrashRepository;

impl TrashRepository {
    pub fn get_trash_items(db: &Database) -> Result<Vec<TrashItem>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::get_trash_items(&conn)
    }

    pub fn get_trash_items_conn(conn: &rusqlite::Connection) -> Result<Vec<TrashItem>> {
        repository::get_trash_items(conn)
    }

    pub fn restore_trash_item(db: &Database, id: &str, item_type: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::restore_trash_item(&conn, id, item_type)
    }

    pub fn restore_trash_item_conn(conn: &rusqlite::Connection, id: &str, item_type: &str) -> Result<bool> {
        repository::restore_trash_item(conn, id, item_type)
    }

    pub fn delete_trash_item_permanently(db: &Database, id: &str, item_type: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::delete_trash_item_permanently(&conn, id, item_type)
    }

    pub fn delete_trash_item_permanently_conn(conn: &rusqlite::Connection, id: &str, item_type: &str) -> Result<bool> {
        repository::delete_trash_item_permanently(conn, id, item_type)
    }

    pub fn empty_trash(db: &Database) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::empty_trash(&conn)
    }

    pub fn empty_trash_conn(conn: &rusqlite::Connection) -> Result<bool> {
        repository::empty_trash(conn)
    }
}
