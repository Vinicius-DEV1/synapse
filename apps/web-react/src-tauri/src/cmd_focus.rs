use crate::db::DbState;
pub use synapse_core::domain::focus::{FocusAlarm, FocusRepository, FocusSession};
use tauri::State;

#[tauri::command]
pub fn focus_get_alarms(db_state: State<'_, DbState>) -> Result<Vec<FocusAlarm>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    FocusRepository::get_alarms_conn(conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn focus_create_alarm(
    alarm: FocusAlarm,
    db_state: State<'_, DbState>,
) -> Result<FocusAlarm, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    FocusRepository::upsert_alarm_conn(conn, alarm).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn focus_update_alarm(
    id: String,
    alarm: FocusAlarm,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    FocusRepository::update_alarm_conn(
        conn,
        &id,
        &alarm.time,
        alarm.label.as_deref().unwrap_or(""),
        alarm.sound.as_deref().unwrap_or("bell"),
        alarm.enabled != 0,
        alarm.days.as_deref().unwrap_or("[]"),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn focus_delete_alarm(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    FocusRepository::delete_alarm_conn(conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn focus_get_sessions(db_state: State<'_, DbState>) -> Result<Vec<FocusSession>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    FocusRepository::get_sessions_conn(conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn focus_create_session(
    session: FocusSession,
    db_state: State<'_, DbState>,
) -> Result<String, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    FocusRepository::create_session_conn(conn, session).map_err(|e| e.to_string())
}
