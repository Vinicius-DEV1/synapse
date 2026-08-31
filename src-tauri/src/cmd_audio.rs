use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Emitter};
use futures_util::StreamExt;
use tokio::io::AsyncWriteExt;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[tauri::command]
pub async fn lofi_download_drive_file(
    drive_id: String,
    access_token: String,
    dest_filename: String,
    db_state: tauri::State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let lofi_dir = get_lofi_dir(&app)?;
    let safe_filename = sanitize_filename(&dest_filename);
    let filename_enc = format!("{}.enc", safe_filename);
    let final_path = lofi_dir.join(&filename_enc);
    let temp_path = lofi_dir.join(format!("{}.tmp", uuid::Uuid::new_v4()));

    let url = format!("https://www.googleapis.com/drive/v3/files/{}?alt=media", drive_id);
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header(reqwest::header::AUTHORIZATION, format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Drive download failed: HTTP {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut stream = response.bytes_stream();
    let mut file = tokio::fs::File::create(&temp_path).await.map_err(|e| e.to_string())?;

    let mut downloaded: u64 = 0;
    let mut last_percent = 0;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;

        downloaded += chunk.len() as u64;
        if total_size > 0 {
            let percent = ((downloaded as f64 / total_size as f64) * 100.0) as i32;
            if percent > last_percent {
                last_percent = percent;
                let _ = app.emit("lofi_download_progress", serde_json::json!({
                    "driveId": drive_id,
                    "percent": percent
                }));
            }
        }
    }

    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    // Check if downloaded file starts with ENC1 header
    let is_enc1 = match std::fs::File::open(&temp_path) {
        Ok(mut f) => {
            use std::io::Read;
            let mut buf = [0u8; 4];
            f.read_exact(&mut buf).is_ok() && &buf == b"ENC1"
        }
        Err(_) => false,
    };

    if is_enc1 {
        // Already chunk-encrypted: move directly to final destination
        if final_path.exists() {
            let _ = std::fs::remove_file(&final_path);
        }
        std::fs::rename(&temp_path, &final_path).map_err(|e| e.to_string())?;
    } else {
        // Raw audio: encrypt using focus module key
        let keys_guard = db_state.keys.lock().unwrap();
        let master_key = if let Some(keys) = keys_guard.as_ref() {
            if let Some(ref k) = keys.focus {
                k.clone()
            } else {
                let _ = std::fs::remove_file(&temp_path);
                return Err("Focus key not found".into());
            }
        } else {
            let _ = std::fs::remove_file(&temp_path);
            return Err("Keys not unlocked".into());
        };

        if let Err(e) = crate::crypto_stream::encrypt_file_chunked(&temp_path, &final_path, &master_key) {
            let _ = std::fs::remove_file(&temp_path);
            return Err(e);
        }

        let _ = std::fs::remove_file(&temp_path);
    }

    let _ = app.emit("lofi_download_progress", serde_json::json!({
        "driveId": drive_id,
        "percent": 100
    }));

    Ok(final_path.to_string_lossy().to_string())
}



#[tauri::command]
pub async fn audio_extract_clip(
    video_path: String,
    start_time_ms: i32,
    end_time_ms: i32,
    db_state: tauri::State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let ffmpeg_path = crate::cmd_binaries::get_bin_path("ffmpeg");

    // Anki clips should go to the Anki directory
    let app_data_dir = crate::get_app_data_dir();
    let anki_dir = app_data_dir.join("anki");
    if !anki_dir.exists() {
        fs::create_dir_all(&anki_dir).map_err(|e| e.to_string())?;
    }

    let duration_ms = end_time_ms - start_time_ms;

    let start_sec = start_time_ms as f64 / 1000.0;
    let duration_sec = duration_ms as f64 / 1000.0;

    let out_filename = format!("clip_{}.mp3", uuid::Uuid::new_v4());
    let temp_path = anki_dir.join(&out_filename);
    let final_enc = anki_dir.join(format!("{}.enc", out_filename));

    let input_path = if video_path.ends_with(".enc") {
        let port = tauri::Manager::state::<crate::cmd_stream::StreamPortState>(&app).0;
        let fname = std::path::Path::new(&video_path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap();
        // Assume video is from culture module
        format!(
            "http://127.0.0.1:{}/stream?file=culture/{}",
            port,
            urlencoding::encode(fname)
        )
    } else {
        video_path.clone()
    };

    let mut cmd = Command::new(ffmpeg_path);
    cmd.args([
        "-y",
        "-i",
        &input_path,
        "-ss",
        &start_sec.to_string(),
        "-t",
        &duration_sec.to_string(),
        "-vn", // no video
        "-c:a",
        "libmp3lame",
        "-q:a",
        "2", // high quality VBR
        &temp_path.to_string_lossy().to_string(),
    ]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().map_err(|e| e.to_string())?;

    if output.status.success() || temp_path.exists() {
        let keys_guard = db_state.keys.lock().unwrap();
        let master_key = if let Some(keys) = keys_guard.as_ref() {
            if let Some(ref k) = keys.anki {
                k.clone()
            } else {
                return Err("Anki key not found".into());
            }
        } else {
            return Err("Keys not unlocked".into());
        };

        crate::crypto_stream::encrypt_file_chunked(&temp_path, &final_enc, &master_key)?;
        let _ = fs::remove_file(&temp_path);

        Ok(final_enc.to_string_lossy().to_string())
    } else {
        let _ = fs::remove_file(&temp_path);
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// Edge TTS placeholder implementation for frontend compatibility:
#[tauri::command]
pub async fn audio_generate_tts(
    _text: String,
    _lang: Option<String>,
    _app: AppHandle,
) -> Result<String, String> {
    // TODO: Implement direct WebSocket communication with Edge TTS.
    Err("Edge TTS via Rust not implemented yet. Wait for v2".to_string())
}

// Comandos Lofi (que eram no lofi.ts)
fn get_lofi_dir(_app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = crate::get_app_data_dir();
    let lofi_dir = app_data_dir.join("lofi");
    if !lofi_dir.exists() {
        fs::create_dir_all(&lofi_dir).map_err(|e| e.to_string())?;
    }
    Ok(lofi_dir)
}

#[tauri::command]
pub fn lofi_get_local_path(filename: String, app: AppHandle) -> Result<String, String> {
    let lofi_dir = get_lofi_dir(&app)?;
    let safe_filename = sanitize_filename(&filename);
    let path = lofi_dir.join(&safe_filename);
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
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(true)
}

#[tauri::command]
pub async fn lofi_save_local(
    filename: String,
    buffer: Vec<u8>,
    db_state: tauri::State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let lofi_dir = get_lofi_dir(&app)?;
    let safe_filename = sanitize_filename(&filename);
    let filename_enc = format!("{}.enc", safe_filename);
    let path = lofi_dir.join(&filename_enc);
    let temp_path = lofi_dir.join(format!("{}.tmp", uuid::Uuid::new_v4()));

    fs::write(&temp_path, buffer).map_err(|e| e.to_string())?;

    let keys_guard = db_state.keys.lock().unwrap();
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

    if let Err(e) = crate::crypto_stream::encrypt_file_chunked(&temp_path, &path, &master_key) {
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
    db_state: tauri::State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let lofi_dir = get_lofi_dir(&app)?;
    let filename_enc = format!("{}.enc", filename);
    let dest_path = lofi_dir.join(&filename_enc);

    let keys_guard = db_state.keys.lock().unwrap();
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

fn sanitize_filename(name: &str) -> String {
    std::path::Path::new(name)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unnamed_file")
        .to_string()
}
