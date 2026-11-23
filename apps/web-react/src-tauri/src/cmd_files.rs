use crate::db::{run_blocking, DbState};
use serde::{Deserialize, Serialize};
use synapse_core::domain::files::FilesRepository;
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

fn map_core_file_record(
    rec: synapse_core::domain::files::FileRecord,
    enc_key: &Option<String>,
) -> FileRecord {
    FileRecord {
        id: rec.id,
        name: rec.name,
        file_type: rec.file_type,
        file_size: rec.file_size,
        local_path: decrypt_opt(&rec.local_path, enc_key),
        drive_file_id: decrypt_opt(&rec.drive_file_id, enc_key),
        folder_id: rec.folder_id,
        mime_type: rec.mime_type,
        created_at: rec.created_at,
        updated_at: rec.updated_at,
        deleted_at: None,
    }
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
pub async fn files_get_all(
    folder_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<Vec<FileRecord>, String> {
    db_state
        .read_with_keys(move |conn, keys| {
            let enc_key = keys.and_then(|k| k.files);
            let rows = FilesRepository::list_files_optional_folder_conn(conn, folder_id.as_deref())
                .map_err(|e| e.to_string())?;
            Ok(rows
                .into_iter()
                .map(|r| map_core_file_record(r, &enc_key))
                .collect())
        })
        .await
}

#[tauri::command]
pub async fn files_get_by_id(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<FileRecord>, String> {
    db_state
        .read_with_keys(move |conn, keys| {
            let enc_key = keys.and_then(|k| k.files);
            let rec = FilesRepository::get_file_conn(conn, &id).map_err(|e| e.to_string())?;
            Ok(rec.map(|r| map_core_file_record(r, &enc_key)))
        })
        .await
}

#[tauri::command]
pub async fn files_create(
    mut file: FileRecord,
    db_state: State<'_, DbState>,
) -> Result<FileRecord, String> {
    let enc_key = db_state.clone_keys()?.and_then(|k| k.files);
    let state = db_state.inner().clone();

    run_blocking(move || {
        if file.id.is_empty() {
            file.id = Uuid::new_v4().to_string();
        }
        let now = chrono::Utc::now().to_rfc3339();
        if file
            .created_at
            .as_ref()
            .map(|s| s.is_empty())
            .unwrap_or(true)
        {
            file.created_at = Some(now.clone());
        }
        file.updated_at = Some(now.clone());

        let enc_path = encrypt_opt(&file.local_path, &enc_key);
        let enc_drive = encrypt_opt(&file.drive_file_id, &enc_key);

        let guard = state.lock_conn()?;
        let conn = guard.as_ref().ok_or("Banco não inicializado")?;

        FilesRepository::upsert_file_record_conn(
            conn,
            &file.id,
            &file.name,
            &file.file_type,
            file.file_size,
            enc_path.as_deref(),
            enc_drive.as_deref(),
            file.folder_id.as_deref(),
            file.mime_type.as_deref(),
            file.created_at.as_deref(),
            &now,
        )
        .map_err(|e| e.to_string())?;

        Ok(file)
    })
    .await
}

#[tauri::command]
pub async fn files_update(file: FileRecord, db_state: State<'_, DbState>) -> Result<i32, String> {
    let enc_key = db_state.clone_keys()?.and_then(|k| k.files);
    let state = db_state.inner().clone();

    run_blocking(move || {
        let now = chrono::Utc::now().to_rfc3339();
        let enc_path = encrypt_opt(&file.local_path, &enc_key);
        let enc_drive = encrypt_opt(&file.drive_file_id, &enc_key);

        let guard = state.lock_conn()?;
        let conn = guard.as_ref().ok_or("Banco não inicializado")?;

        FilesRepository::update_file_record_conn(
            conn,
            &file.id,
            &file.name,
            &file.file_type,
            file.file_size,
            enc_path.as_deref(),
            enc_drive.as_deref(),
            file.folder_id.as_deref(),
            file.mime_type.as_deref(),
            &now,
        )
        .map_err(|e| e.to_string())
    })
    .await
}

#[tauri::command]
pub async fn files_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            FilesRepository::delete_file_with_annotations_conn(conn, &id)
                .map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn files_move(
    id: String,
    folder_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            FilesRepository::move_file_raw_conn(conn, &id, folder_id.as_deref())
                .map_err(|e| e.to_string())
        })
        .await
}
