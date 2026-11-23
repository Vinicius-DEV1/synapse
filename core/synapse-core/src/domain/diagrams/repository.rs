//! Whiteboard diagrams database queries and persistence.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};

use super::models::{DiagramMeta, DiagramRecord};
use crate::error::Result;

/// Retrieves metadata of all active diagrams.
pub fn get_diagrams(conn: &Connection) -> Result<Vec<DiagramMeta>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, icon, created_at, updated_at, deleted_at \
         FROM diagrams WHERE deleted_at IS NULL ORDER BY updated_at DESC",
    )?;

    let iter = stmt.query_map([], |row| {
        Ok(DiagramMeta {
            id: row.get(0)?,
            title: row.get(1)?,
            icon: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            deleted_at: row.get(5)?,
        })
    })?;

    let mut diagrams = Vec::new();
    for d in iter {
        diagrams.push(d?);
    }
    Ok(diagrams)
}

/// Retrieves a single diagram by ID.
pub fn get_diagram(conn: &Connection, id: &str) -> Result<Option<DiagramRecord>> {
    let sql =
        "SELECT id, title, icon, content, encrypted_content, created_at, updated_at, deleted_at \
               FROM diagrams WHERE id = ?1 AND deleted_at IS NULL";

    let opt = conn
        .query_row(sql, params![id], |row| {
            Ok(DiagramRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                icon: row.get(2)?,
                content: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                encrypted_content: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
            })
        })
        .optional()?;

    Ok(opt)
}

/// Creates a new diagram.
pub fn create_diagram(conn: &Connection, diagram: &DiagramRecord) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    let created = diagram.created_at.as_deref().unwrap_or(&now);
    let updated = diagram.updated_at.as_deref().unwrap_or(&now);

    conn.execute(
        "INSERT INTO diagrams (id, title, content, encrypted_content, icon, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            diagram.id,
            diagram.title,
            diagram.content,
            diagram.encrypted_content,
            diagram.icon,
            created,
            updated,
        ],
    )?;
    Ok(())
}

/// Updates title, content, encrypted content, and icon of a diagram.
pub fn save_diagram(
    conn: &Connection,
    id: &str,
    title: &str,
    content: &str,
    encrypted_content: Option<&str>,
    icon: &str,
) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE diagrams SET title = ?1, content = ?2, encrypted_content = ?3, icon = ?4, updated_at = ?5 \
         WHERE id = ?6 AND deleted_at IS NULL",
        params![title, content, encrypted_content, icon, now, id],
    )?;
    Ok(rows > 0)
}

/// Soft-deletes a diagram by ID.
pub fn delete_diagram(conn: &Connection, id: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE diagrams SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, id],
    )?;
    Ok(rows > 0)
}
