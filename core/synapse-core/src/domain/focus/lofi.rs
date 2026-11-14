use super::models::LofiTrack;
use crate::error::Result;
use rusqlite::params;

pub fn get_lofis(conn: &rusqlite::Connection) -> Result<Vec<LofiTrack>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, original_name, duration, file_path, is_local, drive_file_id, \
         created_at, updated_at \
         FROM lofis WHERE deleted_at IS NULL ORDER BY title ASC",
    )?;

    let iter = stmt.query_map([], |row| {
        Ok(LofiTrack {
            id: row.get(0)?,
            title: row.get(1)?,
            original_name: row.get(2)?,
            duration: row.get(3).unwrap_or(0.0),
            file_path: row.get(4).unwrap_or_default(),
            is_local: row.get(5).unwrap_or(1),
            drive_file_id: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;

    let mut list = Vec::new();
    for track in iter.flatten() {
        list.push(track);
    }
    Ok(list)
}

pub fn add_lofi_track(
    conn: &rusqlite::Connection,
    title: &str,
    file_path: &str,
    duration: f64,
) -> Result<bool> {
    if title.trim().is_empty() {
        return Ok(false);
    }

    let id = uuid::Uuid::new_v4().to_string();
    let orig_name = std::path::Path::new(file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(title.trim());

    let rows = conn.execute(
        "INSERT INTO lofis (id, title, original_name, duration, file_path, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)",
        params![id, title.trim(), orig_name, duration, file_path.trim()],
    )?;

    Ok(rows > 0)
}

pub fn delete_lofi(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    if id.trim().is_empty() {
        return Ok(false);
    }

    let rows = conn.execute(
        "UPDATE lofis SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id.trim()],
    )?;

    Ok(rows > 0)
}
