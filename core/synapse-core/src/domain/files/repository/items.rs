use super::FilesRepository;
use crate::db::Database;
use crate::domain::files::items;
use crate::domain::files::FileRecord;
use crate::error::{Result, SynapseError};

impl FilesRepository {
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

    pub fn search_files(
        db: &Database,
        section: &str,
        query: &str,
        limit: i64,
    ) -> Result<Vec<FileRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::search_files(&conn, section, query, limit)
    }

    pub fn search_files_conn(
        conn: &rusqlite::Connection,
        section: &str,
        query: &str,
        limit: i64,
    ) -> Result<Vec<FileRecord>> {
        items::search_files(conn, section, query, limit)
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

    pub fn rename_file_conn(
        conn: &rusqlite::Connection,
        file_id: &str,
        name: &str,
    ) -> Result<bool> {
        items::rename_file(conn, file_id, name)
    }

    pub fn move_file(db: &Database, file_id: &str, folder_id: Option<&str>) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::move_file(&conn, file_id, folder_id)
    }

    pub fn move_file_conn(
        conn: &rusqlite::Connection,
        file_id: &str,
        folder_id: Option<&str>,
    ) -> Result<bool> {
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

    pub fn link_file_to_page_conn(
        conn: &rusqlite::Connection,
        file_id: &str,
        page_id: &str,
    ) -> Result<bool> {
        items::link_file_to_page(conn, file_id, page_id)
    }

    pub fn unlink_file_from_page(db: &Database, file_id: &str, page_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::unlink_file_from_page(&conn, file_id, page_id)
    }

    pub fn unlink_file_from_page_conn(
        conn: &rusqlite::Connection,
        file_id: &str,
        page_id: &str,
    ) -> Result<bool> {
        items::unlink_file_from_page(conn, file_id, page_id)
    }

    pub fn get_file_linked_pages(db: &Database, file_id: &str) -> Result<Vec<String>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::get_file_linked_pages(&conn, file_id)
    }

    pub fn get_file_linked_pages_conn(
        conn: &rusqlite::Connection,
        file_id: &str,
    ) -> Result<Vec<String>> {
        items::get_file_linked_pages(conn, file_id)
    }

    pub fn get_file(db: &Database, file_id: &str) -> Result<Option<FileRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::get_file(&conn, file_id)
    }

    pub fn get_file_conn(conn: &rusqlite::Connection, file_id: &str) -> Result<Option<FileRecord>> {
        items::get_file(conn, file_id)
    }

    pub fn get_deleted_file_local_path(db: &Database, file_id: &str) -> Result<Option<String>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::get_deleted_file_local_path(&conn, file_id)
    }

    pub fn get_deleted_file_local_paths(db: &Database) -> Result<Vec<String>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::get_deleted_file_local_paths(&conn)
    }

    pub fn is_file_local_path_referenced(db: &Database, local_path: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::is_file_local_path_referenced(&conn, local_path)
    }

    pub fn update_file_local_path(db: &Database, file_id: &str, local_path: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::update_file_local_path(&conn, file_id, local_path)
    }

    pub fn update_file_local_path_conn(
        conn: &rusqlite::Connection,
        file_id: &str,
        local_path: &str,
    ) -> Result<bool> {
        items::update_file_local_path(conn, file_id, local_path)
    }

    pub fn create_file(
        db: &Database,
        id: &str,
        name: &str,
        file_type: &str,
        file_size: i64,
        local_path: &str,
        folder_id: Option<&str>,
        mime_type: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::create_file(
            &conn, id, name, file_type, file_size, local_path, folder_id, mime_type,
        )
    }

    pub fn create_file_conn(
        conn: &rusqlite::Connection,
        id: &str,
        name: &str,
        file_type: &str,
        file_size: i64,
        local_path: &str,
        folder_id: Option<&str>,
        mime_type: Option<&str>,
    ) -> Result<bool> {
        items::create_file(
            conn, id, name, file_type, file_size, local_path, folder_id, mime_type,
        )
    }

    pub fn create_files(db: &Database, files: &[FileRecord]) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        items::create_files(&conn, files)
    }

    pub fn create_files_conn(conn: &rusqlite::Connection, files: &[FileRecord]) -> Result<bool> {
        items::create_files(conn, files)
    }

    pub fn list_files_optional_folder_conn(
        conn: &rusqlite::Connection,
        folder_id: Option<&str>,
    ) -> Result<Vec<FileRecord>> {
        items::list_files_optional_folder(conn, folder_id)
    }

    pub fn upsert_file_record_conn(
        conn: &rusqlite::Connection,
        id: &str,
        name: &str,
        file_type: &str,
        file_size: i64,
        enc_path: Option<&str>,
        enc_drive: Option<&str>,
        folder_id: Option<&str>,
        mime_type: Option<&str>,
        created_at: Option<&str>,
        updated_at: &str,
    ) -> Result<()> {
        items::upsert_file_record(
            conn, id, name, file_type, file_size, enc_path, enc_drive, folder_id, mime_type,
            created_at, updated_at,
        )
    }

    pub fn update_file_record_conn(
        conn: &rusqlite::Connection,
        id: &str,
        name: &str,
        file_type: &str,
        file_size: i64,
        enc_path: Option<&str>,
        enc_drive: Option<&str>,
        folder_id: Option<&str>,
        mime_type: Option<&str>,
        updated_at: &str,
    ) -> Result<i32> {
        items::update_file_record(
            conn, id, name, file_type, file_size, enc_path, enc_drive, folder_id, mime_type,
            updated_at,
        )
    }

    pub fn delete_file_with_annotations_conn(
        conn: &rusqlite::Connection,
        id: &str,
    ) -> Result<bool> {
        items::delete_file_with_annotations(conn, id)
    }

    pub fn move_file_raw_conn(
        conn: &rusqlite::Connection,
        id: &str,
        folder_id: Option<&str>,
    ) -> Result<bool> {
        items::move_file_raw(conn, id, folder_id)
    }
}
