use crate::db::DbState;
pub use synapse_core::domain::culture::{CultureEpisode, CultureItem, CultureRepository};
use tauri::State;

#[tauri::command]
pub async fn culture_get_items(db_state: State<'_, DbState>) -> Result<Vec<CultureItem>, String> {
    db_state
        .read(|conn| CultureRepository::get_items_conn(conn, None).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn culture_create_item(
    item: CultureItem,
    db_state: State<'_, DbState>,
) -> Result<CultureItem, String> {
    db_state
        .write(move |conn| {
            CultureRepository::create_item_conn(conn, item).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn culture_update_item(
    id: String,
    item: CultureItem,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    db_state
        .write(move |conn| {
            let updated =
                CultureRepository::update_item_conn(conn, &id, &item).map_err(|e| e.to_string())?;
            Ok(if updated { 1 } else { 0 })
        })
        .await
}

#[tauri::command]
pub async fn culture_delete_item(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            CultureRepository::delete_item_conn(conn, &id).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn culture_update_progress(
    id: String,
    progress: i32,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            CultureRepository::update_progress_conn(conn, &id, progress).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn culture_get_episodes(
    item_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<CultureEpisode>, String> {
    db_state
        .read(move |conn| {
            CultureRepository::get_episodes_conn(conn, &item_id).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn culture_save_episodes(
    item_id: String,
    episodes: Vec<CultureEpisode>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            CultureRepository::save_episodes_conn(conn, &item_id, &episodes)
                .map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn culture_toggle_episode_watched(
    episode_id: String,
    is_watched: bool,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            let _ = is_watched;
            CultureRepository::toggle_episode_watched_by_id_conn(conn, &episode_id)
                .map_err(|e| e.to_string())
        })
        .await
}
