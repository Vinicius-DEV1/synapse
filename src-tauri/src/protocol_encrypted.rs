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

fn is_path_confined(path: &std::path::Path, base_dir: &std::path::Path) -> bool {
    let canonical_base = match base_dir.canonicalize() {
        Ok(b) => b,
        Err(_) => base_dir.to_path_buf(),
    };

    if let Ok(canon) = path.canonicalize() {
        if canon.starts_with(&canonical_base) && canon.is_file() {
            return true;
        }
        // Fallback for debug/release local folder during development
        if let Some(parent) = base_dir.parent() {
            if let Some(grandparent) = parent.parent() {
                let release_dir = grandparent.join("release").join("data");
                if let Ok(canon_release) = release_dir.canonicalize() {
                    if canon.starts_with(&canon_release) && canon.is_file() {
                        return true;
                    }
                }
            }
        }
    }
    false
}

fn find_file(module_name: &str, decoded_path: &str) -> Option<std::path::PathBuf> {
    let dir_name = match module_name {
        "culture" => "videos",
        "library" => "library",
        "files" => "files",
        "focus" => "lofi",
        _ => module_name,
    };

    let base_dir = crate::get_app_data_dir();
    let module_dir = base_dir.join(dir_name);

    // Direct absolute path check (if passed): strictly confined within application data directory
    let direct_path = std::path::PathBuf::from(decoded_path);
    if direct_path.is_absolute() {
        if is_path_confined(&direct_path, &base_dir) {
            return direct_path.canonicalize().ok();
        }
        let direct_with_enc = std::path::PathBuf::from(format!("{}.enc", decoded_path));
        if is_path_confined(&direct_with_enc, &base_dir) {
            return direct_with_enc.canonicalize().ok();
        }
        return None;
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

    let target_path = module_dir.join(clean_relative);
    if is_path_confined(&target_path, &base_dir) {
        return target_path.canonicalize().ok();
    }

    // Try with .enc suffix if not present
    if !clean_relative.ends_with(".enc") {
        let target_enc = module_dir.join(format!("{}.enc", clean_relative));
        if is_path_confined(&target_enc, &base_dir) {
            return target_enc.canonicalize().ok();
        }
    }

    None
}

fn get_safe_cors_origin(request: &Request<Vec<u8>>) -> String {
    if let Some(origin) = request.headers().get("origin").and_then(|v| v.to_str().ok()) {
        if origin.starts_with("tauri://")
            || origin.starts_with("http://localhost")
            || origin.starts_with("http://127.0.0.1")
            || origin.starts_with("http://tauri.localhost")
        {
            return origin.to_string();
        }
    }
    "tauri://localhost".to_string()
}

pub fn handle_encrypted_protocol(app: &AppHandle, request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let db_state = app.state::<DbState>();
    let cors_origin = get_safe_cors_origin(&request);

    // As URI can be like "encrypted://localhost/module_name/file.enc" or "http://encrypted.localhost/module_name/file.enc"
    let uri = request.uri().to_string();

    let path_str = if uri.starts_with("encrypted://localhost/") {
        uri.trim_start_matches("encrypted://localhost/")
    } else if uri.starts_with("http://encrypted.localhost/") {
        uri.trim_start_matches("http://encrypted.localhost/")
    } else {
        return Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin)
            .body(Vec::new())
            .unwrap();
    };

    // Extract module name from the path
    let parts: Vec<&str> = path_str.splitn(2, '/').collect();
    if parts.len() != 2 {
        return Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin)
            .body(Vec::new())
            .unwrap();
    }
    let module_name = parts[0];
    let file_path = parts[1];

    let decoded_path = urlencoding::decode(file_path)
        .unwrap_or(std::borrow::Cow::Borrowed(file_path))
        .to_string();

    let abs_path = match find_file(module_name, &decoded_path) {
        Some(p) => p,
        None => {
            return Response::builder()
                .status(StatusCode::NOT_FOUND)
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin)
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
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin)
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
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin)
                .body(Vec::new())
                .unwrap();
        }
    };

    // Handle HTTP Range header for media streaming
    let range_header = request.headers().get("range").and_then(|v| v.to_str().ok());

    // Check if file is ENC1 encrypted or raw unencrypted file
    let is_enc1 = match std::fs::File::open(&abs_path) {
        Ok(mut f) => {
            use std::io::Read;
            let mut buf = [0u8; 4];
            f.read_exact(&mut buf).is_ok() && &buf == b"ENC1"
        }
        Err(_) => false,
    };

    if !is_enc1 {
        if let Ok(raw_data) = std::fs::read(&abs_path) {
            let mime_type = get_mime_type(&abs_path);
            return Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime_type)
                .header(header::CONTENT_LENGTH, raw_data.len().to_string())
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin)
                .body(raw_data)
                .unwrap();
        }
    }

    // Read original file length from ENC1 header (B24)
    let total_size = match crate::crypto_stream::get_encrypted_file_size(&abs_path) {
        Ok(size) => size,
        Err(e) => {
            return Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin)
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
                        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin)
                        .body(data)
                        .unwrap();
                }
                Err(e) => {
                    return Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin)
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
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin)
                .body(data)
                .unwrap()
        }
        Err(e) => Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin)
            .body(e.into_bytes())
            .unwrap(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_path_confined_rejects_external_paths() {
        let temp_dir = std::env::temp_dir();
        let base_dir = temp_dir.join("caderno_safe_base");
        let _ = std::fs::create_dir_all(&base_dir);

        let outside_file = temp_dir.join("outside_secret.txt");
        let _ = std::fs::write(&outside_file, b"secret");

        assert!(!is_path_confined(&outside_file, &base_dir));

        let _ = std::fs::remove_file(outside_file);
        let _ = std::fs::remove_dir_all(base_dir);
    }

    #[test]
    fn test_is_path_confined_accepts_confined_file() {
        let temp_dir = std::env::temp_dir();
        let base_dir = temp_dir.join("caderno_safe_base_2");
        let _ = std::fs::create_dir_all(&base_dir);

        let inside_file = base_dir.join("safe.txt");
        let _ = std::fs::write(&inside_file, b"content");

        assert!(is_path_confined(&inside_file, &base_dir));

        let _ = std::fs::remove_file(inside_file);
        let _ = std::fs::remove_dir_all(base_dir);
    }

    #[test]
    fn test_find_file_rejects_arbitrary_absolute_path() {
        let res = find_file("culture", "/etc/passwd");
        assert!(res.is_none());

        let res2 = find_file("notes", "../../../../etc/shadow");
        assert!(res2.is_none());
    }
}

