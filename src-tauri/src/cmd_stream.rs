
use axum::{
    extract::{Query, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use axum::body::Body;
use axum::http::{header, StatusCode};
use serde::Deserialize;
use tauri::{AppHandle, Manager};
use tokio::net::TcpListener;
use tokio::process::Command;
use tower_http::cors::CorsLayer;
use crate::db::DbState;
use std::process::Stdio;
use tokio::io::AsyncWriteExt;
use tokio_util::io::ReaderStream;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Clone)]
pub struct StreamState {
    pub app_handle: AppHandle,
}

#[derive(Deserialize)]
pub struct StreamParams {
    pub file: String, // module/path.enc
    pub start: Option<f64>, // start time in seconds
}

#[derive(Deserialize)]
pub struct StreamDriveParams {
    pub file_id: String,
    pub token: String,
    pub module: String, // module name, e.g. culture
}

pub async fn start_stream_server(app: AppHandle) -> Result<u16, String> {
    let state = StreamState { app_handle: app };

    let app_router = Router::new()
        .route("/stream", get(stream_handler))
        .route("/stream-drive", get(stream_drive_handler))
        .with_state(state)
        .layer(CorsLayer::permissive());

    // bind to 127.0.0.1:0 to let OS choose an open port
    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|e| e.to_string())?;
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
    let app_data_dir = std::env::current_exe().unwrap().parent().unwrap().join("data");
    let videos_dir = app_data_dir.join("videos");
        
    let mut abs_path = videos_dir.join(&decoded_path);
    if !abs_path.exists() {
        let enc_path = std::path::PathBuf::from(format!("{}.enc", abs_path.to_string_lossy()));
        if enc_path.exists() {
            abs_path = enc_path;
        } else {
            return (StatusCode::NOT_FOUND, "File not found").into_response();
        }
    }

    // Pega a chave mestre do App State
    let db_state = state.app_handle.state::<DbState>();
    let master_key = {
        let guard = db_state.keys.lock().unwrap();
        match &*guard {
            Some(keys) => {
                match module_name {
                    "library" => keys.library.clone(),
                    "files" => keys.files.clone(),
                    "culture" => keys.culture.clone(),
                    _ => None,
                }
            }
            None => None,
        }
    };
    
    let master_key = match master_key {
        Some(k) => k,
        None => return (StatusCode::UNAUTHORIZED, "Unauthorized or module not found").into_response(),
    };

    // Lê o tamanho total do arquivo original a partir do cabeçalho ENC1
    // Usamos spawn_blocking porque read_chunked_range é sincrono
    let path_clone = abs_path.clone();
    let key_clone = master_key.clone();
    
    let info_res = tokio::task::spawn_blocking(move || {
        crate::crypto_stream::read_chunked_range(&path_clone, &key_clone, 0, 0)
    }).await.unwrap();

    let total_size = match info_res {
        Ok(res) => res.total_original_size,
        Err(_) => {
            // Se falhar (ex: arquivo não criptografado), pega o tamanho do arquivo real
            match std::fs::metadata(&abs_path) {
                Ok(m) => m.len(),
                Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get file metadata").into_response(),
            }
        }
    };

    let range_header = headers.get(header::RANGE).and_then(|h| h.to_str().ok());

    if let Some(range) = range_header {
        if range.starts_with("bytes=") {
            let parts: Vec<&str> = range.trim_start_matches("bytes=").split('-').collect();
            let start = parts[0].parse::<u64>().unwrap_or(0);
            let end = if parts.len() > 1 && !parts[1].is_empty() {
                parts[1].parse::<u64>().unwrap_or(total_size - 1)
            } else {
                total_size - 1
            };
            
            let path_clone2 = abs_path.clone();
            let key_clone2 = master_key.clone();
            
            let range_res = tokio::task::spawn_blocking(move || {
                crate::crypto_stream::read_chunked_range(&path_clone2, &key_clone2, start, end)
            }).await.unwrap();

            match range_res {
                Ok(decrypted) => {
                    let actual_end = start + decrypted.data.len() as u64 - 1;
                    let content_range = format!("bytes {}-{}/{}", start, actual_end, total_size);
                    
                    return axum::response::Response::builder()
                        .status(StatusCode::PARTIAL_CONTENT)
                        .header(header::CONTENT_TYPE, "video/mp4")
                        .header(header::ACCEPT_RANGES, "bytes")
                        .header(header::CONTENT_RANGE, content_range)
                        .header(header::CONTENT_LENGTH, decrypted.data.len().to_string())
                        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                        .body(Body::from(decrypted.data))
                        .unwrap();
                },
                Err(e) => {
                    return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
                }
            }
        }
    }

    // Sem cabeçalho de Range, envia o arquivo todo
    let path_clone3 = abs_path.clone();
    let key_clone3 = master_key.clone();
    
    let all_res = tokio::task::spawn_blocking(move || {
        crate::crypto_stream::read_chunked_range(&path_clone3, &key_clone3, 0, total_size - 1)
    }).await.unwrap();

    match all_res {
        Ok(decrypted) => {
            axum::response::Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "video/mp4")
                .header(header::CONTENT_LENGTH, decrypted.data.len().to_string())
                .header(header::ACCEPT_RANGES, "bytes")
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .body(Body::from(decrypted.data))
                .unwrap()
        },
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, e).into_response()
        }
    }
}

