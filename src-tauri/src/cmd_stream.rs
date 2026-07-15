use std::net::SocketAddr;
use std::sync::Arc;
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

#[derive(Clone)]
pub struct StreamState {
    pub app_handle: AppHandle,
}

#[derive(Deserialize)]
pub struct StreamParams {
    pub file: String, // module/path.enc
    pub start: Option<f64>, // start time in seconds
}

pub async fn start_stream_server(app: AppHandle) -> Result<u16, String> {
    let state = StreamState { app_handle: app };

    let app_router = Router::new()
        .route("/stream", get(stream_handler))
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
    Query(params): Query<StreamParams>,
) -> impl IntoResponse {
    let uri_path = params.file;
    let start_time = params.start.unwrap_or(0.0);
    
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
        
    let mut abs_path = std::path::PathBuf::from(&decoded_path);
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

    // Pega o executável do ffmpeg
    let app_data_dir = std::env::current_exe().unwrap().parent().unwrap().join("data");
    let ffmpeg_path = app_data_dir.join("bin").join("ffmpeg.exe");
    
    if !ffmpeg_path.exists() {
        return (StatusCode::INTERNAL_SERVER_ERROR, "FFmpeg binary not found").into_response();
    }

    // Determina o tamanho total do arquivo
    let file_meta = std::fs::metadata(&abs_path);
    let total_size = match file_meta {
        Ok(m) => m.len(),
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get file metadata").into_response(),
    };

    // Verifica se o arquivo é criptografado (tem a assinatura ENC1)
    let is_encrypted = {
        use std::io::Read;
        if let Ok(mut f) = std::fs::File::open(&abs_path) {
            let mut buf = [0u8; 4];
            if f.read_exact(&mut buf).is_ok() {
                &buf == crate::crypto_stream::MAGIC_BYTES
            } else {
                false
            }
        } else {
            false
        }
    };

    // Spawn ffmpeg
    let mut cmd = Command::new(ffmpeg_path);
    
    // Configura ffmpeg para ler do stdin ou direto do arquivo
    cmd.arg("-hide_banner")
       .arg("-loglevel").arg("error");
       
    if is_encrypted {
        cmd.arg("-i").arg("pipe:0");
    } else {
        cmd.arg("-i").arg(&abs_path);
    }

    if start_time > 0.0 {
        cmd.arg("-ss").arg(format!("{}", start_time));
    }
    
    cmd.arg("-c:v").arg("copy")
       .arg("-c:a").arg("aac")
       .arg("-b:a").arg("128k")
       .arg("-f").arg("mp4")
       .arg("-movflags").arg("frag_keyframe+empty_moov+default_base_moof")
       .arg("pipe:1");

    if is_encrypted {
        cmd.stdin(Stdio::piped());
    } else {
        cmd.stdin(Stdio::null());
    }
    
    cmd.stdout(Stdio::piped())
       .stderr(Stdio::null());

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to spawn FFmpeg: {}", e)).into_response(),
    };

    let stdout = child.stdout.take().unwrap();

    if is_encrypted {
        let mut stdin = child.stdin.take().unwrap();
        // Uma task de fundo alimentará o FFmpeg descriptografando do arquivo aos poucos
        let path_clone = abs_path.clone();
        let key_clone = master_key.clone();
        
        tokio::spawn(async move {
            let chunk_size: u64 = 1024 * 1024; // 1MB chunks
            let mut offset = 0;
            
            while offset < total_size {
                let end = std::cmp::min(offset + chunk_size - 1, total_size - 1);
                
                let path_clone2 = path_clone.clone();
                let key_clone2 = key_clone.clone();
                
                let res = tokio::task::spawn_blocking(move || {
                    crate::crypto_stream::read_chunked_range(&path_clone2, &key_clone2, offset, end)
                }).await;

                match res {
                    Ok(Ok(decrypted)) => {
                        if let Err(_) = stdin.write_all(&decrypted.data).await {
                            break; // pipe broken
                        }
                    },
                    _ => break,
                }
                offset += chunk_size;
            }
        });
    }

    // O retorno para o axum:
    // O stream do stdout vai virar o body
    let stream = ReaderStream::new(stdout);
    let body = Body::from_stream(stream);

    let mut response = body.into_response();
    response.headers_mut().insert(header::CONTENT_TYPE, "video/mp4".parse().unwrap());
    response.headers_mut().insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*".parse().unwrap());
    response
}

#[tauri::command]
pub fn video_get_stream_port(app: AppHandle) -> Result<u16, String> {
    // Buscamos o state guardado
    let port_state = app.state::<StreamPortState>();
    Ok(port_state.0)
}

pub struct StreamPortState(pub u16);
