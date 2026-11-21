//! Pages CRUD, persistence, pin toggling, and recursive subtree deletion.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

use super::models::{PageMetaRecord, PageRecord};
use crate::error::Result;

/// Retrieves lightweight metadata for all non-deleted pages without reading content, encrypted_content, or crdt_state blobs.
pub fn get_page_metas(conn: &Connection) -> Result<Vec<PageMetaRecord>> {
    let sql = "SELECT id, parent_id, title, icon, sort_order, created_at, updated_at, \
               deleted_at, cover_image, description, is_pinned, pinned_order, is_locked \
               FROM pages WHERE deleted_at IS NULL \
               ORDER BY updated_at DESC";
    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query([])?;

    let mut pages = Vec::new();
    while let Some(row) = rows.next()? {
        let sort_order = match row.get_ref(4)? {
            rusqlite::types::ValueRef::Integer(value) => value as f64,
            rusqlite::types::ValueRef::Real(value) => value,
            _ => 0.0,
        };
        pages.push(PageMetaRecord {
            id: row.get(0)?,
            parent_id: row.get(1)?,
            title: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            icon: row
                .get::<_, Option<String>>(3)?
                .unwrap_or_else(|| "📄".to_string()),
            sort_order,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            deleted_at: row.get(7)?,
            cover_image: row.get(8)?,
            description: row.get(9)?,
            is_pinned: row.get::<_, Option<i32>>(10)?.unwrap_or(0),
            pinned_order: row.get::<_, Option<f64>>(11)?.unwrap_or(0.0),
            is_locked: row.get::<_, Option<i32>>(12)?.unwrap_or(0),
        });
    }
    Ok(pages)
}

/// Retrieves pages matching an optional title filter, ordered by updated_at descending.
pub fn get_pages(conn: &Connection, filter: Option<&str>) -> Result<Vec<PageRecord>> {
    let mut sql = String::from(
        "SELECT id, parent_id, title, content, icon, sort_order, created_at, updated_at, \
         deleted_at, cover_image, description, password_salt, crdt_state, encrypted_content, \
         is_pinned, pinned_order, is_locked \
         FROM pages WHERE deleted_at IS NULL ",
    );

    let mut param_values = Vec::new();
    let has_filter = filter.map(|f| !f.trim().is_empty()).unwrap_or(false);
    if let Some(f) = filter {
        let trimmed = f.trim();
        if !trimmed.is_empty() {
            sql.push_str("AND title LIKE ?1 ");
            param_values.push(format!("%{}%", trimmed));
        }
    }

    sql.push_str("ORDER BY updated_at DESC");
    if has_filter {
        sql.push_str(" LIMIT 150");
    }

    let mut stmt = conn.prepare(&sql)?;
    let mut rows = if param_values.is_empty() {
        stmt.query([])?
    } else {
        stmt.query(rusqlite::params_from_iter(param_values.iter()))?
    };

    let mut pages = Vec::new();
    while let Some(row) = rows.next()? {
        pages.push(map_page_row(row)?);
    }
    Ok(pages)
}

/// Retrieves all pinned pages ordered by pinned_order and updated_at.
pub fn get_pinned_pages(conn: &Connection) -> Result<Vec<PageRecord>> {
    let sql = "SELECT id, parent_id, title, content, icon, sort_order, created_at, updated_at, \
               deleted_at, cover_image, description, password_salt, crdt_state, encrypted_content, \
               is_pinned, pinned_order, is_locked \
               FROM pages WHERE deleted_at IS NULL AND is_pinned = 1 \
               ORDER BY pinned_order ASC, updated_at DESC";
    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query([])?;

    let mut pages = Vec::new();
    while let Some(row) = rows.next()? {
        pages.push(map_page_row(row)?);
    }
    Ok(pages)
}

/// Retrieves recent pages ordered by updated_at DESC with a limit.
pub fn get_recent_pages(conn: &Connection, limit: usize) -> Result<Vec<PageRecord>> {
    let sql = "SELECT id, parent_id, title, content, icon, sort_order, created_at, updated_at, \
               deleted_at, cover_image, description, password_salt, crdt_state, encrypted_content, \
               is_pinned, pinned_order, is_locked \
               FROM pages WHERE deleted_at IS NULL \
               ORDER BY updated_at DESC LIMIT ?1";
    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![limit as i64])?;

    let mut pages = Vec::new();
    while let Some(row) = rows.next()? {
        pages.push(map_page_row(row)?);
    }
    Ok(pages)
}

/// Retrieves a single page by ID.
pub fn get_page(conn: &Connection, page_id: &str) -> Result<Option<PageRecord>> {
    let sql = "SELECT id, parent_id, title, content, icon, sort_order, created_at, updated_at, \
               deleted_at, cover_image, description, password_salt, crdt_state, encrypted_content, \
               is_pinned, pinned_order, is_locked \
               FROM pages WHERE id = ?1 AND deleted_at IS NULL";

    let opt = conn.query_row(sql, params![page_id], map_page_row).optional()?;
    Ok(opt)
}

