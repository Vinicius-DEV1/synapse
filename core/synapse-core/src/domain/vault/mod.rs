pub mod groups;
pub mod items;
pub mod migrations;
pub mod models;
#[cfg(test)]
mod tests;

pub use groups::*;
pub use items::*;
pub use migrations::*;
pub use models::*;

use crate::db::Database;
use crate::error::{Result, SynapseError};

pub struct VaultRepository;

impl VaultRepository {
    pub fn get_groups(db: &Database) -> Result<Vec<VaultGroup>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        groups::get_vault_groups(&conn)
    }

    pub fn get_groups_conn(conn: &rusqlite::Connection) -> Result<Vec<VaultGroup>> {
        groups::get_vault_groups(conn)
    }

    pub fn create_group(
        db: &Database,
        name: &str,
        icon: Option<&str>,
        color: Option<&str>,
    ) -> Result<VaultGroup> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        groups::create_vault_group(&conn, name, icon, color)
    }

    pub fn create_group_conn(
        conn: &rusqlite::Connection,
        name: &str,
        icon: Option<&str>,
        color: Option<&str>,
    ) -> Result<VaultGroup> {
        groups::create_vault_group(conn, name, icon, color)
    }

    pub fn update_group(
        db: &Database,
        id: &str,
        name: &str,
        icon: Option<&str>,
        color: Option<&str>,
        position: Option<i32>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        groups::update_vault_group(&conn, id, name, icon, color, position)
    }

    pub fn update_group_conn(
        conn: &rusqlite::Connection,
        id: &str,
        name: &str,
        icon: Option<&str>,
        color: Option<&str>,
        position: Option<i32>,
    ) -> Result<bool> {
        groups::update_vault_group(conn, id, name, icon, color, position)
    }

    pub fn delete_group(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        groups::delete_vault_group(&conn, id)
    }

    pub fn delete_group_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        groups::delete_vault_group(conn, id)
    }

    pub fn get_items(db: &Database, group_id: Option<&str>) -> Result<Vec<VaultItem>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::get_vault_items(&conn, group_id)
    }

    pub fn get_items_conn(conn: &rusqlite::Connection, group_id: Option<&str>) -> Result<Vec<VaultItem>> {
        items::get_vault_items(conn, group_id)
    }

    pub fn save_item(db: &Database, item: VaultItem) -> Result<VaultItem> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::save_vault_item(&conn, item)
    }

    pub fn save_item_conn(conn: &rusqlite::Connection, item: VaultItem) -> Result<VaultItem> {
        items::save_vault_item(conn, item)
    }

    pub fn delete_item(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::delete_vault_item(&conn, id)
    }

    pub fn delete_item_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        items::delete_vault_item(conn, id)
    }

    pub fn get_password_history(db: &Database, item_id: &str) -> Result<Vec<VaultPasswordHistoryEntry>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::get_vault_password_history(&conn, item_id)
    }

    pub fn get_password_history_conn(conn: &rusqlite::Connection, item_id: &str) -> Result<Vec<VaultPasswordHistoryEntry>> {
        items::get_vault_password_history(conn, item_id)
    }
}
