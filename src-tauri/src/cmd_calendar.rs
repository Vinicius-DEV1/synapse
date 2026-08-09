use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub type_: String,
    pub status: String,
    pub color: String,
    pub page_id: Option<String>,
    pub reminders: Option<String>,
    pub notified_reminders: Option<String>,
}

#[tauri::command]
pub fn calendar_get_events(db_state: State<'_, DbState>) -> Result<Vec<CalendarEvent>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, title, description, start_date, end_date, type, status, color, page_id, reminders, notified_reminders FROM calendar_events WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;

    let event_iter = stmt
        .query_map([], |row| {
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
                reminders: row.get(9).unwrap_or_else(|_| Some("[]".to_string())),
                notified_reminders: row.get(10).unwrap_or_else(|_| Some("[]".to_string())),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut events = Vec::new();
    for event in event_iter {
        if let Ok(e) = event {
            events.push(e);
        }
    }

    Ok(events)
}

#[tauri::command]
pub fn calendar_add_event(
    event: CalendarEvent,
    db_state: State<'_, DbState>,
) -> Result<CalendarEvent, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = if event.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        event.id.clone()
    };

    conn.execute(
        "INSERT INTO calendar_events (id, title, description, start_date, end_date, type, status, color, page_id, reminders, notified_reminders) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, event.title, event.description, event.start_date, event.end_date, event.type_, event.status, event.color, event.page_id, event.reminders, event.notified_reminders]
    ).map_err(|e| e.to_string())?;

    let mut ret = event;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn calendar_update_event(
    event: CalendarEvent,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let count = conn.execute(
        "UPDATE calendar_events SET title = ?, description = ?, start_date = ?, end_date = ?, type = ?, status = ?, color = ?, page_id = ?, reminders = ?, notified_reminders = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![event.title, event.description, event.start_date, event.end_date, event.type_, event.status, event.color, event.page_id, event.reminders, event.notified_reminders, event.id]
    ).map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn calendar_delete_event(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("UPDATE calendar_events SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}
