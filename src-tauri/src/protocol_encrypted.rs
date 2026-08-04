use tauri::http::{Request, Response, StatusCode, header};
use tauri::AppHandle;
use crate::crypto_stream::{read_chunked_range, DecryptedRange};
use crate::db::DbState;
use tauri::Manager;

fn get_mime_type(path: &std::path::Path) -> String {
    let path_for_mime = if path.to_string_lossy().ends_with(".enc") {
        path.with_extension("")
    } else {
        path.to_path_buf()
    };
    mime_guess::from_path(&path_for_mime).first_or_octet_stream().to_string()
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
        
    let mut abs_path = std::path::PathBuf::from(&decoded_path);
    
    if !abs_path.is_absolute() {
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                let app_data_dir = parent.join("data");
                let dir_name = match module_name {
                    "culture" => "videos",
                    "library" => "library",
                    "files" => "files",
                    "focus" => "lofi",
                    _ => module_name,
                };
                abs_path = app_data_dir.join(dir_name).join(abs_path);
            }
        }
    }
    
    if !abs_path.exists() {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .body(format!("File not found: {:?}", abs_path).into_bytes())
            .unwrap();
    }
    
    // Extrai a chave do estado
    let keys_guard = db_state.keys.lock().unwrap();
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
    
    // Lidar com cabeçalho Range (streaming)
    let range_header = request.headers().get("range").and_then(|v| v.to_str().ok());
    
    // Lê o tamanho total do arquivo original a partir do cabeçalho ENC1
    // Fazemos uma leitura fictícia de tamanho 0 para pegar o total_original_size
    let info = match read_chunked_range(&abs_path, &master_key, 0, 0) {
        Ok(res) => res,
        Err(e) => {
            return Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .body(e.into_bytes())
                .unwrap();
        }
    };
    
    let total_size = info.total_original_size;
    
    if let Some(range) = range_header {
        if range.starts_with("bytes=") {
            let parts: Vec<&str> = range.trim_start_matches("bytes=").split('-').collect();
            let start = parts[0].parse::<u64>().unwrap_or(0);
            let end = if parts.len() > 1 && !parts[1].is_empty() {
                parts[1].parse::<u64>().unwrap_or(total_size - 1)
            } else {
                total_size - 1
            };
            
            // Lê o range descriptografado
            match read_chunked_range(&abs_path, &master_key, start, end) {
                Ok(DecryptedRange { data, .. }) => {
                    let actual_end = start + data.len() as u64 - 1;
                    
                    let mime_type = get_mime_type(&abs_path);
                    
                    return Response::builder()
                        .status(StatusCode::PARTIAL_CONTENT)
                        .header(header::CONTENT_TYPE, mime_type)
                        .header(header::ACCEPT_RANGES, "bytes")
                        .header(header::CONTENT_RANGE, format!("bytes {}-{}/{}", start, actual_end, total_size))
                        .header(header::CONTENT_LENGTH, data.len().to_string())
                        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                        .body(data)
                        .unwrap();
                },
                Err(e) => {
                    return Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .body(e.into_bytes())
                        .unwrap();
                }
            }
        }
    }
    
    // Se não tiver cabeçalho de Range, lê o arquivo inteiro
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
        },
        Err(e) => {
            Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(e.into_bytes())
                .unwrap()
        }
    }
}
