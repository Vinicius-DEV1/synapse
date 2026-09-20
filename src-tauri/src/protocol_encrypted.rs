use crate::crypto_stream::{read_chunked_range, DecryptedRange};
use crate::db::DbState;
use crate::protocol_encrypted_utils::{find_file, get_mime_type, get_safe_cors_origin};
use tauri::http::{header, Request, Response, StatusCode};
use tauri::AppHandle;
use tauri::Manager;

fn safe_error_response(status: StatusCode, origin: &str, message: &str) -> Response<Vec<u8>> {
    Response::builder()
        .status(status)
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, origin)
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(message.as_bytes().to_vec())
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

fn safe_response(builder: tauri::http::response::Builder, body: Vec<u8>) -> Response<Vec<u8>> {
    builder
        .body(body)
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

pub fn handle_encrypted_protocol(app: &AppHandle, request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let db_state = app.state::<DbState>();
    let cors_origin = get_safe_cors_origin(&request);

    // URI can be like "encrypted://localhost/module_name/file.enc" or "http://encrypted.localhost/module_name/file.enc"
    let uri = request.uri().to_string();

    let path_str = if uri.starts_with("encrypted://localhost/") {
        uri.trim_start_matches("encrypted://localhost/")
    } else if uri.starts_with("http://encrypted.localhost/") {
        uri.trim_start_matches("http://encrypted.localhost/")
    } else {
        return safe_error_response(StatusCode::BAD_REQUEST, &cors_origin, "Bad request scheme");
    };

    // Extract module name from the path
    let parts: Vec<&str> = path_str.splitn(2, '/').collect();
    if parts.len() != 2 {
        return safe_error_response(StatusCode::BAD_REQUEST, &cors_origin, "Bad request path format");
    }
    let module_name = parts[0];
    let file_path = parts[1];

    let decoded_path = urlencoding::decode(file_path)
        .unwrap_or(std::borrow::Cow::Borrowed(file_path))
        .to_string();

    let abs_path = match find_file(module_name, &decoded_path) {
        Some(p) => p,
        None => {
            return safe_error_response(
                StatusCode::NOT_FOUND,
                &cors_origin,
                &format!("File not found: {:?}", decoded_path),
            );
        }
    };

    // Safe mutex recovery
    let keys_guard = match db_state.lock_keys() {
        Ok(guard) => guard,
        Err(e) => {
            return safe_error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                &cors_origin,
                &format!("Mutex error: {}", e),
            );
        }
    };

    let unlocked_keys = match &*keys_guard {
        Some(k) => k,
        None => {
            return safe_error_response(StatusCode::UNAUTHORIZED, &cors_origin, "Keys locked");
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
            return safe_error_response(StatusCode::FORBIDDEN, &cors_origin, "Key not available for module");
        }
    };

    // Drop keys guard before file I/O to avoid holding mutex during streaming
    drop(keys_guard);

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
            let builder = Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime_type)
                .header(header::CONTENT_LENGTH, raw_data.len().to_string())
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin);
            return safe_response(builder, raw_data);
        }
    }

    // Read original file length from ENC1 header
    let total_size = match crate::crypto_stream::get_encrypted_file_size(&abs_path) {
        Ok(size) => size,
        Err(e) => {
            return safe_error_response(StatusCode::INTERNAL_SERVER_ERROR, &cors_origin, &e);
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

                    let builder = Response::builder()
                        .status(StatusCode::PARTIAL_CONTENT)
                        .header(header::CONTENT_TYPE, mime_type)
                        .header(header::ACCEPT_RANGES, "bytes")
                        .header(
                            header::CONTENT_RANGE,
                            format!("bytes {}-{}/{}", start, actual_end, total_size),
                        )
                        .header(header::CONTENT_LENGTH, data.len().to_string())
                        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin);
                    return safe_response(builder, data);
                }
                Err(e) => {
                    return safe_error_response(StatusCode::INTERNAL_SERVER_ERROR, &cors_origin, &e);
                }
            }
        }
    }

    // Read entire file when Range header is absent
    match read_chunked_range(&abs_path, &master_key, 0, total_size - 1) {
        Ok(DecryptedRange { data, .. }) => {
            let mime_type = get_mime_type(&abs_path);
            let builder = Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime_type)
                .header(header::CONTENT_LENGTH, data.len().to_string())
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin);
            safe_response(builder, data)
        }
        Err(e) => safe_error_response(StatusCode::INTERNAL_SERVER_ERROR, &cors_origin, &e),
    }
}
