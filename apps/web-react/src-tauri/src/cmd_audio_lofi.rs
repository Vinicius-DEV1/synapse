use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, State};

pub fn sanitize_filename(name: &str) -> String {
    let clean = Path::new(name)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unnamed_file");
    clean
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '_' || *c == '-')
        .collect()
}

pub fn get_lofi_dir(_app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = crate::get_app_data_dir();
    let lofi_dir = app_data_dir.join("lofi");
    if !lofi_dir.exists() {
        fs::create_dir_all(&lofi_dir).map_err(|e| e.to_string())?;
    }
    Ok(lofi_dir)
}

fn verify_path_confinement(base_dir: &Path, target_path: &Path) -> Result<(), String> {
    let canonical_base = base_dir
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize base directory: {}", e))?;
    if target_path.exists() {
        let canonical_target = target_path
            .canonicalize()
            .map_err(|e| format!("Failed to canonicalize target path: {}", e))?;
        if !canonical_target.starts_with(&canonical_base) {
            return Err("Access denied: path outside permitted directory".to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn lofi_get_local_path(filename: String, app: AppHandle) -> Result<String, String> {
    let lofi_dir = get_lofi_dir(&app)?;
    let safe_filename = sanitize_filename(&filename);
    let path = lofi_dir.join(&safe_filename);
    verify_path_confinement(&lofi_dir, &path)?;
    if path.exists() {
        Ok(path.to_string_lossy().to_string())
    } else {
        Ok("".to_string())
    }
}

#[tauri::command]
pub fn lofi_delete_local(filename: String, app: AppHandle) -> Result<bool, String> {
    let lofi_dir = get_lofi_dir(&app)?;
    let safe_filename = sanitize_filename(&filename);
    let path = lofi_dir.join(&safe_filename);
    verify_path_confinement(&lofi_dir, &path)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(true)
}

#[tauri::command]
pub async fn lofi_save_local(
    filename: String,
    buffer: Vec<u8>,
    db_state: State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let lofi_dir = get_lofi_dir(&app)?;
    let safe_filename = sanitize_filename(&filename);
    let filename_enc = format!("{}.enc", safe_filename);
    let path = lofi_dir.join(&filename_enc);
    let temp_path = lofi_dir.join(format!("{}.tmp", uuid::Uuid::new_v4()));

    fs::write(&temp_path, buffer).map_err(|e| e.to_string())?;

    let keys_guard = db_state.lock_keys()?;
    let master_key = if let Some(keys) = keys_guard.as_ref() {
        if let Some(ref k) = keys.focus {
            k.clone()
        } else {
            let _ = fs::remove_file(&temp_path);
            return Err("Focus key not found".into());
        }
    } else {
        let _ = fs::remove_file(&temp_path);
        return Err("Keys not unlocked".into());
    };

    if let Err(e) =
        crate::crypto_stream::encrypt_file_chunked(&temp_path, &path, &master_key)
    {
        let _ = fs::remove_file(&temp_path);
        return Err(e);
    }

    let _ = fs::remove_file(&temp_path);

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn lofi_copy_local(
    source_path: String,
    filename: String,
    db_state: State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    if source_path.contains('\0') {
        return Err("Invalid source path".into());
    }

    let source = Path::new(&source_path);
    if !source.exists() || !source.is_file() {
        return Err("Source file does not exist or is not a valid file".into());
    }

    let lofi_dir = get_lofi_dir(&app)?;
    let safe_filename = sanitize_filename(&filename);
    let filename_enc = format!("{}.enc", safe_filename);
    let dest_path = lofi_dir.join(&filename_enc);

    let keys_guard = db_state.lock_keys()?;
    let master_key = if let Some(keys) = keys_guard.as_ref() {
        if let Some(ref k) = keys.focus {
            k.clone()
        } else {
            return Err("Focus key not found".into());
        }
    } else {
        return Err("Keys not unlocked".into());
    };

    crate::crypto_stream::encrypt_file_chunked(&source_path, &dest_path, &master_key)?;

    Ok(dest_path.to_string_lossy().to_string())
}
