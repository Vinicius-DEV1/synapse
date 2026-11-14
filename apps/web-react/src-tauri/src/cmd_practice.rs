use crate::db::DbState;
use synapse_core::domain::practice::{PracticeRepository, TutorMemory, TutorMessage, TutorSession};
use tauri::State;

#[tauri::command]
pub fn practice_get_sessions(db_state: State<'_, DbState>) -> Result<Vec<TutorSession>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    PracticeRepository::get_sessions_conn(conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn practice_create_session(
    mut session: TutorSession,
    db_state: State<'_, DbState>,
) -> Result<TutorSession, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    if session.id.is_empty() {
        session.id = uuid::Uuid::new_v4().to_string();
    }
    PracticeRepository::save_session_conn(conn, &session).map_err(|e| e.to_string())?;
    Ok(session)
}

#[tauri::command]
pub fn practice_update_session(
    session: TutorSession,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    PracticeRepository::save_session_conn(conn, &session).map_err(|e| e.to_string())?;
    Ok(1)
}

#[tauri::command]
pub fn practice_get_messages(
    session_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<TutorMessage>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    PracticeRepository::get_messages_conn(conn, &session_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn practice_create_message(
    mut message: TutorMessage,
    db_state: State<'_, DbState>,
) -> Result<TutorMessage, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    if message.id.is_empty() {
        message.id = uuid::Uuid::new_v4().to_string();
    }
    PracticeRepository::save_message_conn(conn, &message).map_err(|e| e.to_string())?;
    Ok(message)
}

#[tauri::command]
pub fn practice_get_memories(db_state: State<'_, DbState>) -> Result<Vec<TutorMemory>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    PracticeRepository::get_memories_conn(conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn practice_create_memory(
    mut memory: TutorMemory,
    db_state: State<'_, DbState>,
) -> Result<TutorMemory, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    if memory.id.is_empty() {
        memory.id = uuid::Uuid::new_v4().to_string();
    }
    PracticeRepository::save_memory_conn(conn, &memory).map_err(|e| e.to_string())?;
    Ok(memory)
}

#[tauri::command]
pub fn practice_delete_memory(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    PracticeRepository::delete_memory_conn(conn, &id).map_err(|e| e.to_string())
}
