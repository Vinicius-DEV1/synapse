use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

fn default_calendar_type() -> String {
    "event".to_string()
}

fn value_to_string_or_default(v: &Option<serde_json::Value>, default_str: &str) -> String {
    match v {
        Some(serde_json::Value::String(s)) => s.clone(),
        Some(serde_json::Value::Null) => default_str.to_string(),
        Some(val) => val.to_string(),
        None => default_str.to_string(),
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    #[serde(rename = "type", alias = "type_", default = "default_calendar_type")]
    pub type_: String,
    pub status: String,
    pub color: String,
    pub page_id: Option<String>,
    pub reminders: Option<serde_json::Value>,
    pub notified_reminders: Option<serde_json::Value>,
}

#[tauri::command]
pub fn calendar_get_events(db_state: State<'_, DbState>) -> Result<Vec<CalendarEvent>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, title, description, start_date, end_date, type, status, color, page_id, reminders, notified_reminders FROM calendar_events WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;

    let event_iter = stmt
        .query_map([], |row| {
            let reminders_raw: Option<String> = row.get(9).unwrap_or(None);
            let reminders_val = reminders_raw.and_then(|s| serde_json::from_str(&s).ok());
            let notified_raw: Option<String> = row.get(10).unwrap_or(None);
            let notified_val = notified_raw.and_then(|s| serde_json::from_str(&s).ok());

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

    let reminders_str = value_to_string_or_default(&event.reminders, "[]");
    let notified_str = value_to_string_or_default(&event.notified_reminders, "[]");

    conn.execute(
        "INSERT INTO calendar_events (id, title, description, start_date, end_date, type, status, color, page_id, reminders, notified_reminders) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, event.title, event.description, event.start_date, event.end_date, event.type_, event.status, event.color, event.page_id, reminders_str, notified_str]
    ).map_err(|e| e.to_string())?;

    let mut ret = event;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn calendar_update_event(
    id: Option<String>,
    event: CalendarEvent,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let event_id = if !event.id.is_empty() {
        event.id.clone()
    } else if let Some(ref target_id) = id {
        target_id.clone()
    } else {
        return Err("ID do evento não fornecido".into());
    };

    let reminders_str = value_to_string_or_default(&event.reminders, "[]");
    let notified_str = value_to_string_or_default(&event.notified_reminders, "[]");

    let count = conn.execute(
        "UPDATE calendar_events SET 
            title = CASE WHEN ? != '' THEN ? ELSE title END, 
            description = COALESCE(?, description), 
            start_date = COALESCE(?, start_date), 
            end_date = COALESCE(?, end_date), 
            type = CASE WHEN ? != '' THEN ? ELSE type END, 
            status = CASE WHEN ? != '' THEN ? ELSE status END, 
            color = CASE WHEN ? != '' THEN ? ELSE color END, 
            page_id = COALESCE(?, page_id), 
            reminders = ?, 
            notified_reminders = ?, 
            updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?",
        params![
            event.title, event.title,
            event.description,
            event.start_date,
            event.end_date,
            event.type_, event.type_,
            event.status, event.status,
            event.color, event.color,
            event.page_id,
            reminders_str,
            notified_str,
            event_id
        ]
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
