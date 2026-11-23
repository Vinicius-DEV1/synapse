use crate::crypto_stream::{read_chunked_range, DecryptedRange};
use crate::db::DbState;
use crate::protocol_encrypted_utils::{find_file, get_mime_type, get_safe_cors_origin};
use std::path::Path;
use std::time::UNIX_EPOCH;
use tauri::http::{header, Request, Response, StatusCode};
use tauri::AppHandle;
use tauri::Manager;

// Force revalidation via If-None-Match on every request so locking the vault immediately
// revokes access (401/403) while unlocked unchanged files short-circuit with 304 and zero decryption.
const ENCRYPTED_CACHE_CONTROL: &str = "private, no-cache, must-revalidate";

fn safe_error_response(status: StatusCode, origin: &str, message: &str) -> Response<Vec<u8>> {
    Response::builder()
        .status(status)
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, origin)
        .header(header::CACHE_CONTROL, "no-store")
        .header(header::VARY, "Origin")
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(message.as_bytes().to_vec())
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

fn safe_response(builder: tauri::http::response::Builder, body: Vec<u8>) -> Response<Vec<u8>> {
    builder
        .body(body)
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

/// Computes a deterministic strong ETag from file length and modification timestamp.
pub(crate) fn compute_file_etag(path: &Path) -> Option<String> {
    let metadata = std::fs::metadata(path).ok()?;
    let len = metadata.len();
    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| (d.as_secs(), d.subsec_nanos()))
        .unwrap_or((0, 0));
    Some(format!("\"{len}-{}-{}\"", modified.0, modified.1))
}

/// Checks whether an `If-None-Match` header matches the computed ETag.
pub(crate) fn if_none_match_matches(header_val: Option<&str>, etag: &str) -> bool {
    let Some(raw) = header_val else {
        return false;
    };
    raw.split(',').any(|candidate| {
        let trimmed = candidate.trim();
        trimmed == "*" || trimmed == etag || trimmed.strip_prefix("W/") == Some(etag)
    })
}

