use super::models::{AppNotification, CalendarReminderRequest, CalendarReminderSyncResult};
use crate::error::{Result, SynapseError};
use chrono::{DateTime, Utc};
use rusqlite::{params, OptionalExtension};
use std::collections::HashSet;

pub fn sync_calendar_reminders(
    conn: &rusqlite::Connection,
    requests: &[CalendarReminderRequest],
) -> Result<CalendarReminderSyncResult> {
    let tx = conn.unchecked_transaction()?;
    let mut desired = Vec::with_capacity(requests.len());
    let mut desired_ids = HashSet::with_capacity(requests.len());

    for request in requests {
        let event_id = request.event_id.trim();
        if event_id.is_empty() || !(0..=10_080).contains(&request.reminder_minutes) {
            return Err(SynapseError::Validation(
                "Calendar reminder requires an event ID and an offset between zero minutes and seven days".to_owned(),
            ));
        }
        let scheduled_for = DateTime::parse_from_rfc3339(request.scheduled_for.trim())
            .map_err(|error| {
                SynapseError::Validation(format!("Invalid calendar reminder timestamp: {error}"))
            })?
            .with_timezone(&Utc);
        let id = reminder_id(event_id, request.reminder_minutes, scheduled_for);
        desired_ids.insert(id.clone());
        desired.push((id, scheduled_for.to_rfc3339(), request));
    }

    for (id, scheduled_for, request) in desired {
        let now = Utc::now().to_rfc3339();
        tx.execute(
            "INSERT INTO notifications (
                id, title, message, type, target_page_id, event_id, scheduled_for,
                event_reminder_minutes, fired_at, is_read, created_at, updated_at
             ) VALUES (?1, ?2, ?3, 'calendar_event', ?4, ?5, ?6, ?7, ?8, 0, ?8, ?8)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                message = excluded.message,
                target_page_id = excluded.target_page_id,
                event_id = excluded.event_id,
                scheduled_for = excluded.scheduled_for,
                updated_at = excluded.updated_at
             WHERE notifications.deleted_at IS NULL
               AND notifications.is_read = 0
               AND notifications.scheduled_for IS NOT NULL",
            params![
                id,
                request.title.trim(),
                request.message.trim(),
                request
                    .target_page_id
                    .as_deref()
                    .map(str::trim)
                    .filter(|value| !value.is_empty()),
                request.event_id.trim(),
                scheduled_for,
                request.reminder_minutes,
                now,
            ],
        )?;
    }

    let mut statement = tx.prepare(
        "SELECT id FROM notifications WHERE type = 'calendar_event' \
         AND event_reminder_minutes IS NOT NULL AND scheduled_for IS NOT NULL \
         AND deleted_at IS NULL",
    )?;
    let active_ids = statement
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(statement);

    let mut cancelled_ids = Vec::new();
    for id in active_ids {
        if desired_ids.contains(&id) {
            continue;
        }
        tx.execute(
            "UPDATE notifications SET deleted_at = CURRENT_TIMESTAMP, \
             updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
        )?;
        cancelled_ids.push(id);
    }

    let mut scheduled_notifications = Vec::new();
    for id in &desired_ids {
        if let Some(notification) = read_pending_reminder(&tx, id)? {
            scheduled_notifications.push(notification);
        }
    }
    tx.commit()?;
    Ok(CalendarReminderSyncResult {
        scheduled_notifications,
        cancelled_ids,
    })
}

pub fn mark_reminder_delivered(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    let id = id.trim();
    if id.is_empty() {
        return Ok(false);
    }
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE notifications SET scheduled_for = NULL, fired_at = ?1, created_at = ?1, updated_at = ?1 \
         WHERE id = ?2 AND deleted_at IS NULL AND scheduled_for IS NOT NULL",
        params![now, id],
    )?;
    Ok(rows > 0)
}

fn read_pending_reminder(conn: &rusqlite::Connection, id: &str) -> Result<Option<AppNotification>> {
    Ok(conn
        .query_row(
            "SELECT id, title, message, type, target_page_id, event_id, scheduled_for, \
             event_reminder_minutes, fired_at, is_read, created_at, updated_at \
             FROM notifications WHERE id = ?1 AND type = 'calendar_event' \
               AND deleted_at IS NULL AND is_read = 0 AND scheduled_for IS NOT NULL",
            params![id],
            |row| {
                let is_read: i32 = row.get(9)?;
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
                    is_read: is_read != 0,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            },
        )
        .optional()?)
}

fn reminder_id(event_id: &str, reminder_minutes: i32, scheduled_for: DateTime<Utc>) -> String {
    format!(
        "calendar-reminder:{event_id}:{reminder_minutes}:{}",
        scheduled_for.timestamp_millis()
    )
}
