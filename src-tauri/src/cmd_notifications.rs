use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

fn default_notification_type() -> String {
    "system".to_string()
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(default)]
pub struct AppNotification {
    pub id: String,
    pub title: String,
    pub message: String,
    #[serde(rename = "type", default = "default_notification_type")]
    pub type_: String,
    pub target_page_id: Option<String>,
    pub event_id: Option<String>,
    pub scheduled_for: Option<String>,
    pub fired_at: String,
    pub is_read: bool,
    pub created_at: String,
}

#[tauri::command]
pub fn notifications_get_all(db_state: State<'_, DbState>) -> Result<Vec<AppNotification>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare(
        "SELECT id, title, message, type, target_page_id, event_id, scheduled_for, fired_at, is_read, created_at 
         FROM notifications 
         WHERE deleted_at IS NULL 
         ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            let is_read_int: i32 = row.get(8)?;
            Ok(AppNotification {
                id: row.get(0)?,
                title: row.get(1)?,
                message: row.get(2)?,
                type_: row.get(3)?,
                target_page_id: row.get(4).unwrap_or(None),
                event_id: row.get(5).unwrap_or(None),
                scheduled_for: row.get(6).unwrap_or(None),
                fired_at: row.get(7).unwrap_or_else(|_| "".to_string()),
                is_read: is_read_int != 0,
                created_at: row.get(9).unwrap_or_else(|_| "".to_string()),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }

    Ok(items)
}

#[tauri::command]
pub fn notifications_add(
    notif: serde_json::Value,
    db_state: State<'_, DbState>,
) -> Result<AppNotification, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let notif_obj = notif.as_object().ok_or("Parâmetro notif inválido")?;

    let raw_id = notif_obj.get("id").and_then(|v| v.as_str()).unwrap_or("");
    let id = if raw_id.trim().is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        raw_id.to_string()
    };
    let title = notif_obj.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let message = notif_obj.get("message").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let type_ = notif_obj
        .get("type")
        .or_else(|| notif_obj.get("type_"))
        .and_then(|v| v.as_str())
        .unwrap_or("system")
        .to_string();
    let target_page_id = notif_obj.get("target_page_id").and_then(|v| v.as_str()).map(|s| s.to_string());
    let event_id = notif_obj.get("event_id").and_then(|v| v.as_str()).map(|s| s.to_string());
    let scheduled_for = notif_obj.get("scheduled_for").and_then(|v| v.as_str()).map(|s| s.to_string());

    let now = chrono::Utc::now().to_rfc3339();
    let fired_at = notif_obj
        .get("fired_at")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(&now)
        .to_string();
    let created_at = notif_obj
        .get("created_at")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(&now)
        .to_string();

    let is_read = notif_obj
        .get("is_read")
        .map(|v| match v {
            serde_json::Value::Bool(b) => *b,
            serde_json::Value::Number(n) => n.as_i64().map(|i| i != 0).unwrap_or(false),
            _ => false,
        })
        .unwrap_or(false);
    let is_read_int = if is_read { 1 } else { 0 };

    conn.execute(
        "INSERT INTO notifications (id, title, message, type, target_page_id, event_id, scheduled_for, fired_at, is_read, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            message = excluded.message,
            type = excluded.type,
            target_page_id = excluded.target_page_id,
            event_id = excluded.event_id,
            scheduled_for = excluded.scheduled_for,
            fired_at = excluded.fired_at,
            is_read = excluded.is_read,
            updated_at = CURRENT_TIMESTAMP",
        params![
            id,
            title,
            message,
            type_,
            target_page_id,
            event_id,
            scheduled_for,
            fired_at,
            is_read_int,
            created_at
        ]
    ).map_err(|e| e.to_string())?;

    let ret = AppNotification {
        id,
        title,
        message,
        type_,
        target_page_id,
        event_id,
        scheduled_for,
        fired_at,
        is_read,
        created_at,
    };
    Ok(ret)
}

#[tauri::command]
pub fn notifications_mark_read(
    id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    if let Some(target_id) = id {
        if !target_id.is_empty() {
            conn.execute(
                "UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [&target_id],
            )
            .map_err(|e| e.to_string())?;
            return Ok(true);
        }
    }

    conn.execute(
        "UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE is_read = 0",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub fn notifications_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute(
        "UPDATE notifications SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [&id]
    ).map_err(|e| e.to_string())?;

    Ok(true)
}