#[tauri::command]
pub fn video_get_stream_port(app: AppHandle) -> Result<u16, String> {
    // Buscamos o state guardado
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
            Some(keys) => {
                match params.module.as_str() {
                    "library" => keys.library.clone(),
                    "files" => keys.files.clone(),
                    "culture" => keys.culture.clone(),
                    _ => None,
                }
            }
            None => None,
        }
    };
    
    let master_key = match master_key {
        Some(k) => k,
        None => return (StatusCode::UNAUTHORIZED, "Unauthorized or module not found").into_response(),
    };
    
    let info_res = crate::crypto_stream::read_network_chunked_range_async(&params.file_id, &params.token, &master_key, 0, 0).await;
    
    let total_size = match info_res {
        Ok(res) => res.total_original_size,
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to read drive file info: {}", e)).into_response();
        }
    };
    
    let mut start = 0;
    let mut end = total_size - 1;
    
    if let Some(range_header) = headers.get(header::RANGE) {
        if let Ok(range_str) = range_header.to_str() {
            if range_str.starts_with("bytes=") {
                let ranges: Vec<&str> = range_str[6..].split('-').collect();
                if let Ok(s) = ranges[0].parse::<u64>() {
                    start = s;
                }
                if ranges.len() > 1 && !ranges[1].is_empty() {
                    if let Ok(e) = ranges[1].parse::<u64>() {
                        end = std::cmp::min(e, total_size - 1);
                    }
                }
            }
        }
    }
    
    if start >= total_size {
        return (
            StatusCode::RANGE_NOT_SATISFIABLE,
            [(header::CONTENT_RANGE, format!("bytes */{}", total_size))],
            "Requested range not satisfiable",
        ).into_response();
    }
    
    let chunk_res = crate::crypto_stream::read_network_chunked_range_async(
        &params.file_id,
        &params.token,
        &master_key,
        start,
        end
    ).await;
    
    match chunk_res {
        Ok(decrypted) => {
            let actual_len = decrypted.data.len();
            let actual_end = start + actual_len as u64 - 1;
            
            let mut headers_resp = axum::http::HeaderMap::new();
            headers_resp.insert(header::CONTENT_TYPE, "video/mp4".parse().unwrap());
            headers_resp.insert(header::ACCEPT_RANGES, "bytes".parse().unwrap());
            headers_resp.insert(header::CONTENT_LENGTH, actual_len.to_string().parse().unwrap());
            headers_resp.insert(
                header::CONTENT_RANGE,
                format!("bytes {}-{}/{}", start, actual_end, total_size).parse().unwrap()
            );
            headers_resp.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*".parse().unwrap());
            
            (StatusCode::PARTIAL_CONTENT, headers_resp, decrypted.data).into_response()
        },
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, e).into_response()
        }
    }
}
