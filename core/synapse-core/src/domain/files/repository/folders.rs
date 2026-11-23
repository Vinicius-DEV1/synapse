use super::FilesRepository;
use crate::db::Database;
use crate::domain::files::folders;
use crate::domain::files::FileFolder;
use crate::error::{Result, SynapseError};

impl FilesRepository {
    pub fn get_folders(db: &Database, parent_id: Option<&str>) -> Result<Vec<FileFolder>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::get_file_folders(&conn, parent_id)
    }

    pub fn get_folders_conn(
        conn: &rusqlite::Connection,
        parent_id: Option<&str>,
    ) -> Result<Vec<FileFolder>> {
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

    pub fn rename_folder_conn(
        conn: &rusqlite::Connection,
        id: &str,
        new_name: &str,
    ) -> Result<bool> {
        folders::rename_file_folder(conn, id, new_name)
    }

    pub fn move_folder(db: &Database, id: &str, new_parent_id: Option<&str>) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::move_file_folder(&conn, id, new_parent_id)
    }

    pub fn move_folder_conn(
        conn: &rusqlite::Connection,
        id: &str,
        new_parent_id: Option<&str>,
    ) -> Result<bool> {
        folders::move_file_folder(conn, id, new_parent_id)
    }

    pub fn delete_folder(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        folders::delete_file_folder(&conn, id)
    }

    pub fn delete_folder_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        folders::delete_file_folder(conn, id)
    }
}
