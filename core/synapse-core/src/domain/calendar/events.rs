use super::models::CalendarEvent;
use crate::error::Result;
use rusqlite::params;

fn is_valid_hex_color(color: &str) -> bool {
    let bytes = color.as_bytes();
    if bytes.len() != 7 || bytes[0] != b'#' {
        return false;
    }
    bytes[1..].iter().all(|b| b.is_ascii_hexdigit())
}

fn is_valid_iso_date(s: &str) -> bool {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return false;
    }
    chrono::NaiveDate::parse_from_str(trimmed, "%Y-%m-%d").is_ok()
        || chrono::NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%dT%H:%M:%S").is_ok()
        || chrono::DateTime::parse_from_rfc3339(trimmed).is_ok()
}

pub fn get_calendar_events(conn: &rusqlite::Connection) -> Result<Vec<CalendarEvent>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, description, start_date, end_date, type, status, color, \
         page_id, reminders, notified_reminders, created_at, updated_at \
         FROM calendar_events WHERE deleted_at IS NULL ORDER BY start_date ASC LIMIT 300",
    )?;

    let iter = stmt.query_map([], |row| {
        let reminders_raw: Option<String> = row.get(9).unwrap_or(None);
        let reminders_val = reminders_raw.and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());
        let notified_raw: Option<String> = row.get(10).unwrap_or(None);
        let notified_val = notified_raw.and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());

        Ok(CalendarEvent {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            start_date: row.get(3)?,
            end_date: row.get(4)?,
            type_: row.get(5)?,
            status: row.get(6)?,
            color: row.get(7)?,
            page_id: row.get(8).unwrap_or(None),
            reminders: reminders_val.or(Some(serde_json::json!([]))),
            notified_reminders: notified_val.or(Some(serde_json::json!([]))),
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    })?;

    let mut list = Vec::new();
    for ev in iter.flatten() {
        list.push(ev);
    }
    Ok(list)
}

