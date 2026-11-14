//! Page revision history persistence and retrieval.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

use super::models::PageRevision;
use crate::error::Result;

/// Records a historical revision snapshot for a page.
pub fn record_page_history(
    conn: &Connection,
    page_id: &str,
    content: &str,
    encrypted_content: Option<&str>,
) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO page_history (id, page_id, content, encrypted_content, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, page_id, content, encrypted_content, now],
    )?;

    Ok(id)
}

/// Retrieves the revision history for a page, ordered newest first (up to 100 records).
pub fn get_page_history(conn: &Connection, page_id: &str) -> Result<Vec<PageRevision>> {
    let mut stmt = conn.prepare(
        "SELECT id, page_id, content, encrypted_content, created_at \
         FROM page_history WHERE page_id = ?1 ORDER BY created_at DESC LIMIT 100",
    )?;

    let mut rows = stmt.query(params![page_id])?;
    let mut revisions = Vec::new();

    while let Some(row) = rows.next()? {
        revisions.push(PageRevision {
            id: row.get(0)?,
            page_id: row.get(1)?,
            content: row.get(2)?,
            encrypted_content: row.get(3)?,
            created_at: row.get(4)?,
        });
    }

    Ok(revisions)
}

/// Retrieves a specific page revision by ID and page_id.
pub fn get_page_revision(
    conn: &Connection,
    page_id: &str,
    revision_id: &str,
) -> Result<Option<PageRevision>> {
    let sql = "SELECT id, page_id, content, encrypted_content, created_at \
               FROM page_history WHERE id = ?1 AND page_id = ?2";

    let opt = conn
        .query_row(sql, params![revision_id, page_id], |row| {
            Ok(PageRevision {
                id: row.get(0)?,
                page_id: row.get(1)?,
                content: row.get(2)?,
                encrypted_content: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .optional()?;

    Ok(opt)
}

/// Restores a historical revision into the active page record.
pub fn restore_page_revision(
    conn: &Connection,
    page_id: &str,
    revision_id: &str,
) -> Result<bool> {
    let revision = match get_page_revision(conn, page_id, revision_id)? {
        Some(r) => r,
        None => return Ok(false),
    };

    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE pages SET content = ?1, encrypted_content = ?2, crdt_state = NULL, updated_at = ?3 \
         WHERE id = ?4 AND deleted_at IS NULL",
        params![revision.content, revision.encrypted_content, now, page_id],
    )?;

    Ok(rows > 0)
}
