use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

fn default_alarm_enabled() -> i32 {
    1
}

fn deserialize_i32_or_bool<'de, D>(deserializer: D) -> Result<i32, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum IntOrBool {
        Int(i32),
        Bool(bool),
    }

    match Option::<IntOrBool>::deserialize(deserializer)? {
        Some(IntOrBool::Int(i)) => Ok(i),
        Some(IntOrBool::Bool(b)) => Ok(if b { 1 } else { 0 }),
        None => Ok(1),
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct FocusAlarm {
    pub id: String,
    pub time: String,
    pub label: Option<String>,
    pub sound: Option<String>,
    #[serde(default = "default_alarm_enabled", deserialize_with = "deserialize_i32_or_bool")]
    pub enabled: i32,
    pub days: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct FocusSession {
    pub id: Option<String>,
    pub tag: String,
    pub description: String,
    pub target_time_minutes: i32,
    pub status: String,
    pub justification: Option<String>,
    pub summary: Option<String>,
    pub created_at: Option<String>,
}

#[tauri::command]
pub fn focus_get_alarms(db_state: State<'_, DbState>) -> Result<Vec<FocusAlarm>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn
        .prepare("SELECT id, time, label, sound, enabled, days FROM alarms WHERE deleted_at IS NULL ORDER BY time ASC")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(FocusAlarm {
                id: row.get(0)?,
                time: row.get(1)?,
                label: row.get(2)?,
                sound: row.get(3)?,
                enabled: row.get(4)?,
                days: row.get(5)?,
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
pub fn focus_create_alarm(
    alarm: FocusAlarm,
    db_state: State<'_, DbState>,
) -> Result<FocusAlarm, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = if alarm.id.trim().is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        alarm.id.clone()
    };

    conn.execute(
        "INSERT INTO alarms (id, time, label, sound, enabled, days) 
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            time = excluded.time,
            label = excluded.label,
            sound = excluded.sound,
            enabled = excluded.enabled,
            days = excluded.days,
            deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP",
        params![
            id,
            alarm.time,
            alarm.label,
            alarm.sound,
            alarm.enabled,
            alarm.days
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut ret = alarm;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn focus_update_alarm(
    id: String,
    alarm: FocusAlarm,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute(
        "UPDATE alarms SET time = ?, label = ?, sound = ?, enabled = ?, days = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![alarm.time, alarm.label, alarm.sound, alarm.enabled, alarm.days, id]
    ).map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub fn focus_delete_alarm(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE alarms SET deleted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![now, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn focus_get_sessions(db_state: State<'_, DbState>) -> Result<Vec<FocusSession>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, tag, description, target_time_minutes, status, justification, summary, created_at FROM focus_sessions WHERE deleted_at IS NULL ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(FocusSession {
                id: row.get(0)?,
                tag: row.get(1)?,
                description: row.get(2)?,
                target_time_minutes: row.get(3)?,
                status: row.get(4)?,
                justification: row.get(5)?,
                summary: row.get(6)?,
                created_at: row.get(7)?,
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
pub fn focus_create_session(
    session: FocusSession,
    db_state: State<'_, DbState>,
) -> Result<String, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = session
        .id
        .clone()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    conn.execute(
        "INSERT INTO focus_sessions (id, tag, description, target_time_minutes, status, justification, summary) 
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            tag = excluded.tag,
            description = excluded.description,
            target_time_minutes = excluded.target_time_minutes,
            status = excluded.status,
            justification = excluded.justification,
            summary = excluded.summary,
            deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP",
        params![id, session.tag, session.description, session.target_time_minutes, session.status, session.justification, session.summary]
    ).map_err(|e| e.to_string())?;

    Ok(id)
}