pub fn get_calendar_event(conn: &rusqlite::Connection, id: &str) -> Result<Option<CalendarEvent>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, description, start_date, end_date, type, status, color, \
         page_id, reminders, notified_reminders, created_at, updated_at \
         FROM calendar_events WHERE id = ?1 AND deleted_at IS NULL",
    )?;

    let mut rows = stmt.query([id.trim()])?;
    if let Some(row) = rows.next()? {
        let reminders_raw: Option<String> = row.get(9).unwrap_or(None);
        let reminders_val = reminders_raw.and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());
        let notified_raw: Option<String> = row.get(10).unwrap_or(None);
        let notified_val = notified_raw.and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());

        Ok(Some(CalendarEvent {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            start_date: row.get(3)?,
            end_date: row.get(4)?,
            type_: row.get(5)?,
            status: row.get(6)?,
            color: row.get(7)?,
            page_id: row.get(8).unwrap_or(None),
            reminders: reminders_val.or(Some(serde_json::json!([]))),
            notified_reminders: notified_val.or(Some(serde_json::json!([]))),
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn create_calendar_event(
    conn: &rusqlite::Connection,
    title: &str,
    description: &str,
    start_date: &str,
    end_date: &str,
    event_type: &str,
    color: &str,
    page_id: Option<&str>,
) -> Result<Option<CalendarEvent>> {
    if title.trim().is_empty() || !is_valid_iso_date(start_date) || !is_valid_iso_date(end_date) {
        return Ok(None);
    }

    let resolved_color = if is_valid_hex_color(color) {
        color
    } else {
        "#3b82f6"
    };

    let resolved_type = match event_type {
        "task" => "task",
        "reminder" => "reminder",
        _ => "event",
    };

    let id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO calendar_events (id, title, description, start_date, end_date, type, type_, \
         status, color, page_id, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8, ?9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        params![
            id,
            title.trim(),
            description.trim(),
            start_date.trim(),
            end_date.trim(),
            resolved_type,
            resolved_type,
            resolved_color,
            page_id.map(|s| s.trim()).filter(|s| !s.is_empty()),
        ],
    )?;

    Ok(Some(CalendarEvent {
        id,
        title: title.trim().to_string(),
        description: Some(description.trim().to_string()),
        start_date: Some(start_date.trim().to_string()),
        end_date: Some(end_date.trim().to_string()),
        type_: resolved_type.to_string(),
        status: "pending".to_string(),
        color: resolved_color.to_string(),
        page_id: page_id.map(|s| s.trim().to_string()).filter(|s| !s.is_empty()),
        reminders: Some(serde_json::json!([])),
        notified_reminders: Some(serde_json::json!([])),
        created_at: None,
        updated_at: None,
    }))
}

pub fn update_calendar_event(
    conn: &rusqlite::Connection,
    id: &str,
    title: &str,
    description: &str,
    start_date: &str,
    end_date: &str,
    color: &str,
    event_type: Option<&str>,
    page_id: Option<&str>,
) -> Result<bool> {
    if id.trim().is_empty()
        || title.trim().is_empty()
        || !is_valid_iso_date(start_date)
        || !is_valid_iso_date(end_date)
        || !is_valid_hex_color(color)
    {
        return Ok(false);
    }

    let rows = match event_type {
        Some(t) if !t.trim().is_empty() => {
            let resolved_type = match t.trim() {
                "task" => "task",
                "reminder" => "reminder",
                _ => "event",
            };
            if let Some(pid) = page_id.map(|s| s.trim()).filter(|s| !s.is_empty()) {
                conn.execute(
                    "UPDATE calendar_events SET title = ?1, description = ?2, start_date = ?3, \
                     end_date = ?4, color = ?5, type = ?6, type_ = ?7, page_id = ?8, \
                     updated_at = CURRENT_TIMESTAMP WHERE id = ?9 AND deleted_at IS NULL",
                    params![title.trim(), description.trim(), start_date.trim(), end_date.trim(), color.trim(), resolved_type, resolved_type, pid, id.trim()],
                )?
            } else {
                conn.execute(
                    "UPDATE calendar_events SET title = ?1, description = ?2, start_date = ?3, \
                     end_date = ?4, color = ?5, type = ?6, type_ = ?7, \
                     updated_at = CURRENT_TIMESTAMP WHERE id = ?8 AND deleted_at IS NULL",
                    params![title.trim(), description.trim(), start_date.trim(), end_date.trim(), color.trim(), resolved_type, resolved_type, id.trim()],
                )?
            }
        }
        _ => {
            if let Some(pid) = page_id.map(|s| s.trim()).filter(|s| !s.is_empty()) {
                conn.execute(
                    "UPDATE calendar_events SET title = ?1, description = ?2, start_date = ?3, \
                     end_date = ?4, color = ?5, page_id = ?6, \
                     updated_at = CURRENT_TIMESTAMP WHERE id = ?7 AND deleted_at IS NULL",
                    params![title.trim(), description.trim(), start_date.trim(), end_date.trim(), color.trim(), pid, id.trim()],
                )?
            } else {
                conn.execute(
                    "UPDATE calendar_events SET title = ?1, description = ?2, start_date = ?3, \
                     end_date = ?4, color = ?5, \
                     updated_at = CURRENT_TIMESTAMP WHERE id = ?6 AND deleted_at IS NULL",
                    params![title.trim(), description.trim(), start_date.trim(), end_date.trim(), color.trim(), id.trim()],
                )?
            }
        }
    };

    Ok(rows > 0)
}

pub fn toggle_event_status(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    let current_status: Option<String> = conn
        .query_row(
            "SELECT status FROM calendar_events WHERE id = ?1 AND deleted_at IS NULL",
            params![id.trim()],
            |row| row.get(0),
        )
        .ok();

    if let Some(status) = current_status {
        let new_status = if status == "completed" {
            "pending"
        } else {
            "completed"
        };
        let rows = conn.execute(
            "UPDATE calendar_events SET status = ?1, updated_at = CURRENT_TIMESTAMP \
             WHERE id = ?2 AND deleted_at IS NULL",
            params![new_status, id.trim()],
        )?;
        Ok(rows > 0)
    } else {
        Ok(false)
    }
}

pub fn delete_calendar_event(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE calendar_events SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id.trim()],
    )?;
    Ok(rows > 0)
}

pub fn get_events_for_date(
    conn: &rusqlite::Connection,
    date_prefix: &str,
    include_null: bool,
    limit: usize,
) -> Result<Vec<CalendarEvent>> {
    let sql = if include_null {
        "SELECT id, title, description, start_date, end_date, type, status, color, \
         page_id, reminders, notified_reminders, created_at, updated_at \
         FROM calendar_events WHERE deleted_at IS NULL AND (start_date LIKE ?1 OR start_date IS NULL) \
         ORDER BY start_date ASC LIMIT ?2"
    } else {
        "SELECT id, title, description, start_date, end_date, type, status, color, \
         page_id, reminders, notified_reminders, created_at, updated_at \
         FROM calendar_events WHERE deleted_at IS NULL AND start_date LIKE ?1 \
         ORDER BY start_date ASC LIMIT ?2"
    };

    let mut stmt = conn.prepare(sql)?;
    let pattern = format!("{}%", date_prefix.trim());
    let iter = stmt.query_map(params![pattern, limit as i64], |row| {
        let reminders_raw: Option<String> = row.get(9).unwrap_or(None);
        let reminders_val = reminders_raw.and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());
        let notified_raw: Option<String> = row.get(10).unwrap_or(None);
        let notified_val = notified_raw.and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());

        Ok(CalendarEvent {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            start_date: row.get(3)?,
            end_date: row.get(4)?,
            type_: row.get(5)?,
            status: row.get(6)?,
            color: row.get(7)?,
            page_id: row.get(8).unwrap_or(None),
            reminders: reminders_val.or(Some(serde_json::json!([]))),
            notified_reminders: notified_val.or(Some(serde_json::json!([]))),
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    })?;

    let mut list = Vec::new();
    for ev in iter.flatten() {
        list.push(ev);
    }
    Ok(list)
}
