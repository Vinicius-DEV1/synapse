use crate::db::DbState;
pub use synapse_core::domain::trash::{TrashItem, TrashRepository};

#[tauri::command]
pub async fn trash_get_all(db_state: tauri::State<'_, DbState>) -> Result<Vec<TrashItem>, String> {
    db_state
        .read(|conn| TrashRepository::get_trash_items_conn(conn).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn trash_restore(
    id: String,
    item_type: String,
    db_state: tauri::State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            TrashRepository::restore_trash_item_conn(conn, &id, &item_type)
                .map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn trash_delete_permanently(
    id: String,
    item_type: String,
    db_state: tauri::State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            TrashRepository::delete_trash_item_permanently_conn(conn, &id, &item_type)
                .map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn trash_empty(db_state: tauri::State<'_, DbState>) -> Result<bool, String> {
    db_state
        .write(|conn| TrashRepository::empty_trash_conn(conn).map_err(|e| e.to_string()))
        .await
}
