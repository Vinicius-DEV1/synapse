use crate::db::DbState;
pub use synapse_core::domain::focus::{FocusAlarm, FocusRepository, FocusSession};
use tauri::State;

#[tauri::command]
pub async fn focus_get_alarms(db_state: State<'_, DbState>) -> Result<Vec<FocusAlarm>, String> {
    db_state
        .read(|conn| FocusRepository::get_alarms_conn(conn).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn focus_create_alarm(
    alarm: FocusAlarm,
    db_state: State<'_, DbState>,
) -> Result<FocusAlarm, String> {
    db_state
        .write(move |conn| {
            FocusRepository::upsert_alarm_conn(conn, alarm).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn focus_update_alarm(
    id: String,
    alarm: FocusAlarm,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
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
        })
        .await
}

#[tauri::command]
pub async fn focus_delete_alarm(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    db_state
        .write(move |conn| FocusRepository::delete_alarm_conn(conn, &id).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn focus_get_sessions(db_state: State<'_, DbState>) -> Result<Vec<FocusSession>, String> {
    db_state
        .read(|conn| FocusRepository::get_sessions_conn(conn).map_err(|e| e.to_string()))
        .await
}

#[derive(serde::Deserialize)]
pub struct DeleteFocusSessionsOptions {
    #[serde(rename = "type")]
    pub type_: String,
    pub id: Option<serde_json::Value>,
}

#[tauri::command]
pub async fn focus_create_session(
    session: FocusSession,
    db_state: State<'_, DbState>,
) -> Result<String, String> {
    db_state
        .write(move |conn| {
            FocusRepository::create_session_conn(conn, session).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn focus_delete_sessions(
    options: Option<DeleteFocusSessionsOptions>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            let now = chrono::Utc::now();
            let now_str = now.to_rfc3339();

            let mode = options.as_ref().map(|o| o.type_.as_str()).unwrap_or("all");
            match mode {
                "specific" => {
                    let target_id = options
                        .and_then(|o| o.id)
                        .map(|v| match v {
                            serde_json::Value::String(s) => s,
                            other => other.to_string(),
                        })
                        .unwrap_or_default();
                    if target_id.is_empty() {
                        return Ok(false);
                    }
                    FocusRepository::delete_session_conn(conn, &target_id)
                        .map_err(|e| e.to_string())
                }
                "today" => {
                    let today_prefix = now.format("%Y-%m-%d").to_string();
                    conn.execute(
                        "UPDATE focus_sessions SET deleted_at = ?1, updated_at = ?1 WHERE deleted_at IS NULL AND substr(created_at, 1, 10) >= ?2",
                        rusqlite::params![now_str, today_prefix],
                    )
                    .map_err(|e| e.to_string())?;
                    Ok(true)
                }
                "last7days" => {
                    let seven_days_ago =
                        (now - chrono::Duration::days(7)).format("%Y-%m-%d").to_string();
                    conn.execute(
                        "UPDATE focus_sessions SET deleted_at = ?1, updated_at = ?1 WHERE deleted_at IS NULL AND substr(created_at, 1, 10) >= ?2",
                        rusqlite::params![now_str, seven_days_ago],
                    )
                    .map_err(|e| e.to_string())?;
                    Ok(true)
                }
                _ => {
                    conn.execute(
                        "UPDATE focus_sessions SET deleted_at = ?1, updated_at = ?1 WHERE deleted_at IS NULL",
                        rusqlite::params![now_str],
                    )
                    .map_err(|e| e.to_string())?;
                    Ok(true)
                }
            }
        })
        .await
}
