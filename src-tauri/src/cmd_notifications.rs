use tauri::State;
use serde::{Deserialize, Serialize};
use crate::db::DbState;
use rusqlite::params;

#[derive(Serialize, Deserialize, Clone)]
pub struct AppNotification {
    pub id: String,
    pub title: String,
    pub message: String,
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
        
    let iter = stmt.query_map([], |row| {
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
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }
    
    Ok(items)
}

#[tauri::command]
pub fn notifications_add(notif: AppNotification, db_state: State<'_, DbState>) -> Result<AppNotification, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let id = if notif.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { notif.id.clone() };
    let now = chrono::Utc::now().to_rfc3339();
    let fired_at = if notif.fired_at.is_empty() { now.clone() } else { notif.fired_at.clone() };
    let is_read_int = if notif.is_read { 1 } else { 0 };
    
    conn.execute(
        "INSERT INTO notifications (id, title, message, type, target_page_id, event_id, scheduled_for, fired_at, is_read, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            id,
            notif.title,
            notif.message,
            notif.type_,
            notif.target_page_id,
            notif.event_id,
            notif.scheduled_for,
            fired_at,
            is_read_int,
            now
        ]
    ).map_err(|e| e.to_string())?;
    
    let mut ret = notif;
    ret.id = id;
    ret.fired_at = fired_at;
    ret.created_at = now;
    Ok(ret)
}

#[tauri::command]
pub fn notifications_mark_read(id: Option<String>, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    if let Some(target_id) = id {
        if !target_id.is_empty() {
            conn.execute(
                "UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [&target_id]
            ).map_err(|e| e.to_string())?;
            return Ok(true);
        }
    }
    
    conn.execute(
        "UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE is_read = 0",
        []
    ).map_err(|e| e.to_string())?;
        
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
