use super::models::AppNotification;
use crate::error::Result;
use chrono::{Duration, Utc};
use rusqlite::{params, OptionalExtension};

const MAX_SNOOZE_DELAY_MINUTES: u32 = 10_080;

pub fn get_notifications(conn: &rusqlite::Connection) -> Result<Vec<AppNotification>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, message, type, target_page_id, event_id, scheduled_for, \
         event_reminder_minutes, fired_at, is_read, created_at, updated_at \
         FROM notifications WHERE deleted_at IS NULL \
           AND NOT (event_reminder_minutes IS NOT NULL AND scheduled_for IS NOT NULL) \
         ORDER BY created_at DESC LIMIT 100",
    )?;

    let iter = stmt.query_map([], |row| {
        let is_read_int: i32 = row.get(9)?;
        Ok(AppNotification {
            id: row.get(0)?,
            title: row.get(1)?,
            message: row.get(2)?,
            type_: row.get(3)?,
            target_page_id: row.get(4)?,
            event_id: row.get(5)?,
            scheduled_for: row.get(6)?,
            event_reminder_minutes: row.get(7)?,
            fired_at: row.get(8)?,
            is_read: is_read_int != 0,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        })
    })?;

    Ok(iter.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn get_unread_count(conn: &rusqlite::Connection) -> Result<i32> {
    Ok(conn.query_row(
        "SELECT COUNT(*) FROM notifications WHERE is_read = 0 AND deleted_at IS NULL \
         AND NOT (event_reminder_minutes IS NOT NULL AND scheduled_for IS NOT NULL)",
        [],
        |row| row.get(0),
    )?)
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
        target_page_id: target_page_id
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty()),
        event_id: event_id
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty()),
        scheduled_for: scheduled_for
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty()),
        event_reminder_minutes: None,
        fired_at: now.clone(),
        is_read: false,
        created_at: now,
        updated_at: None,
    })
}

pub fn mark_notification_delivered(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    super::calendar_reminders::mark_reminder_delivered(conn, id)
}

pub fn deliver_due_notifications(conn: &rusqlite::Connection) -> Result<Vec<AppNotification>> {
    let now = chrono::Utc::now().to_rfc3339();
    let mut stmt = conn.prepare(
        "SELECT id, title, message, type, target_page_id, event_id, scheduled_for, \
         event_reminder_minutes, fired_at, is_read, created_at, updated_at \
         FROM notifications \
         WHERE deleted_at IS NULL AND is_read = 0 \
           AND scheduled_for IS NOT NULL AND scheduled_for <= ?1",
    )?;

    let due = stmt
        .query_map(params![now], |row| {
            let is_read_int: i32 = row.get(9)?;
            Ok(AppNotification {
                id: row.get(0)?,
                title: row.get(1)?,
                message: row.get(2)?,
                type_: row.get(3)?,
                target_page_id: row.get(4)?,
                event_id: row.get(5)?,
                scheduled_for: row.get(6)?,
                event_reminder_minutes: row.get(7)?,
                fired_at: row.get(8)?,
                is_read: is_read_int != 0,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    for item in &due {
        conn.execute(
            "UPDATE notifications SET scheduled_for = NULL, fired_at = ?1, created_at = ?1, updated_at = ?1 \
             WHERE id = ?2",
            params![now, item.id],
        )?;
    }

    Ok(due)
}

pub fn snooze_notification(
    conn: &rusqlite::Connection,
    id: &str,
    delay_minutes: u32,
    title_suffix: &str,
) -> Result<AppNotification> {
    let id = id.trim();
    let title_suffix = title_suffix.trim();
    if id.is_empty()
        || title_suffix.is_empty()
        || delay_minutes == 0
        || delay_minutes > MAX_SNOOZE_DELAY_MINUTES
    {
        return Err(crate::error::SynapseError::Validation(
            format!(
                "A notification ID, title suffix, and delay from 1 to {MAX_SNOOZE_DELAY_MINUTES} minutes are required"
            ),
        ));
    }

    let tx = conn.unchecked_transaction()?;
    let source: Option<(String, String, String, Option<String>, Option<String>)> = tx
        .query_row(
            "SELECT title, message, type, target_page_id, event_id \
             FROM notifications WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )
        .optional()?;
    let Some((title, message, notification_type, target_page_id, event_id)) = source else {
        return Err(crate::error::SynapseError::NotFound(format!(
            "Notification {id} was not found"
        )));
    };

    let scheduled_for = (Utc::now() + Duration::minutes(i64::from(delay_minutes))).to_rfc3339();
    let updated = tx.execute(
        "UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
    )?;
    if updated == 0 {
        return Err(crate::error::SynapseError::NotFound(format!(
            "Notification {id} was not found"
        )));
    }

    let snoozed = add_notification(
        &tx,
        &format!("{title} ({title_suffix})"),
        &message,
        &notification_type,
        target_page_id.as_deref(),
        event_id.as_deref(),
        Some(&scheduled_for),
    )?;
    tx.commit()?;
    Ok(snoozed)
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
