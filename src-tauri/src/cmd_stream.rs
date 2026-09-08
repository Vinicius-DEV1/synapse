use crate::db::DbState;

use axum::http::{header, StatusCode};
use axum::{
    extract::{Query, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use serde::Deserialize;

use tauri::{AppHandle, Manager};
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Clone)]
pub struct StreamState {
    pub app_handle: AppHandle,
}

#[derive(Deserialize)]
pub struct StreamParams {
    pub file: String,       // module/path.enc
    pub _start: Option<f64>, // start time in seconds
}

#[derive(Deserialize)]
pub struct StreamDriveParams {
    pub file_id: String,
    pub token: String,
    pub module: String, // module name, e.g. culture
}

fn get_stream_cors_origin(headers: &axum::http::HeaderMap) -> String {
    if let Some(origin) = headers.get(header::ORIGIN).and_then(|v| v.to_str().ok()) {
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

pub async fn start_stream_server(app: AppHandle) -> Result<u16, String> {
    let state = StreamState { app_handle: app };

    let allowed_origins = [
        "tauri://localhost".parse::<axum::http::HeaderValue>().unwrap(),
        "http://tauri.localhost".parse::<axum::http::HeaderValue>().unwrap(),
        "http://localhost:35174".parse::<axum::http::HeaderValue>().unwrap(),
        "http://localhost:5173".parse::<axum::http::HeaderValue>().unwrap(),
        "http://localhost:1420".parse::<axum::http::HeaderValue>().unwrap(),
        "http://127.0.0.1:35174".parse::<axum::http::HeaderValue>().unwrap(),
        "http://127.0.0.1:5173".parse::<axum::http::HeaderValue>().unwrap(),
        "http://127.0.0.1:1420".parse::<axum::http::HeaderValue>().unwrap(),
    ];

    let cors = CorsLayer::new()
        .allow_origin(allowed_origins)
        .allow_methods([axum::http::Method::GET, axum::http::Method::OPTIONS])
        .allow_headers([header::RANGE, header::CONTENT_TYPE, header::AUTHORIZATION]);

    let app_router = Router::new()
        .route("/stream", get(stream_handler))
        .route("/stream-drive", get(stream_drive_handler))
        .with_state(state)
        .layer(cors);

    // bind to 127.0.0.1:0 to let OS choose an open port
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| e.to_string())?;
    let port = listener.local_addr().unwrap().port();

    tokio::spawn(async move {
        axum::serve(listener, app_router).await.unwrap();
    });

    Ok(port)
}

async fn stream_handler(
    State(state): State<StreamState>,
    headers: axum::http::HeaderMap,
    Query(params): Query<StreamParams>,
) -> impl IntoResponse {
    let uri_path = params.file;

    // Parse "module/caminho"
    let parts: Vec<&str> = uri_path.splitn(2, '/').collect();
    if parts.len() != 2 {
        return (StatusCode::BAD_REQUEST, "Invalid file format").into_response();
    }

    let module_name = parts[0];
    let file_path = parts[1];

    let decoded_path = urlencoding::decode(file_path)
        .unwrap_or(std::borrow::Cow::Borrowed(file_path))
        .to_string();
    let app_data_dir = crate::get_app_data_dir();
    let videos_dir = app_data_dir.join("videos");

    let mut abs_path = videos_dir.join(&decoded_path);
    if !abs_path.exists() {
        let enc_path = std::path::PathBuf::from(format!("{}.enc", abs_path.to_string_lossy()));
        if enc_path.exists() {
            abs_path = enc_path;
        } else {
            // Fallback lookup in release directory during debug builds
            if let Some(parent) = app_data_dir.parent() {
                if let Some(grandparent) = parent.parent() {
                    let release_dir = grandparent.join("release").join("data").join("videos");
                    let release_path = release_dir.join(&decoded_path);
                    let release_enc_path =
                        std::path::PathBuf::from(format!("{}.enc", release_path.to_string_lossy()));

                    if release_path.exists() {
                        abs_path = release_path;
                    } else if release_enc_path.exists() {
                        abs_path = release_enc_path;
                    } else {
                        return (StatusCode::NOT_FOUND, "File not found").into_response();
                    }
                } else {
                    return (StatusCode::NOT_FOUND, "File not found").into_response();
                }
            } else {
                return (StatusCode::NOT_FOUND, "File not found").into_response();
            }
        }
    }

    let canonical_base = match app_data_dir.canonicalize() {
        Ok(b) => b,
        Err(_) => app_data_dir.clone(),
    };

    let canon_path = match abs_path.canonicalize() {
        Ok(c) => c,
        Err(_) => return (StatusCode::NOT_FOUND, "File not found").into_response(),
    };

    let is_allowed = canon_path.starts_with(&canonical_base) || {
        app_data_dir
            .parent()
            .and_then(|p| p.parent())
            .map(|gp| gp.join("release").join("data"))
            .and_then(|r| r.canonicalize().ok())
            .map_or(false, |r| canon_path.starts_with(&r))
    };

    if !is_allowed || !canon_path.is_file() {
        return (StatusCode::FORBIDDEN, "Access denied").into_response();
    }
    abs_path = canon_path;

    // Pega a chave mestre do App State
    let db_state = state.app_handle.state::<DbState>();
    let master_key = {
        let guard = db_state.keys.lock().unwrap();
        match &*guard {
            Some(keys) => match module_name {
                "library" => keys.library.clone(),
                "files" => keys.files.clone(),
                "culture" => keys.culture.clone(),
                _ => None,
            },
            None => None,
        }
    };

    let master_key = match master_key {
        Some(k) => k,
        None => {
            return (StatusCode::UNAUTHORIZED, "Unauthorized or module not found").into_response()
        }
    };

    // Read total original file size from ENC1 header via spawn_blocking
    let path_clone = abs_path.clone();
    let key_clone = master_key.clone();

    let info_res = tokio::task::spawn_blocking(move || {
        crate::crypto_stream::read_chunked_range(&path_clone, &key_clone, 0, 0)
    })
    .await
    .unwrap();

    let total_size = match info_res {
        Ok(res) => res.total_original_size,
        Err(e) => {
            println!("[STREAM] Aviso: Falha ao ler cabecalho criptografado ({}). Usando tamanho do arquivo no disco.", e);
            match std::fs::metadata(&abs_path) {
                Ok(m) => m.len(),
                Err(e) => {
                    println!(
                        "[STREAM] Erro fatal: Nao foi possivel obter o tamanho do arquivo: {}",
                        e
                    );
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Failed to get file metadata",
                    )
                        .into_response();
                }
            }
        }
    };

    let range_header = headers.get(header::RANGE).and_then(|h| h.to_str().ok());
    println!(
        "[STREAM] Nova requisicao para: {} | Range: {:?}",
        uri_path, range_header
    );

    let mut start = 0;
    let mut end = total_size - 1;

    if let Some(range) = range_header {
        if range.starts_with("bytes=") {
            let parts: Vec<&str> = range.trim_start_matches("bytes=").split('-').collect();
            start = parts[0].parse::<u64>().unwrap_or(0);
            end = if parts.len() > 1 && !parts[1].is_empty() {
                parts[1].parse::<u64>().unwrap_or(total_size - 1)
            } else {
                total_size - 1
            };
        }
    }

    if start >= total_size {
        return (
            StatusCode::RANGE_NOT_SATISFIABLE,
            [(header::CONTENT_RANGE, format!("bytes */{}", total_size))],
            "Requested range not satisfiable",
        )
            .into_response();
    }

    // Clamp end boundary within total file size
    if end >= total_size {
        end = total_size - 1;
    }

    println!(
        "[STREAM] Servindo Range Parcial Stream: bytes {}-{} (Tamanho Total: {})",
        start, end, total_size
    );

    let content_range = format!("bytes {}-{}/{}", start, end, total_size);
    let content_length = (end - start + 1).to_string();

    let stream = async_stream::stream! {
        let mut current_start = start;
        let max_chunk_size = 2 * 1024 * 1024; // Lemos em pedaços de 2MB da RAM

        while current_start <= end {
            let current_end = std::cmp::min(current_start + max_chunk_size - 1, end);

            let path_clone = abs_path.clone();
            let key_clone = master_key.clone();

            let range_res = tokio::task::spawn_blocking(move || {
                crate::crypto_stream::read_chunked_range(&path_clone, &key_clone, current_start, current_end)
            }).await;

            match range_res {
                Ok(Ok(decrypted)) => {
                    yield Ok::<axum::body::Bytes, std::io::Error>(axum::body::Bytes::from(decrypted.data));
                },
                Ok(Err(e)) => {
                    println!("[STREAM] Erro de descriptografia no meio do stream: {}", e);
                    yield Err(std::io::Error::new(std::io::ErrorKind::Other, e));
                    break;
                },
                Err(e) => {
                    println!("[STREAM] Erro de spawn no meio do stream: {}", e);
                    yield Err(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()));
                    break;
                }
            }
            current_start = current_end + 1;
        }
    };

    let status = if range_header.is_some() {
        StatusCode::PARTIAL_CONTENT
    } else {
        StatusCode::OK
    };

    axum::response::Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "video/mp4")
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_RANGE, content_range)
        .header(header::CONTENT_LENGTH, content_length)
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, get_stream_cors_origin(&headers))
        .body(axum::body::Body::from_stream(stream))
        .unwrap()
}

