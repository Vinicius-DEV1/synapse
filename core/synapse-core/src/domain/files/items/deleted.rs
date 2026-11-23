use crate::error::Result;
use rusqlite::{params, OptionalExtension};

pub fn get_deleted_file_local_path(
    conn: &rusqlite::Connection,
    file_id: &str,
) -> Result<Option<String>> {
    Ok(conn
        .query_row(
            "SELECT local_path FROM files WHERE id = ?1 AND deleted_at IS NOT NULL",
            params![file_id.trim()],
            |row| row.get(0),
        )
        .optional()?)
}

pub fn get_deleted_file_local_paths(conn: &rusqlite::Connection) -> Result<Vec<String>> {
    let mut statement = conn.prepare(
        "SELECT local_path FROM files WHERE deleted_at IS NOT NULL AND local_path IS NOT NULL",
    )?;
    let paths = statement.query_map([], |row| row.get(0))?;
    Ok(paths.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn is_file_local_path_referenced(
    conn: &rusqlite::Connection,
    local_path: &str,
) -> Result<bool> {
    Ok(conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM files WHERE local_path = ?1)",
        params![local_path],
        |row| row.get(0),
    )?)
}
