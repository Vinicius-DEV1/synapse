use super::super::models::FileRecord;
use crate::error::Result;
use rusqlite::{params, OptionalExtension};

pub fn get_files_for_section(
    conn: &rusqlite::Connection,
    section: &str,
    folder_id: Option<&str>,
) -> Result<Vec<FileRecord>> {
    let mut sql = String::from(
        "SELECT id, name, file_type, file_size, local_path, drive_file_id, \
         CASE WHEN drive_file_id IS NOT NULL AND drive_file_id != '' THEN 1 ELSE 0 END AS has_drive_copy, \
         folder_id, mime_type, created_at, updated_at \
         FROM files WHERE deleted_at IS NULL",
    );

    let clean_folder = folder_id.map(|s| s.trim()).filter(|s| !s.is_empty());

    match section {
        "recent" => {
            sql.push_str(" AND updated_at >= datetime('now', '-30 days') ORDER BY updated_at DESC, name COLLATE NOCASE ASC");
        }
        "drive" => {
            sql.push_str(" AND drive_file_id IS NOT NULL AND drive_file_id != '' ORDER BY name COLLATE NOCASE ASC");
        }
        _ => {
            if clean_folder.is_none() {
                sql.push_str(" AND folder_id IS NULL ORDER BY name COLLATE NOCASE ASC");
            } else {
                sql.push_str(" AND folder_id = ?1 ORDER BY name COLLATE NOCASE ASC");
            }
        }
    }

    let mut stmt = conn.prepare(&sql)?;
    let rows: Vec<FileRecord> =
        if section != "recent" && section != "drive" && clean_folder.is_some() {
            stmt.query_map([clean_folder.unwrap()], map_file_record)?
                .collect::<rusqlite::Result<Vec<_>>>()?
        } else {
            stmt.query_map([], map_file_record)?
                .collect::<rusqlite::Result<Vec<_>>>()?
        };

    Ok(rows)
}

pub fn search_files(
    conn: &rusqlite::Connection,
    section: &str,
    query: &str,
    limit: i64,
) -> Result<Vec<FileRecord>> {
    let clean_query = query.trim();
    if clean_query.is_empty() || limit <= 0 {
        return Ok(Vec::new());
    }

    let escaped_query = clean_query
        .replace('!', "!!")
        .replace('%', "!%")
        .replace('_', "!_");
    let pattern = format!("%{escaped_query}%");
    let mut sql = String::from(
        "SELECT id, name, file_type, file_size, local_path, drive_file_id, \
         CASE WHEN drive_file_id IS NOT NULL AND drive_file_id != '' THEN 1 ELSE 0 END AS has_drive_copy, \
         folder_id, mime_type, created_at, updated_at \
         FROM files WHERE deleted_at IS NULL AND name LIKE ?1 ESCAPE '!'",
    );
    match section {
        "recent" => sql.push_str(" AND updated_at >= datetime('now', '-30 days')"),
        "drive" => sql.push_str(" AND drive_file_id IS NOT NULL AND drive_file_id != ''"),
        _ => {}
    }
    sql.push_str(" ORDER BY name COLLATE NOCASE ASC LIMIT ?2");

    let mut statement = conn.prepare(&sql)?;
    let rows = statement
        .query_map(rusqlite::params![pattern, limit.min(500)], map_file_record)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(rows)
}

pub fn get_drive_file_count(conn: &rusqlite::Connection) -> Result<i32> {
    let count: i32 = conn.query_row(
        "SELECT count(*) FROM files WHERE deleted_at IS NULL AND drive_file_id IS NOT NULL AND drive_file_id != ''",
        [],
        |r| r.get(0),
    )?;
    Ok(count)
}

pub fn get_file(conn: &rusqlite::Connection, file_id: &str) -> Result<Option<FileRecord>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, file_type, file_size, local_path, drive_file_id, \
         CASE WHEN drive_file_id IS NOT NULL AND drive_file_id != '' THEN 1 ELSE 0 END AS has_drive_copy, \
         folder_id, mime_type, created_at, updated_at \
         FROM files WHERE id = ?1 AND deleted_at IS NULL",
    )?;
    Ok(stmt
        .query_row(params![file_id.trim()], map_file_record)
        .optional()?)
}

pub fn list_files_optional_folder(
    conn: &rusqlite::Connection,
    folder_id: Option<&str>,
) -> Result<Vec<FileRecord>> {
    let mut sql = String::from(
        "SELECT id, name, file_type, file_size, local_path, drive_file_id, \
         CASE WHEN drive_file_id IS NOT NULL AND drive_file_id != '' THEN 1 ELSE 0 END AS has_drive_copy, \
         folder_id, mime_type, created_at, updated_at \
         FROM files WHERE deleted_at IS NULL",
    );
    if folder_id.is_some() {
        sql.push_str(" AND folder_id = ?1");
    }
    let mut stmt = conn.prepare(&sql)?;
    let rows = if let Some(fid) = folder_id {
        stmt.query_map([fid], map_file_record)?
            .collect::<rusqlite::Result<Vec<_>>>()?
    } else {
        stmt.query_map([], map_file_record)?
            .collect::<rusqlite::Result<Vec<_>>>()?
    };
    Ok(rows)
}

fn map_file_record(row: &rusqlite::Row<'_>) -> rusqlite::Result<FileRecord> {
    Ok(FileRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        file_type: row.get(2)?,
        file_size: row.get(3)?,
        local_path: row.get(4)?,
        drive_file_id: row.get(5)?,
        has_drive_copy: row.get(6)?,
        folder_id: row.get(7)?,
        mime_type: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
    })
}
