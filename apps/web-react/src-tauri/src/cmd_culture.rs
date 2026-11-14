use crate::db::DbState;
pub use synapse_core::domain::culture::{CultureEpisode, CultureItem, CultureRepository};
use tauri::State;

#[tauri::command]
pub fn culture_get_items(db_state: State<'_, DbState>) -> Result<Vec<CultureItem>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    CultureRepository::get_items_conn(conn, None).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn culture_create_item(
    item: CultureItem,
    db_state: State<'_, DbState>,
) -> Result<CultureItem, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    CultureRepository::create_item_conn(conn, item).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn culture_update_item(
    id: String,
    item: CultureItem,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let updated = CultureRepository::update_item_conn(conn, &id, &item).map_err(|e| e.to_string())?;
    Ok(if updated { 1 } else { 0 })
}

#[tauri::command]
pub fn culture_delete_item(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    CultureRepository::delete_item_conn(conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn culture_update_progress(
    id: String,
    progress: i32,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    CultureRepository::update_progress_conn(conn, &id, progress).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn culture_get_episodes(
    item_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<CultureEpisode>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    CultureRepository::get_episodes_conn(conn, &item_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn culture_save_episodes(
    item_id: String,
    episodes: Vec<CultureEpisode>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    CultureRepository::save_episodes_conn(conn, &item_id, &episodes).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn culture_toggle_episode_watched(
    episode_id: String,
    is_watched: bool,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let _ = is_watched;
    let item_id: String = conn
        .query_row(
            "SELECT item_id FROM culture_episodes WHERE id = ?1",
            [&episode_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    CultureRepository::toggle_episode_watched_conn(conn, &episode_id, &item_id).map_err(|e| e.to_string())
}