#[tauri::command]
pub fn video_get_stream_port(app: AppHandle) -> Result<u16, String> {
    // Retrieve stored AppState
    let port_state = app.state::<StreamPortState>();
    Ok(port_state.0)
}

pub struct StreamPortState(pub u16);

async fn stream_drive_handler(
    State(state): State<StreamState>,
    headers: axum::http::HeaderMap,
    Query(params): Query<StreamDriveParams>,
) -> impl IntoResponse {
    let db_state = state.app_handle.state::<DbState>();
    let master_key = {
        let guard = db_state.keys.lock().unwrap();
        match &*guard {
            Some(keys) => match params.module.as_str() {
                "library" => keys.library.clone(),
                "files" => keys.files.clone(),
                "culture" => keys.culture.clone(),
                _ => None,
            },
            None => None,
        }
    };

    let master_key = match master_key {
        Some(k) => k,
        None => {
            return (StatusCode::UNAUTHORIZED, "Unauthorized or module not found").into_response()
        }
    };

    let info_res = crate::crypto_stream::read_network_chunked_range_async(
        &params.file_id,
        &params.token,
        &master_key,
        0,
        0,
    )
    .await;

    let total_size = match info_res {
        Ok(res) => res.total_original_size,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to read drive file info: {}", e),
            )
                .into_response();
        }
    };

    let mut start = 0;
    let mut end = total_size - 1;

    let range_header = headers.get(header::RANGE).and_then(|h| h.to_str().ok());

    if let Some(range_str) = range_header {
        if range_str.starts_with("bytes=") {
            let ranges: Vec<&str> = range_str[6..].split('-').collect();
            start = ranges[0].parse::<u64>().unwrap_or(0);
            end = if ranges.len() > 1 && !ranges[1].is_empty() {
                ranges[1].parse::<u64>().unwrap_or(total_size - 1)
            } else {
                total_size - 1
            };
        }
    }

    if start >= total_size {
        return (
            StatusCode::RANGE_NOT_SATISFIABLE,
            [(header::CONTENT_RANGE, format!("bytes */{}", total_size))],
            "Requested range not satisfiable",
        )
            .into_response();
    }

    if end >= total_size {
        end = total_size - 1;
    }

    let content_range = format!("bytes {}-{}/{}", start, end, total_size);
    let content_length = (end - start + 1).to_string();

    let stream = async_stream::stream! {
        let mut current_start = start;
        let max_chunk_size = 2 * 1024 * 1024; // Puxamos 2MB por vez da nuvem

        while current_start <= end {
            let current_end = std::cmp::min(current_start + max_chunk_size - 1, end);

            let chunk_res = crate::crypto_stream::read_network_chunked_range_async(
                &params.file_id,
                &params.token,
                &master_key,
                current_start,
                current_end
            ).await;

            match chunk_res {
                Ok(decrypted) => {
                    yield Ok::<axum::body::Bytes, std::io::Error>(axum::body::Bytes::from(decrypted.data));
                },
                Err(e) => {
                    yield Err(std::io::Error::new(std::io::ErrorKind::Other, e));
                    break;
                }
            }

            current_start = current_end + 1;
        }
    };

    let status = if range_header.is_some() {
        StatusCode::PARTIAL_CONTENT
    } else {
        StatusCode::OK
    };

    axum::response::Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "video/mp4")
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_RANGE, content_range)
        .header(header::CONTENT_LENGTH, content_length)
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, get_stream_cors_origin(&headers))
        .body(axum::body::Body::from_stream(stream))
        .unwrap()
}
