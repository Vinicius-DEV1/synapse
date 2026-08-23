use crate::crypto_stream::{read_chunked_range, DecryptedRange};
use crate::db::DbState;
use tauri::http::{header, Request, Response, StatusCode};
use tauri::AppHandle;
use tauri::Manager;

fn get_mime_type(path: &std::path::Path) -> String {
    let path_for_mime = if path.to_string_lossy().ends_with(".enc") {
        path.with_extension("")
    } else {
        path.to_path_buf()
    };
    mime_guess::from_path(&path_for_mime)
        .first_or_octet_stream()
        .to_string()
}

fn find_file_candidates(app: &AppHandle, module_name: &str, decoded_path: &str) -> Option<std::path::PathBuf> {
    let dir_name = match module_name {
        "culture" => "videos",
        "library" => "library",
        "files" => "files",
        "focus" => "lofi",
        _ => module_name,
    };

    let mut base_dirs = Vec::new();
    // 1. Primary app data directory
    base_dirs.push(crate::get_app_data_dir());

    // 2. Tauri's app_handle app_data_dir (e.g. ~/.config/com.caderno.app or ~/.local/share/com.caderno.app)
    if let Ok(tauri_dir) = app.path().app_data_dir() {
        if !base_dirs.contains(&tauri_dir) {
            base_dirs.push(tauri_dir);
        }
    }

    // 3. Known platform standard paths for caderno / com.caderno.app
    if let Some(data_dir) = dirs::data_dir() {
        let p1 = data_dir.join("caderno");
        let p2 = data_dir.join("com.caderno.app");
        if !base_dirs.contains(&p1) { base_dirs.push(p1); }
        if !base_dirs.contains(&p2) { base_dirs.push(p2); }
    }
    if let Some(config_dir) = dirs::config_dir() {
        let p1 = config_dir.join("com.caderno.app");
        let p2 = config_dir.join("caderno");
        if !base_dirs.contains(&p1) { base_dirs.push(p1); }
        if !base_dirs.contains(&p2) { base_dirs.push(p2); }
    }

    // Check direct absolute path if provided
    let direct_path = std::path::PathBuf::from(decoded_path);
    if direct_path.is_absolute() {
        if direct_path.exists() {
            return Some(direct_path);
        }
        let direct_with_enc = std::path::PathBuf::from(format!("{}.enc", decoded_path));
        if direct_with_enc.exists() {
            return Some(direct_with_enc);
        }
    }

    let clean_relative = if decoded_path.starts_with(&format!("{}/", dir_name)) {
        &decoded_path[dir_name.len() + 1..]
    } else if decoded_path.starts_with(&format!("{}\\", dir_name)) {
        &decoded_path[dir_name.len() + 1..]
    } else if decoded_path.starts_with(&format!("{}/", module_name)) {
        &decoded_path[module_name.len() + 1..]
    } else if decoded_path.starts_with(&format!("{}\\", module_name)) {
        &decoded_path[module_name.len() + 1..]
    } else {
        decoded_path
    };

    let filename = std::path::Path::new(clean_relative)
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or(clean_relative);
    let id_stem = filename.split('.').next().unwrap_or(filename);

    for base in base_dirs {
        let module_dir = base.join(dir_name);
        if !module_dir.exists() {
            continue;
        }

        // Test list of candidates
        let mut candidates = Vec::new();
        candidates.push(module_dir.join(clean_relative));
        candidates.push(module_dir.join(format!("{}.enc", clean_relative)));
        candidates.push(module_dir.join(filename));
        candidates.push(module_dir.join(format!("{}.enc", filename)));
        candidates.push(module_dir.join(format!("{}.pdf.enc", id_stem)));
        candidates.push(module_dir.join(format!("{}.epub.enc", id_stem)));
        candidates.push(module_dir.join(format!("{}.mp4.enc", id_stem)));
        candidates.push(module_dir.join(format!("{}.pdf", id_stem)));
        candidates.push(module_dir.join(format!("{}.epub", id_stem)));
        candidates.push(module_dir.join(format!("{}.mp4", id_stem)));
        candidates.push(module_dir.join(format!("{}.enc", id_stem)));
        candidates.push(module_dir.join(id_stem));

        for candidate in candidates {
            if candidate.exists() && candidate.is_file() {
                return Some(candidate);
            }
        }

        // Check if any file in module_dir starts with id_stem
        if !id_stem.is_empty() && id_stem.len() > 8 {
            if let Ok(entries) = std::fs::read_dir(&module_dir) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with(id_stem) && entry.path().is_file() {
                        return Some(entry.path());
                    }
                }
            }
        }
    }

    None
}

