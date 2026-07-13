use tauri::State;
use serde::{Deserialize, Serialize};
use crate::db::DbState;
use rusqlite::params;

#[derive(Serialize, Deserialize)]
pub struct FocusAlarm {
    pub id: String,
    pub time: String,
    pub label: Option<String>,
    pub sound: Option<String>,
    pub enabled: i32,
    pub days: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct FocusSession {
    pub id: String,
    pub started_at: String,
    pub duration: i32,
    pub task_id: Option<String>,
    pub type_: String,
}

#[tauri::command]
pub fn focus_get_alarms(db_state: State<'_, DbState>) -> Result<Vec<FocusAlarm>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT id, time, label, sound, enabled, days FROM alarms")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt.query_map([], |row| {
        Ok(FocusAlarm {
            id: row.get(0)?,
            time: row.get(1)?,
            label: row.get(2)?,
            sound: row.get(3)?,
            enabled: row.get(4)?,
            days: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i { items.push(item); }
    }
    Ok(items)
}

#[tauri::command]
pub fn focus_create_alarm(alarm: FocusAlarm, db_state: State<'_, DbState>) -> Result<FocusAlarm, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let id = if alarm.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { alarm.id.clone() };
    
    conn.execute(
        "INSERT INTO alarms (id, time, label, sound, enabled, days) VALUES (?, ?, ?, ?, ?, ?)",
        params![id, alarm.time, alarm.label, alarm.sound, alarm.enabled, alarm.days]
    ).map_err(|e| e.to_string())?;
    
    let mut ret = alarm;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn focus_update_alarm(id: String, alarm: FocusAlarm, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute(
        "UPDATE alarms SET time = ?, label = ?, sound = ?, enabled = ?, days = ? WHERE id = ?",
        params![alarm.time, alarm.label, alarm.sound, alarm.enabled, alarm.days, id]
    ).map_err(|e| e.to_string())?;
        
    Ok(true)
}

#[tauri::command]
pub fn focus_delete_alarm(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute("DELETE FROM alarms WHERE id = ?", [&id]).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn focus_get_sessions(db_state: State<'_, DbState>) -> Result<Vec<FocusSession>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT id, started_at, duration, task_id, type FROM sessions")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt.query_map([], |row| {
        Ok(FocusSession {
            id: row.get(0)?,
            started_at: row.get(1)?,
            duration: row.get(2)?,
            task_id: row.get(3)?,
            type_: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i { items.push(item); }
    }
    Ok(items)
}

#[tauri::command]
pub fn focus_create_session(session: FocusSession, db_state: State<'_, DbState>) -> Result<FocusSession, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let id = if session.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { session.id.clone() };
    
    conn.execute(
        "INSERT INTO sessions (id, started_at, duration, task_id, type) VALUES (?, ?, ?, ?, ?)",
        params![id, session.started_at, session.duration, session.task_id, session.type_]
    ).map_err(|e| e.to_string())?;
    
    let mut ret = session;
    ret.id = id;
    Ok(ret)
}
