use crate::error::Result;
use rusqlite::params;

pub fn link_file_to_page(
    conn: &rusqlite::Connection,
    file_id: &str,
    page_id: &str,
) -> Result<bool> {
    if file_id.trim().is_empty() || page_id.trim().is_empty() {
        return Ok(false);
    }
    let rows = conn.execute(
        "INSERT OR IGNORE INTO file_page_links (file_id, page_id, created_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
        params![file_id.trim(), page_id.trim()],
    )?;
    Ok(rows > 0)
}

pub fn unlink_file_from_page(
    conn: &rusqlite::Connection,
    file_id: &str,
    page_id: &str,
) -> Result<bool> {
    if file_id.trim().is_empty() || page_id.trim().is_empty() {
        return Ok(false);
    }
    let rows = conn.execute(
        "DELETE FROM file_page_links WHERE file_id = ?1 AND page_id = ?2",
        params![file_id.trim(), page_id.trim()],
    )?;
    Ok(rows > 0)
}

pub fn get_file_linked_pages(conn: &rusqlite::Connection, file_id: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT page_id FROM file_page_links WHERE file_id = ?1 ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map([file_id.trim()], |row| row.get(0))?;
    Ok(rows.collect::<rusqlite::Result<Vec<String>>>()?)
}
