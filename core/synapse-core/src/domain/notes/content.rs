use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use super::models::PageRecord;
use crate::error::Result;

pub fn create_page(
    conn: &Connection,
    parent_id: Option<&str>,
    title: &str,
    icon: Option<&str>,
) -> Result<PageRecord> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let effective_title = if title.trim().is_empty() {
        "Nova Página"
    } else {
        title.trim()
    };
    let effective_icon = icon.unwrap_or("📄");

    conn.execute(
        "INSERT INTO pages (id, parent_id, title, content, icon, sort_order, created_at, updated_at, \
         is_pinned, pinned_order, is_locked) \
         VALUES (?1, ?2, ?3, '', ?4, 0, ?5, ?5, 0, 0.0, 0)",
        params![id, parent_id, effective_title, effective_icon, now],
    )?;

    Ok(PageRecord {
        id,
        parent_id: parent_id.map(ToOwned::to_owned),
        title: effective_title.to_owned(),
        content: String::new(),
        icon: effective_icon.to_owned(),
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
