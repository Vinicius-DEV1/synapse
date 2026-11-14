use crate::db::DbState;
use serde::{Deserialize, Serialize};
pub use synapse_core::domain::files::FilesRepository;
use tauri::State;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(default)]
pub struct FileFolder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub color: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[tauri::command]
pub fn file_folders_get_all(db_state: State<'_, DbState>) -> Result<Vec<FileFolder>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let list = FilesRepository::get_all_folders_conn(conn).map_err(|e| e.to_string())?;

    Ok(list
        .into_iter()
        .map(|f| FileFolder {
            id: f.id,
            name: f.name,
            parent_id: f.parent_id,
            color: Some(f.color),
            created_at: f.created_at,
            updated_at: f.updated_at,
            deleted_at: None,
        })
        .collect())
}

#[tauri::command]
pub fn file_folders_create(
    mut folder: FileFolder,
    db_state: State<'_, DbState>,
) -> Result<FileFolder, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    if folder.id.is_empty() {
        folder.id = Uuid::new_v4().to_string();
    }

    let created = FilesRepository::create_folder_conn(
        conn,
        &folder.name,
        folder.parent_id.as_deref(),
        folder.color.as_deref(),
    )
    .map_err(|e| e.to_string())?;

    if let Some(c) = created {
        folder.id = c.id;
    }
    Ok(folder)
}

#[tauri::command]
pub fn file_folders_update(
    folder: FileFolder,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let renamed = FilesRepository::rename_folder_conn(conn, &folder.id, &folder.name).map_err(|e| e.to_string())?;
    let moved = FilesRepository::move_folder_conn(conn, &folder.id, folder.parent_id.as_deref()).map_err(|e| e.to_string())?;

    Ok(if renamed || moved { 1 } else { 0 })
}

#[tauri::command]
pub fn file_folders_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    FilesRepository::delete_folder_conn(conn, &id).map_err(|e| e.to_string())
}
