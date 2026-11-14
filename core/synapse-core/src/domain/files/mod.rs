pub mod folders;
pub mod items;
pub mod models;
#[cfg(test)]
mod tests;

pub use folders::*;
pub use items::*;
pub use models::*;

use crate::db::Database;
use crate::error::{Result, SynapseError};

pub struct FilesRepository;

impl FilesRepository {
    pub fn get_folders(db: &Database, parent_id: Option<&str>) -> Result<Vec<FileFolder>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::get_file_folders(&conn, parent_id)
    }

    pub fn get_folders_conn(conn: &rusqlite::Connection, parent_id: Option<&str>) -> Result<Vec<FileFolder>> {
        folders::get_file_folders(conn, parent_id)
    }

    pub fn get_all_folders(db: &Database) -> Result<Vec<FileFolder>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::get_all_file_folders(&conn)
    }

    pub fn get_all_folders_conn(conn: &rusqlite::Connection) -> Result<Vec<FileFolder>> {
        folders::get_all_file_folders(conn)
    }

    pub fn create_folder(
        db: &Database,
        name: &str,
        parent_id: Option<&str>,
        color: Option<&str>,
    ) -> Result<Option<FileFolder>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::create_file_folder(&conn, name, parent_id, color)
    }

    pub fn create_folder_conn(
        conn: &rusqlite::Connection,
        name: &str,
        parent_id: Option<&str>,
        color: Option<&str>,
    ) -> Result<Option<FileFolder>> {
        folders::create_file_folder(conn, name, parent_id, color)
    }

    pub fn rename_folder(db: &Database, id: &str, new_name: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::rename_file_folder(&conn, id, new_name)
    }

    pub fn rename_folder_conn(conn: &rusqlite::Connection, id: &str, new_name: &str) -> Result<bool> {
        folders::rename_file_folder(conn, id, new_name)
    }

    pub fn move_folder(db: &Database, id: &str, new_parent_id: Option<&str>) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::move_file_folder(&conn, id, new_parent_id)
    }

    pub fn move_folder_conn(conn: &rusqlite::Connection, id: &str, new_parent_id: Option<&str>) -> Result<bool> {
        folders::move_file_folder(conn, id, new_parent_id)
    }

    pub fn delete_folder(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::delete_file_folder(&conn, id)
    }

    pub fn delete_folder_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        folders::delete_file_folder(conn, id)
    }

    pub fn get_files_for_section(
        db: &Database,
        section: &str,
        folder_id: Option<&str>,
    ) -> Result<Vec<FileRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::get_files_for_section(&conn, section, folder_id)
    }

    pub fn get_files_for_section_conn(
        conn: &rusqlite::Connection,
        section: &str,
        folder_id: Option<&str>,
    ) -> Result<Vec<FileRecord>> {
        items::get_files_for_section(conn, section, folder_id)
    }

    pub fn get_drive_file_count(db: &Database) -> Result<i32> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::get_drive_file_count(&conn)
    }

    pub fn get_drive_file_count_conn(conn: &rusqlite::Connection) -> Result<i32> {
        items::get_drive_file_count(conn)
    }

    pub fn rename_file(db: &Database, file_id: &str, name: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::rename_file(&conn, file_id, name)
    }

    pub fn rename_file_conn(conn: &rusqlite::Connection, file_id: &str, name: &str) -> Result<bool> {
        items::rename_file(conn, file_id, name)
    }

    pub fn move_file(db: &Database, file_id: &str, folder_id: Option<&str>) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::move_file(&conn, file_id, folder_id)
    }

    pub fn move_file_conn(conn: &rusqlite::Connection, file_id: &str, folder_id: Option<&str>) -> Result<bool> {
        items::move_file(conn, file_id, folder_id)
    }

    pub fn duplicate_file(
        db: &Database,
        file_id: &str,
        folder_id: Option<&str>,
    ) -> Result<Option<String>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::duplicate_file(&conn, file_id, folder_id)
    }

    pub fn duplicate_file_conn(
        conn: &rusqlite::Connection,
        file_id: &str,
        folder_id: Option<&str>,
    ) -> Result<Option<String>> {
        items::duplicate_file(conn, file_id, folder_id)
    }

    pub fn delete_file(db: &Database, file_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::delete_file(&conn, file_id)
    }

    pub fn delete_file_conn(conn: &rusqlite::Connection, file_id: &str) -> Result<bool> {
        items::delete_file(conn, file_id)
    }

    pub fn delete_files(db: &Database, file_ids: &[&str]) -> Result<i32> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::delete_files(&conn, file_ids)
    }

    pub fn delete_files_conn(conn: &rusqlite::Connection, file_ids: &[&str]) -> Result<i32> {
        items::delete_files(conn, file_ids)
    }

    pub fn link_file_to_page(db: &Database, file_id: &str, page_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::link_file_to_page(&conn, file_id, page_id)
    }

    pub fn link_file_to_page_conn(conn: &rusqlite::Connection, file_id: &str, page_id: &str) -> Result<bool> {
        items::link_file_to_page(conn, file_id, page_id)
    }

    pub fn unlink_file_from_page(db: &Database, file_id: &str, page_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::unlink_file_from_page(&conn, file_id, page_id)
    }

    pub fn unlink_file_from_page_conn(conn: &rusqlite::Connection, file_id: &str, page_id: &str) -> Result<bool> {
        items::unlink_file_from_page(conn, file_id, page_id)
    }

    pub fn get_file_linked_pages(db: &Database, file_id: &str) -> Result<Vec<String>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::get_file_linked_pages(&conn, file_id)
    }

    pub fn get_file_linked_pages_conn(conn: &rusqlite::Connection, file_id: &str) -> Result<Vec<String>> {
        items::get_file_linked_pages(conn, file_id)
    }
}