fn apply_cache_headers(
    mut builder: tauri::http::response::Builder,
    etag: Option<&str>,
) -> tauri::http::response::Builder {
    builder = builder
        .header(header::CACHE_CONTROL, ENCRYPTED_CACHE_CONTROL)
        .header(header::VARY, "Origin");
    if let Some(tag) = etag {
        builder = builder.header(header::ETAG, tag);
    }
    builder
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

    // Strip optional query string before path lookup
    let path_without_query = path_str.split('?').next().unwrap_or(path_str);

    // Extract module name from the path
    let parts: Vec<&str> = path_without_query.splitn(2, '/').collect();
    if parts.len() != 2 {
        return safe_error_response(
            StatusCode::BAD_REQUEST,
            &cors_origin,
            "Bad request path format",
        );
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

    // Safe mutex recovery: verify vault unlock and module key BEFORE evaluating cache headers
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
            return safe_error_response(
                StatusCode::FORBIDDEN,
                &cors_origin,
                "Key not available for module",
            );
        }
    };

    // Drop keys guard before file I/O to avoid holding mutex during streaming
    drop(keys_guard);

    let etag = compute_file_etag(&abs_path);
    let range_header = request.headers().get("range").and_then(|v| v.to_str().ok());
    let if_none_match = request
        .headers()
        .get(header::IF_NONE_MATCH)
        .and_then(|v| v.to_str().ok());

    // Short-circuit unmodified full-file requests without re-decrypting from disk
    if range_header.is_none() {
        if let Some(tag) = etag.as_deref() {
            if if_none_match_matches(if_none_match, tag) {
                let builder = apply_cache_headers(
                    Response::builder()
                        .status(StatusCode::NOT_MODIFIED)
                        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin),
                    Some(tag),
                );
                return safe_response(builder, Vec::new());
            }
        }
    }

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
            let builder = apply_cache_headers(
                Response::builder()
                    .status(StatusCode::OK)
                    .header(header::CONTENT_TYPE, mime_type)
                    .header(header::CONTENT_LENGTH, raw_data.len().to_string())
                    .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin),
                etag.as_deref(),
            );
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

    if total_size == 0 {
        let mime_type = get_mime_type(&abs_path);
        let builder = apply_cache_headers(
            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime_type)
                .header(header::CONTENT_LENGTH, "0")
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin),
            etag.as_deref(),
        );
        return safe_response(builder, Vec::new());
    }

    if let Some(range) = range_header {
        if range.starts_with("bytes=") {
            let parts: Vec<&str> = range.trim_start_matches("bytes=").split('-').collect();
            let start = parts[0].parse::<u64>().unwrap_or(0);
            let end = if parts.len() > 1 && !parts[1].is_empty() {
                parts[1].parse::<u64>().unwrap_or(total_size - 1)
            } else {
                total_size - 1
            };

            if start >= total_size {
                let builder = Response::builder()
                    .status(StatusCode::RANGE_NOT_SATISFIABLE)
                    .header(header::CONTENT_RANGE, format!("bytes */{}", total_size))
                    .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin)
                    .header(header::VARY, "Origin");
                return safe_response(builder, Vec::new());
            }

            // Read decrypted byte range
            match read_chunked_range(&abs_path, &master_key, start, end) {
                Ok(DecryptedRange { data, .. }) => {
                    let actual_end = if data.is_empty() {
                        start
                    } else {
                        start + (data.len() as u64) - 1
                    };
                    let mime_type = get_mime_type(&abs_path);

                    let builder = apply_cache_headers(
                        Response::builder()
                            .status(StatusCode::PARTIAL_CONTENT)
                            .header(header::CONTENT_TYPE, mime_type)
                            .header(header::ACCEPT_RANGES, "bytes")
                            .header(
                                header::CONTENT_RANGE,
                                format!("bytes {}-{}/{}", start, actual_end, total_size),
                            )
                            .header(header::CONTENT_LENGTH, data.len().to_string())
                            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin),
                        etag.as_deref(),
                    );
                    return safe_response(builder, data);
                }
                Err(e) => {
                    return safe_error_response(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        &cors_origin,
                        &e,
                    );
                }
            }
        }
    }

    // Read entire file when Range header is absent
    match read_chunked_range(&abs_path, &master_key, 0, total_size - 1) {
        Ok(DecryptedRange { data, .. }) => {
            let mime_type = get_mime_type(&abs_path);
            let builder = apply_cache_headers(
                Response::builder()
                    .status(StatusCode::OK)
                    .header(header::CONTENT_TYPE, mime_type)
                    .header(header::ACCEPT_RANGES, "bytes")
                    .header(header::CONTENT_LENGTH, data.len().to_string())
                    .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, &cors_origin),
                etag.as_deref(),
            );
            safe_response(builder, data)
        }
        Err(e) => safe_error_response(StatusCode::INTERNAL_SERVER_ERROR, &cors_origin, &e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_headers_require_revalidation_and_disable_error_caching() {
        assert!(ENCRYPTED_CACHE_CONTROL.contains("no-cache"));
        assert!(ENCRYPTED_CACHE_CONTROL.contains("private"));
        assert!(!ENCRYPTED_CACHE_CONTROL.contains("max-age=300"));

        let err_res = safe_error_response(StatusCode::UNAUTHORIZED, "http://localhost", "Locked");
        assert_eq!(
            err_res
                .headers()
                .get(header::CACHE_CONTROL)
                .and_then(|v| v.to_str().ok()),
            Some("no-store")
        );
    }

    #[test]
    fn etag_matching_handles_strong_weak_lists_and_wildcard() {
        let etag = "\"1234-1700000000-42\"";
        assert!(if_none_match_matches(Some(etag), etag));
        assert!(if_none_match_matches(
            Some("W/\"1234-1700000000-42\""),
            etag
        ));
        assert!(if_none_match_matches(
            Some("\"other\", \"1234-1700000000-42\""),
            etag
        ));
        assert!(if_none_match_matches(Some("*"), etag));
        assert!(!if_none_match_matches(Some("\"different\""), etag));
        assert!(!if_none_match_matches(None, etag));
    }

    #[test]
    fn compute_file_etag_reflects_file_size_changes() {
        let path = std::env::temp_dir().join(format!("caderno_etag_{}.bin", uuid::Uuid::new_v4()));
        std::fs::write(&path, b"hello").unwrap();
        let tag1 = compute_file_etag(&path).expect("etag 1");

        std::fs::write(&path, b"hello world!").unwrap();
        let tag2 = compute_file_etag(&path).expect("etag 2");

        assert_ne!(tag1, tag2);
        let _ = std::fs::remove_file(&path);
    }
}
