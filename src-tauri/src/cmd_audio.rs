use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Emitter};
use futures_util::StreamExt;
use tokio::io::AsyncWriteExt;
use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::Aes256Gcm;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn is_audio_magic(bytes: &[u8]) -> bool {
    if bytes.len() < 3 {
        return false;
    }
    // ID3
    if bytes[0] == 0x49 && bytes[1] == 0x44 && bytes[2] == 0x33 {
        return true;
    }
    // MP3 Sync Word (0xFF followed by 0xEx or 0xFx)
    if bytes.len() >= 2 && bytes[0] == 0xFF && (bytes[1] & 0xE0) == 0xE0 {
        return true;
    }
    // OggS
    if bytes.len() >= 4 && &bytes[0..4] == b"OggS" {
        return true;
    }
    // RIFF
    if bytes.len() >= 4 && &bytes[0..4] == b"RIFF" {
        return true;
    }
    // fLaC
    if bytes.len() >= 4 && &bytes[0..4] == b"fLaC" {
        return true;
    }
    // MP4 / M4A ('ftyp' at offset 4)
    if bytes.len() >= 8 && &bytes[4..8] == b"ftyp" {
        return true;
    }
    // WebM
    if bytes.len() >= 4 && bytes[0] == 0x1A && bytes[1] == 0x45 && bytes[2] == 0xDF && bytes[3] == 0xA3 {
        return true;
    }
    false
}

fn decrypt_single_chunk(key_hex: &str, data: &[u8]) -> Result<Vec<u8>, String> {
    if data.len() < 28 {
        return Err("Payload too short".into());
    }
    let key_bytes = hex::decode(key_hex).map_err(|e| e.to_string())?;
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".into());
    }
    let iv = &data[0..12];
    let ciphertext_with_tag = &data[12..];

    let cipher = Aes256Gcm::new(aes_gcm::aead::Key::<Aes256Gcm>::from_slice(&key_bytes));
    let nonce = aes_gcm::Nonce::from_slice(iv);
    cipher.decrypt(nonce, ciphertext_with_tag).map_err(|e| format!("Decryption failed: {:?}", e))
}

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

    // Read the first bytes of the downloaded temp file
    let mut header = [0u8; 16];
    let header_len = match std::fs::File::open(&temp_path) {
        Ok(mut f) => {
            use std::io::Read;
            f.read(&mut header).unwrap_or(0)
        }
        Err(_) => 0,
    };

    let is_enc1 = header_len >= 4 && &header[0..4] == b"ENC1";
    let is_raw_audio = is_audio_magic(&header[..header_len]);

    if is_enc1 {
        // Already chunk-encrypted: move directly to final destination
        if final_path.exists() {
            let _ = std::fs::remove_file(&final_path);
        }
        std::fs::rename(&temp_path, &final_path).map_err(|e| e.to_string())?;
    } else {
        let keys_guard = db_state.keys.lock().unwrap();
        let unlocked_keys = keys_guard.as_ref().ok_or("Keys not unlocked")?;
        let focus_key = unlocked_keys.focus.clone().ok_or("Focus key not found")?;

        if is_raw_audio {
            if final_path.exists() {
                let _ = std::fs::remove_file(&final_path);
            }
            if let Err(e) = crate::crypto_stream::encrypt_file_chunked(&temp_path, &final_path, &focus_key) {
                let _ = std::fs::remove_file(&temp_path);
                return Err(e);
            }
            let _ = std::fs::remove_file(&temp_path);
        } else {
            // Check for WebCrypto single-chunk encrypted payload
            let data = std::fs::read(&temp_path).map_err(|e| e.to_string())?;
            let mut keys_to_try: Vec<&str> = vec![&focus_key];
            if let Some(ref k) = unlocked_keys.core {
                keys_to_try.push(k.as_str());
            }
            if let Some(ref k) = unlocked_keys.notes {
                keys_to_try.push(k.as_str());
            }
            if let Some(ref k) = unlocked_keys.culture {
                keys_to_try.push(k.as_str());
            }

            let mut decrypted_data: Option<Vec<u8>> = None;
            for key in keys_to_try {
                if let Ok(dec) = decrypt_single_chunk(key, &data) {
                    decrypted_data = Some(dec);
                    break;
                }
            }

            if let Some(plain_bytes) = decrypted_data {
                let plain_temp_path = lofi_dir.join(format!("{}.plain.tmp", uuid::Uuid::new_v4()));
                std::fs::write(&plain_temp_path, plain_bytes).map_err(|e| e.to_string())?;
                if final_path.exists() {
                    let _ = std::fs::remove_file(&final_path);
                }
                let enc_res = crate::crypto_stream::encrypt_file_chunked(&plain_temp_path, &final_path, &focus_key);
                let _ = std::fs::remove_file(&plain_temp_path);
                let _ = std::fs::remove_file(&temp_path);
                enc_res?;
            } else {
                // Raw fallback
                if final_path.exists() {
                    let _ = std::fs::remove_file(&final_path);
                }
                if let Err(e) = crate::crypto_stream::encrypt_file_chunked(&temp_path, &final_path, &focus_key) {
                    let _ = std::fs::remove_file(&temp_path);
                    return Err(e);
                }
                let _ = std::fs::remove_file(&temp_path);
            }
        }
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
