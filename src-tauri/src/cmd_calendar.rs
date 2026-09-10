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
    #[serde(rename = "type", default = "default_calendar_type")]
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
    event: serde_json::Value,
    db_state: State<'_, DbState>,
) -> Result<CalendarEvent, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let event_obj = event.as_object().ok_or("Parâmetro event inválido")?;

    let raw_id = event_obj.get("id").and_then(|v| v.as_str()).unwrap_or("");
    let id = if raw_id.trim().is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        raw_id.to_string()
    };
    let title = event_obj.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let description = event_obj.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());
    let start_date = event_obj.get("start_date").and_then(|v| v.as_str()).map(|s| s.to_string());
    let end_date = event_obj.get("end_date").and_then(|v| v.as_str()).map(|s| s.to_string());
    let type_ = event_obj
        .get("type")
        .or_else(|| event_obj.get("type_"))
        .and_then(|v| v.as_str())
        .unwrap_or("event")
        .to_string();
    let status = event_obj.get("status").and_then(|v| v.as_str()).unwrap_or("pending").to_string();
    let color = event_obj.get("color").and_then(|v| v.as_str()).unwrap_or("#3b82f6").to_string();
    let page_id = event_obj.get("page_id").and_then(|v| v.as_str()).map(|s| s.to_string());

    let reminders_val = event_obj.get("reminders").cloned();
    let reminders_str = value_to_string_or_default(&reminders_val, "[]");
    let notified_val = event_obj.get("notified_reminders").cloned();
    let notified_str = value_to_string_or_default(&notified_val, "[]");

    conn.execute(
        "INSERT INTO calendar_events (id, title, description, start_date, end_date, type, status, color, page_id, reminders, notified_reminders) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            type = excluded.type,
            status = excluded.status,
            color = excluded.color,
            page_id = excluded.page_id,
            reminders = excluded.reminders,
            notified_reminders = excluded.notified_reminders,
            updated_at = CURRENT_TIMESTAMP",
        params![id, title, description, start_date, end_date, type_, status, color, page_id, reminders_str, notified_str]
    ).map_err(|e| e.to_string())?;

    Ok(CalendarEvent {
        id,
        title,
        description,
        start_date,
        end_date,
        type_,
        status,
        color,
        page_id,
        reminders: reminders_val.or(Some(serde_json::json!([]))),
        notified_reminders: notified_val.or(Some(serde_json::json!([]))),
    })
}

#[tauri::command]
pub fn calendar_update_event(
    id: Option<String>,
    event: serde_json::Value,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let event_obj = event.as_object().ok_or("Parâmetro event inválido")?;

    let event_id = if let Some(ref target_id) = id {
        if !target_id.trim().is_empty() {
            target_id.clone()
        } else {
            event_obj.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string()
        }
    } else {
        event_obj.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string()
    };

    if event_id.trim().is_empty() {
        return Err("ID do evento não fornecido".into());
    }

    let title = event_obj.get("title").and_then(|v| v.as_str()).unwrap_or("");
    let description = event_obj.get("description").and_then(|v| v.as_str());
    let start_date = event_obj.get("start_date").and_then(|v| v.as_str());
    let end_date = event_obj.get("end_date").and_then(|v| v.as_str());
    let type_ = event_obj.get("type").or_else(|| event_obj.get("type_")).and_then(|v| v.as_str()).unwrap_or("");
    let status = event_obj.get("status").and_then(|v| v.as_str()).unwrap_or("");
    let color = event_obj.get("color").and_then(|v| v.as_str()).unwrap_or("");
    let page_id = event_obj.get("page_id").and_then(|v| v.as_str());

    let reminders_opt = event_obj
        .get("reminders")
        .map(|r| value_to_string_or_default(&Some(r.clone()), "[]"));
    let notified_opt = event_obj
        .get("notified_reminders")
        .map(|n| value_to_string_or_default(&Some(n.clone()), "[]"));

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
            reminders = COALESCE(?, reminders), 
            notified_reminders = COALESCE(?, notified_reminders), 
            updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?",
        params![
            title, title,
            description,
            start_date,
            end_date,
            type_, type_,
            status, status,
            color, color,
            page_id,
            reminders_opt,
            notified_opt,
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
