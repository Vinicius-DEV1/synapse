use super::models::AppNotification;
use crate::error::Result;
use rusqlite::params;

pub fn get_notifications(conn: &rusqlite::Connection) -> Result<Vec<AppNotification>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, message, type, target_page_id, event_id, scheduled_for, \
         fired_at, is_read, created_at, updated_at \
         FROM notifications WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100",
    )?;

    let iter = stmt.query_map([], |row| {
        let is_read_int: i32 = row.get(8).unwrap_or(0);
        Ok(AppNotification {
            id: row.get(0)?,
            title: row.get(1)?,
            message: row.get(2)?,
            type_: row.get(3)?,
            target_page_id: row.get(4)?,
            event_id: row.get(5)?,
            scheduled_for: row.get(6)?,
            fired_at: row.get(7).unwrap_or_default(),
            is_read: is_read_int != 0,
            created_at: row.get(9).unwrap_or_default(),
            updated_at: row.get(10)?,
        })
    })?;

    let mut list = Vec::new();
    for n in iter.flatten() {
        list.push(n);
    }
    Ok(list)
}

pub fn get_unread_count(conn: &rusqlite::Connection) -> Result<i32> {
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM notifications WHERE is_read = 0 AND deleted_at IS NULL",
        [],
        |row| row.get(0),
    ).unwrap_or(0);
    Ok(count)
}

pub fn add_notification(
    conn: &rusqlite::Connection,
    title: &str,
    message: &str,
    notification_type: &str,
    target_page_id: Option<&str>,
    event_id: Option<&str>,
    scheduled_for: Option<&str>,
) -> Result<AppNotification> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let resolved_type = if notification_type.trim().is_empty() {
        "system"
    } else {
        notification_type.trim()
    };

    conn.execute(
        "INSERT INTO notifications (id, title, message, type, target_page_id, event_id, \
         scheduled_for, fired_at, is_read, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, CURRENT_TIMESTAMP)",
        params![
            id,
            title.trim(),
            message.trim(),
            resolved_type,
            target_page_id.map(|s| s.trim()).filter(|s| !s.is_empty()),
            event_id.map(|s| s.trim()).filter(|s| !s.is_empty()),
            scheduled_for.map(|s| s.trim()).filter(|s| !s.is_empty()),
            now,
            now,
        ],
    )?;

    Ok(AppNotification {
        id,
        title: title.trim().to_string(),
        message: message.trim().to_string(),
        type_: resolved_type.to_string(),
        target_page_id: target_page_id.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()),
        event_id: event_id.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()),
        scheduled_for: scheduled_for.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()),
        fired_at: now.clone(),
        is_read: false,
        created_at: now,
        updated_at: None,
    })
}

pub fn mark_notification_read(conn: &rusqlite::Connection, id: Option<&str>) -> Result<bool> {
    let rows = match id {
        Some(target_id) if !target_id.trim().is_empty() => conn.execute(
            "UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP \
             WHERE id = ?1 AND deleted_at IS NULL",
            params![target_id.trim()],
        )?,
        _ => conn.execute(
            "UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP \
             WHERE is_read = 0 AND deleted_at IS NULL",
            [],
        )?,
    };

    Ok(rows > 0)
}

pub fn delete_notification(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    if id.trim().is_empty() {
        return Ok(false);
    }

    let rows = conn.execute(
        "UPDATE notifications SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id.trim()],
    )?;

    Ok(rows > 0)
}

pub fn clear_all_notifications(conn: &rusqlite::Connection) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE notifications SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE deleted_at IS NULL",
        [],
    )?;

    Ok(rows > 0)
}
