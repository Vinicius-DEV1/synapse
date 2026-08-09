use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize, Default)]
#[serde(default)]
pub struct TutorSession {
    pub id: String,
    pub title: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub custom_prompt: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize, Default)]
#[serde(default)]
pub struct TutorMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub text_content: String,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Default)]
#[serde(default)]
pub struct TutorMemory {
    pub id: String,
    pub category: String,
    pub fact: String,
    pub created_at: Option<String>,
}

#[tauri::command]
pub fn practice_get_sessions(db_state: State<'_, DbState>) -> Result<Vec<TutorSession>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, title, started_at, ended_at, custom_prompt, deleted_at FROM tutor_sessions WHERE deleted_at IS NULL ORDER BY started_at DESC")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(TutorSession {
                id: row.get(0)?,
                title: row.get(1)?,
                started_at: row.get(2)?,
                ended_at: row.get(3)?,
                custom_prompt: row.get(4)?,
                deleted_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for item in iter {
        if let Ok(i) = item {
            results.push(i);
        }
    }

    Ok(results)
}

#[tauri::command]
pub fn practice_create_session(
    session: TutorSession,
    db_state: State<'_, DbState>,
) -> Result<TutorSession, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = if session.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        session.id.clone()
    };

    conn.execute(
        "INSERT INTO tutor_sessions (id, title, started_at, ended_at, custom_prompt, deleted_at) VALUES (?, ?, ?, ?, ?, ?)",
        params![id, session.title, session.started_at, session.ended_at, session.custom_prompt, session.deleted_at]
    ).map_err(|e| e.to_string())?;

    let mut ret = session;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn practice_update_session(
    session: TutorSession,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let count = conn.execute(
        "UPDATE tutor_sessions SET title = ?, started_at = ?, ended_at = ?, custom_prompt = ?, deleted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![session.title, session.started_at, session.ended_at, session.custom_prompt, session.deleted_at, session.id]
    ).map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn practice_get_messages(
    session_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<TutorMessage>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, session_id, role, text_content, created_at FROM tutor_messages WHERE session_id = ? ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([session_id], |row| {
            Ok(TutorMessage {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                text_content: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for item in iter {
        if let Ok(i) = item {
            results.push(i);
        }
    }

    Ok(results)
}

#[tauri::command]
pub fn practice_create_message(
    message: TutorMessage,
    db_state: State<'_, DbState>,
) -> Result<TutorMessage, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = if message.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        message.id.clone()
    };

    conn.execute(
        "INSERT INTO tutor_messages (id, session_id, role, text_content, created_at) VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))",
        params![id, message.session_id, message.role, message.text_content, message.created_at]
    ).map_err(|e| e.to_string())?;

    let mut ret = message;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn practice_get_memories(db_state: State<'_, DbState>) -> Result<Vec<TutorMemory>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, category, fact, created_at FROM tutor_memories WHERE deleted_at IS NULL ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(TutorMemory {
                id: row.get(0)?,
                category: row.get(1)?,
                fact: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for item in iter {
        if let Ok(i) = item {
            results.push(i);
        }
    }

    Ok(results)
}

#[tauri::command]
pub fn practice_create_memory(
    memory: TutorMemory,
    db_state: State<'_, DbState>,
) -> Result<TutorMemory, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = if memory.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        memory.id.clone()
    };

    conn.execute(
        "INSERT INTO tutor_memories (id, category, fact, created_at) VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))",
        params![id, memory.category, memory.fact, memory.created_at]
    ).map_err(|e| e.to_string())?;

    let mut ret = memory;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn practice_delete_memory(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let count = conn
        .execute(
            "UPDATE tutor_memories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?",
            params![id],
        )
        .map_err(|e| e.to_string())?;

    Ok(count > 0)
}
