use crate::db::DbState;
use synapse_core::domain::practice::{PracticeRepository, TutorMemory, TutorMessage, TutorSession};
use tauri::State;

#[tauri::command]
pub async fn practice_get_sessions(
    db_state: State<'_, DbState>,
) -> Result<Vec<TutorSession>, String> {
    db_state
        .read(|conn| PracticeRepository::get_sessions_conn(conn).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn practice_create_session(
    session: TutorSession,
    db_state: State<'_, DbState>,
) -> Result<TutorSession, String> {
    db_state
        .write(move |conn| {
            if !session.id.is_empty() {
                PracticeRepository::save_session_conn(conn, &session).map_err(|e| e.to_string())?;
                return Ok(session);
            }
            PracticeRepository::create_session_conn(
                conn,
                &session.title,
                &session.started_at,
                session.custom_prompt.as_deref(),
            )
            .map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn practice_update_session(
    session: TutorSession,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    db_state
        .write(move |conn| {
            PracticeRepository::save_session_conn(conn, &session).map_err(|e| e.to_string())?;
            Ok(1)
        })
        .await
}

#[tauri::command]
pub async fn practice_get_messages(
    session_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<TutorMessage>, String> {
    db_state
        .read(move |conn| {
            PracticeRepository::get_messages_conn(conn, &session_id).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn practice_create_message(
    message: TutorMessage,
    db_state: State<'_, DbState>,
) -> Result<TutorMessage, String> {
    db_state
        .write(move |conn| {
            if !message.id.is_empty() {
                PracticeRepository::save_message_conn(conn, &message).map_err(|e| e.to_string())?;
                return Ok(message);
            }
            PracticeRepository::create_message_conn(
                conn,
                &message.session_id,
                &message.role,
                &message.text_content,
            )
            .map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn practice_get_memories(
    db_state: State<'_, DbState>,
) -> Result<Vec<TutorMemory>, String> {
    db_state
        .read(|conn| PracticeRepository::get_memories_conn(conn).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn practice_create_memory(
    memory: TutorMemory,
    db_state: State<'_, DbState>,
) -> Result<TutorMemory, String> {
    db_state
        .write(move |conn| {
            if !memory.id.is_empty() {
                PracticeRepository::save_memory_conn(conn, &memory).map_err(|e| e.to_string())?;
                return Ok(memory);
            }
            PracticeRepository::create_memory_conn(conn, &memory.category, &memory.fact)
                .map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn practice_delete_memory(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            PracticeRepository::delete_memory_conn(conn, &id).map_err(|e| e.to_string())
        })
        .await
}
