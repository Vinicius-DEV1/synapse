use super::reminders::normalize_reminders;
use crate::domain::calendar::models::CalendarEvent;
use crate::error::Result;
use rusqlite::{params, OptionalExtension};

fn is_valid_hex_color(color: &str) -> bool {
    let bytes = color.as_bytes();
    bytes.len() == 7 && bytes[0] == b'#' && bytes[1..].iter().all(|byte| byte.is_ascii_hexdigit())
}

fn is_valid_iso_date(value: &str) -> bool {
    let trimmed = value.trim();
    !trimmed.is_empty()
        && (chrono::NaiveDate::parse_from_str(trimmed, "%Y-%m-%d").is_ok()
            || chrono::NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%dT%H:%M:%S").is_ok()
            || chrono::DateTime::parse_from_rfc3339(trimmed).is_ok())
}

fn parse_calendar_datetime(value: &str) -> Option<chrono::DateTime<chrono::Utc>> {
    let trimmed = value.trim();
    if let Ok(parsed) = chrono::DateTime::parse_from_rfc3339(trimmed) {
        return Some(parsed.with_timezone(&chrono::Utc));
    }

    let naive = chrono::NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%dT%H:%M:%S")
        .ok()
        .or_else(|| {
            chrono::NaiveDate::parse_from_str(trimmed, "%Y-%m-%d")
                .ok()?
                .and_hms_opt(0, 0, 0)
        })?;
    Some(chrono::DateTime::from_naive_utc_and_offset(
        naive,
        chrono::Utc,
    ))
}

fn is_ordered_event_range(start_date: &str, end_date: &str) -> bool {
    matches!(
        (
            parse_calendar_datetime(start_date),
            parse_calendar_datetime(end_date)
        ),
        (Some(start), Some(end)) if start <= end
    )
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
    create_calendar_event_with_reminders(
        conn,
        title,
        description,
        start_date,
        end_date,
        event_type,
        color,
        page_id,
        &[],
    )
}

pub fn create_calendar_event_with_reminders(
    conn: &rusqlite::Connection,
    title: &str,
    description: &str,
    start_date: &str,
    end_date: &str,
    event_type: &str,
    color: &str,
    page_id: Option<&str>,
    reminders: &[i32],
) -> Result<Option<CalendarEvent>> {
    if title.trim().is_empty()
        || !is_valid_iso_date(start_date)
        || !is_valid_iso_date(end_date)
        || !is_ordered_event_range(start_date, end_date)
    {
        return Ok(None);
    }

    let resolved_color = if is_valid_hex_color(color) {
        color
    } else {
        "#3b82f6"
    };
    let resolved_type = match event_type.trim() {
        "task" => "task",
        "reminder" => "reminder",
        "mentoria" => "mentoria",
        "reuniao" => "reuniao",
        "aula" => "aula",
        "estudo" => "estudo",
        "geral" => "geral",
        _ => "event",
    };
    let reminders = normalize_reminders(reminders)?;
    let reminders_json = serde_json::to_string(&reminders)
        .map_err(|error| crate::error::SynapseError::Internal(error.to_string()))?;
    let id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO calendar_events (id, title, description, start_date, end_date, type, type_, \
         status, color, page_id, reminders, notified_reminders, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8, ?9, ?10, '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        params![
            id,
            title.trim(),
            description.trim(),
            start_date.trim(),
            end_date.trim(),
            resolved_type,
            resolved_type,
            resolved_color,
            page_id.map(|value| value.trim()).filter(|value| !value.is_empty()),
            reminders_json,
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
        page_id: page_id
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty()),
        reminders: Some(serde_json::json!(reminders)),
        notified_reminders: Some(serde_json::json!([])),
        recurrence_rule: None,
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
    update_calendar_event_with_reminders(
        conn,
        id,
        title,
        description,
        start_date,
        end_date,
        color,
        event_type,
        page_id,
        None,
    )
}

pub fn update_calendar_event_with_reminders(
    conn: &rusqlite::Connection,
    id: &str,
    title: &str,
    description: &str,
    start_date: &str,
    end_date: &str,
    color: &str,
    event_type: Option<&str>,
    page_id: Option<&str>,
    reminders: Option<&[i32]>,
) -> Result<bool> {
    if id.trim().is_empty()
        || title.trim().is_empty()
        || !is_valid_iso_date(start_date)
        || !is_valid_iso_date(end_date)
        || !is_ordered_event_range(start_date, end_date)
        || !is_valid_hex_color(color)
    {
        return Ok(false);
    }

    let id = id.trim();
    let title = title.trim();
    let description = description.trim();
    let start_date = start_date.trim();
    let end_date = end_date.trim();
    let color = color.trim();
    let page_id = page_id.map(str::trim).filter(|value| !value.is_empty());
    let reminders_json = reminders
        .map(normalize_reminders)
        .transpose()?
        .map(|values| {
            serde_json::to_string(&values)
                .map_err(|error| crate::error::SynapseError::Internal(error.to_string()))
        })
        .transpose()?;
    let rows = match event_type.map(str::trim).filter(|value| !value.is_empty()) {
        Some(event_type) => {
            let event_type = match event_type {
                "task" => "task",
                "reminder" => "reminder",
                "mentoria" => "mentoria",
                "reuniao" => "reuniao",
                "aula" => "aula",
                "estudo" => "estudo",
                "geral" => "geral",
                _ => "event",
            };
            conn.execute(
                "UPDATE calendar_events SET title = ?1, description = ?2, start_date = ?3, \
                 end_date = ?4, color = ?5, type = ?6, type_ = ?6, page_id = COALESCE(?7, page_id), \
                 reminders = COALESCE(?8, reminders), updated_at = CURRENT_TIMESTAMP \
                 WHERE id = ?9 AND deleted_at IS NULL",
                params![title, description, start_date, end_date, color, event_type, page_id, reminders_json, id],
            )?
        }
        None => conn.execute(
            "UPDATE calendar_events SET title = ?1, description = ?2, start_date = ?3, \
             end_date = ?4, color = ?5, page_id = COALESCE(?6, page_id), \
             reminders = COALESCE(?7, reminders), updated_at = CURRENT_TIMESTAMP \
             WHERE id = ?8 AND deleted_at IS NULL",
            params![
                title,
                description,
                start_date,
                end_date,
                color,
                page_id,
                reminders_json,
                id
            ],
        )?,
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
        .optional()?;
    let Some(status) = current_status else {
        return Ok(false);
    };

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
}

pub fn delete_calendar_event(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE calendar_events SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id.trim()],
    )?;
    Ok(rows > 0)
}
