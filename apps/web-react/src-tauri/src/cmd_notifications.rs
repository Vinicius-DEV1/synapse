use crate::db::DbState;
pub use synapse_core::domain::notifications::{AppNotification, NotificationsRepository};
use tauri::State;

#[tauri::command]
pub fn notifications_get_all(db_state: State<'_, DbState>) -> Result<Vec<AppNotification>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    NotificationsRepository::get_notifications_conn(conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn notifications_add(
    notif: serde_json::Value,
    db_state: State<'_, DbState>,
) -> Result<AppNotification, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let notif_obj = notif.as_object().ok_or("Parâmetro notif inválido")?;

    let title = notif_obj.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let message = notif_obj.get("message").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let type_ = notif_obj
        .get("type")
        .or_else(|| notif_obj.get("type_"))
        .and_then(|v| v.as_str())
        .unwrap_or("system");
    let target_page_id = notif_obj.get("target_page_id").and_then(|v| v.as_str());
    let event_id = notif_obj.get("event_id").and_then(|v| v.as_str());
    let scheduled_for = notif_obj.get("scheduled_for").and_then(|v| v.as_str());

    NotificationsRepository::add_notification_conn(
        conn,
        &title,
        &message,
        type_,
        target_page_id,
        event_id,
        scheduled_for,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn notifications_mark_read(
    id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    NotificationsRepository::mark_read_conn(conn, id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn notifications_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    NotificationsRepository::delete_notification_conn(conn, &id).map_err(|e| e.to_string())
}