/// Creates a new subpage under an optional parent.
pub fn create_page(
    conn: &Connection,
    parent_id: Option<&str>,
    title: &str,
    icon: Option<&str>,
) -> Result<PageRecord> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let effective_title = if title.trim().is_empty() { "Nova Página" } else { title.trim() };
    let effective_icon = icon.unwrap_or("📄");

    conn.execute(
        "INSERT INTO pages (id, parent_id, title, content, icon, sort_order, created_at, updated_at, \
         is_pinned, pinned_order, is_locked) \
         VALUES (?1, ?2, ?3, '', ?4, 0, ?5, ?5, 0, 0.0, 0)",
        params![id, parent_id, effective_title, effective_icon, now],
    )?;

    Ok(PageRecord {
        id,
        parent_id: parent_id.map(|s| s.to_string()),
        title: effective_title.to_string(),
        content: String::new(),
        icon: effective_icon.to_string(),
        sort_order: 0,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
        cover_image: None,
        description: None,
        password_salt: None,
        crdt_state: None,
        encrypted_content: None,
        is_pinned: 0,
        pinned_order: 0.0,
        is_locked: 0,
    })
}

/// Saves page title, content, encrypted_content, and icon (inserting if not exists).
pub fn save_page(
    conn: &Connection,
    id: &str,
    title: &str,
    content: &str,
    encrypted_content: Option<&str>,
    icon: &str,
) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE pages SET title = ?1, content = ?2, encrypted_content = ?3, icon = ?4, \
         crdt_state = NULL, updated_at = ?5 WHERE id = ?6 AND deleted_at IS NULL",
        params![title, content, encrypted_content, icon, now, id],
    )?;
    if rows == 0 {
        let inserted = conn.execute(
            "INSERT INTO pages (id, title, content, encrypted_content, icon, sort_order, is_pinned, pinned_order, is_locked, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, 0.0, 0, ?6, ?6)",
            params![id, title, content, encrypted_content, icon, now],
        )?;
        Ok(inserted > 0)
    } else {
        Ok(true)
    }
}

/// Renames a page title.
pub fn rename_page(conn: &Connection, page_id: &str, title: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE pages SET title = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![title, now, page_id],
    )?;
    Ok(rows > 0)
}

/// Updates page icon.
pub fn update_page_icon(conn: &Connection, page_id: &str, icon: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE pages SET icon = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![icon, now, page_id],
    )?;
    Ok(rows > 0)
}

/// Updates page description.
pub fn update_page_description(conn: &Connection, page_id: &str, description: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE pages SET description = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![description, now, page_id],
    )?;
    Ok(rows > 0)
}

/// Updates page cover image.
pub fn update_page_cover(conn: &Connection, page_id: &str, cover_image: Option<&str>) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE pages SET cover_image = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![cover_image, now, page_id],
    )?;
    Ok(rows > 0)
}

/// Toggles pinned state of a page.
pub fn toggle_pin_page(conn: &Connection, page_id: &str) -> Result<bool> {
    let current_pinned: Option<i32> = conn
        .query_row(
            "SELECT is_pinned FROM pages WHERE id = ?1 AND deleted_at IS NULL",
            params![page_id],
            |r| r.get(0),
        )
        .optional()?;

    let is_pinned = match current_pinned {
        Some(p) => p,
        None => return Ok(false),
    };

    let next_pinned = if is_pinned == 1 { 0 } else { 1 };
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE pages SET is_pinned = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![next_pinned, now, page_id],
    )?;
    Ok(rows > 0)
}

/// Soft-deletes a page and all its hierarchical children recursively, plus linked calendar events.
pub fn soft_delete_page_subtree(conn: &Connection, page_id: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let cte = "WITH RECURSIVE note_subtree(id) AS (\
               SELECT id FROM pages WHERE id = ?1 AND deleted_at IS NULL \
               UNION \
               SELECT child.id FROM pages AS child \
               JOIN note_subtree AS parent ON child.parent_id = parent.id \
               WHERE child.deleted_at IS NULL) ";

    let update_events_sql = format!(
        "{} UPDATE calendar_events SET deleted_at = ?2, updated_at = ?2 \
         WHERE page_id IN (SELECT id FROM note_subtree)",
        cte
    );
    let _ = conn.execute(&update_events_sql, params![page_id, now]);

    let update_pages_sql = format!(
        "{} UPDATE pages SET deleted_at = ?2, updated_at = ?2 \
         WHERE id IN (SELECT id FROM note_subtree)",
        cte
    );
    let rows = conn.execute(&update_pages_sql, params![page_id, now])?;
    Ok(rows > 0)
}

/// Restores a soft-deleted page.
pub fn restore_page(conn: &Connection, page_id: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE pages SET deleted_at = NULL, updated_at = ?1 WHERE id = ?2",
        params![now, page_id],
    )?;
    Ok(rows > 0)
}

fn map_page_row(row: &rusqlite::Row) -> rusqlite::Result<PageRecord> {
    let sort_order = match row.get_ref(5)? {
        rusqlite::types::ValueRef::Integer(value) => value as i32,
        rusqlite::types::ValueRef::Real(value) => value as i32,
        _ => 0,
    };
    Ok(PageRecord {
        id: row.get(0)?,
        parent_id: row.get(1)?,
        title: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
        content: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
        icon: row.get::<_, Option<String>>(4)?.unwrap_or_else(|| "📄".to_string()),
        sort_order,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
        deleted_at: row.get(8)?,
        cover_image: row.get(9)?,
        description: row.get(10)?,
        password_salt: row.get(11)?,
        crdt_state: row.get(12)?,
        encrypted_content: row.get(13)?,
        is_pinned: row.get::<_, Option<i32>>(14)?.unwrap_or(0),
        pinned_order: row.get::<_, Option<f64>>(15)?.unwrap_or(0.0),
        is_locked: row.get::<_, Option<i32>>(16)?.unwrap_or(0),
    })
}
