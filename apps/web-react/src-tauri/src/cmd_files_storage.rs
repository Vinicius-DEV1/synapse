use crate::db::DbState;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, State};
use uuid::Uuid;

#[tauri::command]
pub fn files_save_local(
    filename: String,
    data: Vec<u8>,
    db_state: State<'_, DbState>,
    _app_handle: AppHandle,
) -> Result<String, String> {
    let app_dir = crate::get_app_data_dir();
    let files_dir = app_dir.join("files");

    if !files_dir.exists() {
        fs::create_dir_all(&files_dir).map_err(|e| e.to_string())?;
    }

    let source_path_buf = PathBuf::from(&filename);

    let uuid = Uuid::new_v4().to_string();
    let raw_ext = source_path_buf
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    let sanitized_ext: String = raw_ext
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(16)
        .collect();
    let new_filename = if sanitized_ext.is_empty() {
        format!("{}.enc", uuid)
    } else {
        format!("{}.{}.enc", uuid, sanitized_ext)
    };

    let dest_path = files_dir.join(&new_filename);
    let temp_path = files_dir.join(format!("{}.tmp", uuid));

    // Save to temp file
    fs::write(&temp_path, data).map_err(|e| e.to_string())?;

    // Encrypt
    let keys_guard = db_state.lock_keys()?;
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

    if let Err(e) = crate::crypto_stream::encrypt_file_chunked(&temp_path, &dest_path, &master_key)
    {
        let _ = fs::remove_file(&temp_path);
        return Err(e);
    }

    let _ = fs::remove_file(&temp_path);

    Ok(new_filename)
}

#[tauri::command]
pub fn files_get_local(_filename: String, _app_handle: AppHandle) -> Result<Vec<u8>, String> {
    Err("Obsoleto. Use http://encrypted.localhost/files/ em vez desta API.".to_string())
}

/// Reads a local binary media or document file from disk into memory for editor paste and asset importing.
/// Hardened against path traversal, null bytes, non-regular files, unauthorized file extensions, and OOM size limits.
#[tauri::command]
pub fn read_local_binary_file(path: String) -> Result<Vec<u8>, String> {
    if path.is_empty() || path.contains('\0') {
        return Err("Caminho de arquivo inválido".to_string());
    }

    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(format!("Arquivo não encontrado: {}", path));
    }

    let canonical = path_buf
        .canonicalize()
        .map_err(|e| format!("Falha ao resolver caminho canônico: {}", e))?;

    if !canonical.is_file() {
        return Err("O caminho especificado não é um arquivo regular".to_string());
    }

    const ALLOWED_EXTENSIONS: &[&str] = &[
        "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "tiff", "avif",
        "mp3", "wav", "ogg", "m4a", "flac", "aac", "opus",
        "mp4", "webm", "mkv", "mov", "avi",
        "pdf", "epub", "txt", "md", "json", "csv",
        "woff", "woff2", "ttf", "otf",
        "enc",
    ];

    let ext = canonical
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(format!(
            "Extensão de arquivo não permitida para importação: .{}",
            ext
        ));
    }

    let metadata = canonical
        .metadata()
        .map_err(|e| format!("Falha ao inspecionar metadados do arquivo: {}", e))?;

    const MAX_FILE_SIZE_BYTES: u64 = 250 * 1024 * 1024; // 250 MB
    if metadata.len() > MAX_FILE_SIZE_BYTES {
        return Err("Arquivo excede o limite máximo permitido de 250MB".to_string());
    }

    std::fs::read(&canonical).map_err(|e| format!("Falha ao ler arquivo: {}", e))
}
