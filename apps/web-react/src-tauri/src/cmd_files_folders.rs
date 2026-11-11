use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
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

    let mut stmt = conn
        .prepare("SELECT id, name, parent_id, color, created_at, updated_at, deleted_at FROM file_folders WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(FileFolder {
                id: row.get(0)?,
                name: row.get(1)?,
                parent_id: row.get(2)?,
                color: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                deleted_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }
    Ok(items)
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

    conn.execute(
        "INSERT INTO file_folders (id, name, parent_id, color) 
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            parent_id = excluded.parent_id,
            color = excluded.color,
            deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP",
        params![folder.id, folder.name, folder.parent_id, folder.color],
    )
    .map_err(|e| e.to_string())?;

    Ok(folder)
}

#[tauri::command]
pub fn file_folders_update(
    folder: FileFolder,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let count = conn.execute(
        "UPDATE file_folders SET name = ?, parent_id = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![folder.name, folder.parent_id, folder.color, folder.id]
    ).map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn file_folders_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    // soft delete folder
    conn.execute("UPDATE file_folders SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    // move files to root (folder_id = NULL)
    conn.execute(
        "UPDATE files SET folder_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE folder_id = ?",
        [&id],
    )
    .map_err(|e| e.to_string())?;

    // move subfolders to root (parent_id = NULL)
    conn.execute(
        "UPDATE file_folders SET parent_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE parent_id = ?",
        [&id],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}
