use tauri::{State, AppHandle, Manager};
use serde::{Deserialize, Serialize};
use crate::db::DbState;
use rusqlite::params;
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Clone)]
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

#[derive(Serialize, Deserialize, Clone)]
pub struct FileFolder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub color: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct FilePageLink {
    pub id: String,
    pub file_id: String,
    pub page_id: String,
    pub link_type: Option<String>,
    pub widget_id: Option<String>,
    pub created_at: Option<String>,
    pub deleted_at: Option<String>,
}

fn get_files_key(db_state: &DbState) -> Option<String> {
    let keys_guard = db_state.keys.lock().unwrap();
    if let Some(keys) = keys_guard.as_ref() {
        return keys.files.clone();
    }
    None
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
        crate::crypto::decrypt_content(k, v).ok().or_else(|| val.clone())
    } else {
        val.clone()
    }
}

#[tauri::command]
pub fn files_get_all(folder_id: Option<String>, db_state: State<'_, DbState>) -> Result<Vec<FileRecord>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let enc_key = get_files_key(&db_state);
    
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
    for i in iter { if let Ok(item) = i { items.push(item); } }
    Ok(items)
}

#[tauri::command]
pub fn files_get_by_id(id: String, db_state: State<'_, DbState>) -> Result<Option<FileRecord>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let enc_key = get_files_key(&db_state);
    
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
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub fn files_create(mut file: FileRecord, db_state: State<'_, DbState>) -> Result<FileRecord, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let enc_key = get_files_key(&db_state);
    
    if file.id.is_empty() { file.id = Uuid::new_v4().to_string(); }
    
    let enc_path = encrypt_opt(&file.local_path, &enc_key);
    let enc_drive = encrypt_opt(&file.drive_file_id, &enc_key);
    
    conn.execute(
        "INSERT INTO files (id, name, file_type, file_size, local_path, drive_file_id, folder_id, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        params![file.id, file.name, file.file_type, file.file_size, enc_path, enc_drive, file.folder_id, file.mime_type]
    ).map_err(|e| e.to_string())?;
    
    Ok(file)
}

#[tauri::command]
pub fn files_update(file: FileRecord, db_state: State<'_, DbState>) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let enc_key = get_files_key(&db_state);
    
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
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute("UPDATE files SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
        
    Ok(true)
}

#[tauri::command]
pub fn files_move(id: String, folder_id: Option<String>, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute("UPDATE files SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", params![folder_id, id])
        .map_err(|e| e.to_string())?;
        
    Ok(true)
}

#[tauri::command]
pub fn files_save_local(filename: String, data: Vec<u8>, db_state: State<'_, DbState>, app_handle: AppHandle) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let files_dir = app_dir.join("files");
    
    if !files_dir.exists() {
        fs::create_dir_all(&files_dir).map_err(|e| e.to_string())?;
    }
    
    let source_path_buf = PathBuf::from(&filename);
    
    let uuid = Uuid::new_v4().to_string();
    let ext = source_path_buf.extension().and_then(|e| e.to_str()).unwrap_or("");
    let new_filename = if ext.is_empty() { format!("{}.enc", uuid) } else { format!("{}.{}.enc", uuid, ext) };
    
    let dest_path = files_dir.join(&new_filename);
    let temp_path = files_dir.join(format!("{}.tmp", uuid));
    
    // Save to temp file
    fs::write(&temp_path, data).map_err(|e| e.to_string())?;
    
    // Encrypt
    let keys_guard = db_state.keys.lock().unwrap();
    let master_key = if let Some(keys) = keys_guard.as_ref() {
        if let Some(ref k) = keys.files {
            k.clone()
        } else {
            let _ = fs::remove_file(&temp_path);
            return Err("Files key not found".into());
        }
    } else {
        let _ = fs::remove_file(&temp_path);
        return Err("Keys not unlocked".into());
    };
    
    if let Err(e) = crate::crypto_stream::encrypt_file_chunked(&temp_path, &dest_path, &master_key) {
        let _ = fs::remove_file(&temp_path);
        return Err(e);
    }
    
    let _ = fs::remove_file(&temp_path);
    
    Ok(new_filename)
}

#[tauri::command]
pub fn files_get_local(filename: String, app_handle: AppHandle) -> Result<Vec<u8>, String> {
    Err("Obsoleto. Use http://encrypted.localhost/files/ em vez desta API.".to_string())
}

#[tauri::command]
pub fn file_folders_get_all(db_state: State<'_, DbState>) -> Result<Vec<FileFolder>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT id, name, parent_id, color, created_at, updated_at, deleted_at FROM file_folders WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt.query_map([], |row| {
        Ok(FileFolder {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            color: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            deleted_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter { if let Ok(item) = i { items.push(item); } }
    Ok(items)
}

#[tauri::command]
pub fn file_folders_create(mut folder: FileFolder, db_state: State<'_, DbState>) -> Result<FileFolder, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    if folder.id.is_empty() { folder.id = Uuid::new_v4().to_string(); }
    
    conn.execute(
        "INSERT INTO file_folders (id, name, parent_id, color) VALUES (?, ?, ?, ?)",
        params![folder.id, folder.name, folder.parent_id, folder.color]
    ).map_err(|e| e.to_string())?;
    
    Ok(folder)
}

#[tauri::command]
pub fn file_folders_update(folder: FileFolder, db_state: State<'_, DbState>) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let count = conn.execute(
        "UPDATE file_folders SET name = ?, parent_id = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![folder.name, folder.parent_id, folder.color, folder.id]
    ).map_err(|e| e.to_string())?;
    
    Ok(count as i32)
}

#[tauri::command]
pub fn file_folders_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    // soft delete folder
    conn.execute("UPDATE file_folders SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
    
    // move files to root (folder_id = NULL)
    conn.execute("UPDATE files SET folder_id = NULL WHERE folder_id = ?", [&id])
        .map_err(|e| e.to_string())?;
        
    Ok(true)
}

#[tauri::command]
pub fn file_links_get_by_page(page_id: String, db_state: State<'_, DbState>) -> Result<Vec<FilePageLink>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT id, file_id, page_id, link_type, widget_id, created_at, deleted_at FROM file_page_links WHERE page_id = ? AND deleted_at IS NULL")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt.query_map([page_id], |row| {
        Ok(FilePageLink {
            id: row.get(0)?,
            file_id: row.get(1)?,
            page_id: row.get(2)?,
            link_type: row.get(3)?,
            widget_id: row.get(4)?,
            created_at: row.get(5)?,
            deleted_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter { if let Ok(item) = i { items.push(item); } }
    Ok(items)
}

#[tauri::command]
pub fn file_links_get_by_file(file_id: String, db_state: State<'_, DbState>) -> Result<Vec<FilePageLink>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT id, file_id, page_id, link_type, widget_id, created_at, deleted_at FROM file_page_links WHERE file_id = ? AND deleted_at IS NULL")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt.query_map([file_id], |row| {
        Ok(FilePageLink {
            id: row.get(0)?,
            file_id: row.get(1)?,
            page_id: row.get(2)?,
            link_type: row.get(3)?,
            widget_id: row.get(4)?,
            created_at: row.get(5)?,
            deleted_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter { if let Ok(item) = i { items.push(item); } }
    Ok(items)
}

#[tauri::command]
pub fn file_links_create(mut link: FilePageLink, db_state: State<'_, DbState>) -> Result<FilePageLink, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    if link.id.is_empty() { link.id = Uuid::new_v4().to_string(); }
    
    conn.execute(
        "INSERT INTO file_page_links (id, file_id, page_id, link_type, widget_id) VALUES (?, ?, ?, ?, ?)",
        params![link.id, link.file_id, link.page_id, link.link_type, link.widget_id]
    ).map_err(|e| e.to_string())?;
    
    Ok(link)
}

#[tauri::command]
pub fn file_links_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute("UPDATE file_page_links SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
        
    Ok(true)
}