pub fn handle_encrypted_protocol(app: &AppHandle, request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let db_state = app.state::<DbState>();

    // As URI can be like "encrypted://localhost/module_name/file.enc" or "http://encrypted.localhost/module_name/file.enc"
    let uri = request.uri().to_string();

    let path_str = if uri.starts_with("encrypted://localhost/") {
        uri.trim_start_matches("encrypted://localhost/")
    } else if uri.starts_with("http://encrypted.localhost/") {
        uri.trim_start_matches("http://encrypted.localhost/")
    } else {
        return Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .body(Vec::new())
            .unwrap();
    };

    // Extract module name from the path
    let parts: Vec<&str> = path_str.splitn(2, '/').collect();
    if parts.len() != 2 {
        return Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .body(Vec::new())
            .unwrap();
    }
    let module_name = parts[0];
    let file_path = parts[1];

    let decoded_path = urlencoding::decode(file_path)
        .unwrap_or(std::borrow::Cow::Borrowed(file_path))
        .to_string();

    let abs_path = match find_file_candidates(app, module_name, &decoded_path) {
        Some(p) => p,
        None => {
            return Response::builder()
                .status(StatusCode::NOT_FOUND)
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .body(format!("File not found: {:?}", decoded_path).into_bytes())
                .unwrap();
        }
    };

    // Extrai a chave do estado (B23: evita panic se poisoned)
    let keys_guard = db_state.keys.lock().unwrap_or_else(|e| e.into_inner());
    let unlocked_keys = match &*keys_guard {
        Some(k) => k,
        None => {
            return Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .body(Vec::new())
                .unwrap();
        }
    };

    let master_key = match module_name {
        "library" => unlocked_keys.library.clone(),
        "finance" => unlocked_keys.finance.clone(),
        "notes" => unlocked_keys.notes.clone(),
        "culture" => unlocked_keys.culture.clone(),
        "anki" => unlocked_keys.anki.clone(),
        "focus" => unlocked_keys.focus.clone(),
        "files" => unlocked_keys.files.clone(),
        _ => None,
    };

    let master_key = match master_key {
        Some(k) => k,
        None => {
            return Response::builder()
                .status(StatusCode::FORBIDDEN)
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .body(Vec::new())
                .unwrap();
        }
    };

    // Handle HTTP Range header for media streaming
    let range_header = request.headers().get("range").and_then(|v| v.to_str().ok());

    // Read original file length from ENC1 header (B24)
    let total_size = match crate::crypto_stream::get_encrypted_file_size(&abs_path) {
        Ok(size) => size,
        Err(e) => {
            return Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .body(e.into_bytes())
                .unwrap();
        }
    };

    if let Some(range) = range_header {
        if range.starts_with("bytes=") {
            let parts: Vec<&str> = range.trim_start_matches("bytes=").split('-').collect();
            let start = parts[0].parse::<u64>().unwrap_or(0);
            let end = if parts.len() > 1 && !parts[1].is_empty() {
                parts[1].parse::<u64>().unwrap_or(total_size - 1)
            } else {
                total_size - 1
            };

            // Read decrypted byte range
            match read_chunked_range(&abs_path, &master_key, start, end) {
                Ok(DecryptedRange { data, .. }) => {
                    let actual_end = start + data.len() as u64 - 1;

                    let mime_type = get_mime_type(&abs_path);

                    return Response::builder()
                        .status(StatusCode::PARTIAL_CONTENT)
                        .header(header::CONTENT_TYPE, mime_type)
                        .header(header::ACCEPT_RANGES, "bytes")
                        .header(
                            header::CONTENT_RANGE,
                            format!("bytes {}-{}/{}", start, actual_end, total_size),
                        )
                        .header(header::CONTENT_LENGTH, data.len().to_string())
                        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                        .body(data)
                        .unwrap();
                }
                Err(e) => {
                    return Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*") // B25
                        .body(e.into_bytes())
                        .unwrap();
                }
            }
        }
    }

    // Read entire file when Range header is absent
    match read_chunked_range(&abs_path, &master_key, 0, total_size - 1) {
        Ok(DecryptedRange { data, .. }) => {
            let mime_type = get_mime_type(&abs_path);
            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime_type)
                .header(header::CONTENT_LENGTH, data.len().to_string())
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .body(data)
                .unwrap()
        }
        Err(e) => Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .body(e.into_bytes())
            .unwrap(),
    }
}
