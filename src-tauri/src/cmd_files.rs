use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(default)]
pub struct FileRecord {
    pub id: String,
    pub name: String,
    pub file_type: String,
    pub file_size: i64,
    pub local_path: Option<String>,
    pub drive_file_id: Option<String>,
    pub folder_id: Option<String>,
    pub mime_type: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

fn get_files_key(db_state: &DbState) -> Result<Option<String>, String> {
    let keys_guard = db_state.lock_keys()?;
    Ok(keys_guard.as_ref().and_then(|k| k.files.clone()))
}

fn encrypt_opt(val: &Option<String>, key: &Option<String>) -> Option<String> {
    if let (Some(v), Some(k)) = (val, key) {
        crate::crypto::encrypt_content(k, v).ok()
    } else {
        val.clone()
    }
}

fn decrypt_opt(val: &Option<String>, key: &Option<String>) -> Option<String> {
    if let (Some(v), Some(k)) = (val, key) {
        crate::crypto::decrypt_content(k, v)
            .ok()
            .or_else(|| val.clone())
    } else {
        val.clone()
    }
}

#[tauri::command]
pub fn files_get_all(
    folder_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<Vec<FileRecord>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let enc_key = get_files_key(&db_state)?;

    let mut query = String::from("SELECT id, name, file_type, file_size, local_path, drive_file_id, folder_id, mime_type, created_at, updated_at, deleted_at FROM files WHERE deleted_at IS NULL");

    let mut stmt = if let Some(ref _f_id) = folder_id {
        query.push_str(" AND folder_id = ?");
        conn.prepare(&query).map_err(|e| e.to_string())?
    } else {
        conn.prepare(&query).map_err(|e| e.to_string())?
    };

    let map_fn = |row: &rusqlite::Row| -> Result<FileRecord, rusqlite::Error> {
        let mut rec = FileRecord {
            id: row.get(0)?,
            name: row.get(1)?,
            file_type: row.get(2)?,
            file_size: row.get(3)?,
            local_path: row.get(4)?,
            drive_file_id: row.get(5)?,
            folder_id: row.get(6)?,
            mime_type: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
            deleted_at: row.get(10)?,
        };
        rec.local_path = decrypt_opt(&rec.local_path, &enc_key);
        rec.drive_file_id = decrypt_opt(&rec.drive_file_id, &enc_key);
        Ok(rec)
    };

    let iter = if let Some(f_id) = folder_id {
        stmt.query_map([f_id], map_fn).map_err(|e| e.to_string())?
    } else {
        stmt.query_map([], map_fn).map_err(|e| e.to_string())?
    };

    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }
    Ok(items)
}

#[tauri::command]
pub fn files_get_by_id(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<FileRecord>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let enc_key = get_files_key(&db_state)?;

    let result = conn.query_row(
        "SELECT id, name, file_type, file_size, local_path, drive_file_id, folder_id, mime_type, created_at, updated_at, deleted_at FROM files WHERE id = ? AND deleted_at IS NULL",
        [&id],
        |row| {
            let mut rec = FileRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                file_type: row.get(2)?,
                file_size: row.get(3)?,
                local_path: row.get(4)?,
                drive_file_id: row.get(5)?,
                folder_id: row.get(6)?,
                mime_type: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                deleted_at: row.get(10)?,
            };
            rec.local_path = decrypt_opt(&rec.local_path, &enc_key);
            rec.drive_file_id = decrypt_opt(&rec.drive_file_id, &enc_key);
            Ok(rec)
        }
    );

    match result {
        Ok(res) => Ok(Some(res)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn files_create(
    mut file: FileRecord,
    db_state: State<'_, DbState>,
) -> Result<FileRecord, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let enc_key = get_files_key(&db_state)?;

    if file.id.is_empty() {
        file.id = Uuid::new_v4().to_string();
    }

    let enc_path = encrypt_opt(&file.local_path, &enc_key);
    let enc_drive = encrypt_opt(&file.drive_file_id, &enc_key);

    conn.execute(
        "INSERT INTO files (id, name, file_type, file_size, local_path, drive_file_id, folder_id, mime_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            file_type = excluded.file_type,
            file_size = excluded.file_size,
            local_path = excluded.local_path,
            drive_file_id = excluded.drive_file_id,
            folder_id = excluded.folder_id,
            mime_type = excluded.mime_type,
            deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP",
        params![file.id, file.name, file.file_type, file.file_size, enc_path, enc_drive, file.folder_id, file.mime_type]
    ).map_err(|e| e.to_string())?;

    Ok(file)
}

#[tauri::command]
pub fn files_update(file: FileRecord, db_state: State<'_, DbState>) -> Result<i32, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let enc_key = get_files_key(&db_state)?;

    let enc_path = encrypt_opt(&file.local_path, &enc_key);
    let enc_drive = encrypt_opt(&file.drive_file_id, &enc_key);

    let count = conn.execute(
        "UPDATE files SET name = ?, file_type = ?, file_size = ?, local_path = ?, drive_file_id = ?, folder_id = ?, mime_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![file.name, file.file_type, file.file_size, enc_path, enc_drive, file.folder_id, file.mime_type, file.id]
    ).map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn files_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("UPDATE files SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    // Clean up annotations when standalone file is removed (Soft Delete)
    let _ = conn.execute("UPDATE library_highlights SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE book_id = ?", [&id]);
    let _ = conn.execute("UPDATE library_bookmarks SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE book_id = ?", [&id]);

    Ok(true)
}

#[tauri::command]
pub fn files_move(
    id: String,
    folder_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute(
        "UPDATE files SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![folder_id, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}
