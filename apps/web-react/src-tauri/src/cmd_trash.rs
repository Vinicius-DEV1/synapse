use crate::db::DbState;
pub use synapse_core::domain::trash::{TrashItem, TrashRepository};

#[tauri::command]
pub fn trash_get_all(db_state: tauri::State<DbState>) -> Result<Vec<TrashItem>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    TrashRepository::get_trash_items_conn(conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn trash_restore(
    id: String,
    item_type: String,
    db_state: tauri::State<DbState>,
) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    TrashRepository::restore_trash_item_conn(conn, &id, &item_type).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn trash_delete_permanently(
    id: String,
    item_type: String,
    db_state: tauri::State<DbState>,
) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    TrashRepository::delete_trash_item_permanently_conn(conn, &id, &item_type).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn trash_empty(db_state: tauri::State<DbState>) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    TrashRepository::empty_trash_conn(conn).map_err(|e| e.to_string())
}
