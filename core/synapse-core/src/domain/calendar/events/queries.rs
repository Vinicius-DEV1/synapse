use crate::domain::calendar::models::CalendarEvent;
use crate::error::Result;
use rusqlite::{params, types::Type, OptionalExtension, Row};

fn json_field(row: &Row<'_>, index: usize) -> rusqlite::Result<serde_json::Value> {
    let raw: Option<String> = row.get(index)?;
    match raw {
        Some(raw) => serde_json::from_str(&raw).map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(index, Type::Text, Box::new(error))
        }),
        None => Ok(serde_json::json!([])),
    }
}

fn calendar_event_from_row(row: &Row<'_>) -> rusqlite::Result<CalendarEvent> {
    Ok(CalendarEvent {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        start_date: row.get(3)?,
        end_date: row.get(4)?,
        type_: row.get(5)?,
        status: row.get(6)?,
        color: row.get(7)?,
        page_id: row.get(8)?,
        reminders: Some(json_field(row, 9)?),
        notified_reminders: Some(json_field(row, 10)?),
        recurrence_rule: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}

const EVENT_COLUMNS: &str = "id, title, description, start_date, end_date, type, status, color, \
    page_id, reminders, notified_reminders, recurrence_rule, created_at, updated_at";

pub fn get_calendar_events(conn: &rusqlite::Connection) -> Result<Vec<CalendarEvent>> {
    let sql = format!(
        "SELECT {EVENT_COLUMNS} FROM calendar_events WHERE deleted_at IS NULL \
         ORDER BY start_date ASC LIMIT 300"
    );
    let mut stmt = conn.prepare(&sql)?;
    let events = stmt
        .query_map([], calendar_event_from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(events)
}

pub fn get_calendar_event(conn: &rusqlite::Connection, id: &str) -> Result<Option<CalendarEvent>> {
    let sql =
        format!("SELECT {EVENT_COLUMNS} FROM calendar_events WHERE id = ?1 AND deleted_at IS NULL");
    let mut stmt = conn.prepare(&sql)?;
    Ok(stmt
        .query_row([id.trim()], calendar_event_from_row)
        .optional()?)
}

pub fn get_events_for_date(
    conn: &rusqlite::Connection,
    date_prefix: &str,
    include_null: bool,
    limit: usize,
) -> Result<Vec<CalendarEvent>> {
    let date_filter = if include_null {
        "(start_date LIKE ?1 OR start_date IS NULL)"
    } else {
        "start_date LIKE ?1"
    };
    let sql = format!(
        "SELECT {EVENT_COLUMNS} FROM calendar_events WHERE deleted_at IS NULL AND {date_filter} \
         ORDER BY start_date ASC LIMIT ?2"
    );
    let mut stmt = conn.prepare(&sql)?;
    let pattern = format!("{}%", date_prefix.trim());
    let events = stmt
        .query_map(params![pattern, limit as i64], calendar_event_from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(events)
}
