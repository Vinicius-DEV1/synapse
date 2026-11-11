use crate::cmd_audio_lofi::{get_lofi_dir, sanitize_filename};
use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::Aes256Gcm;
use futures_util::StreamExt;
use tauri::{AppHandle, Emitter, State};
use tokio::io::AsyncWriteExt;

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
    if bytes.len() >= 4
        && bytes[0] == 0x1A
        && bytes[1] == 0x45
        && bytes[2] == 0xDF
        && bytes[3] == 0xA3
    {
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
    cipher
        .decrypt(nonce, ciphertext_with_tag)
        .map_err(|e| format!("Decryption failed: {:?}", e))
}

#[tauri::command]
pub async fn lofi_download_drive_file(
    drive_id: String,
    access_token: String,
    dest_filename: String,
    db_state: State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let lofi_dir = get_lofi_dir(&app)?;
    let safe_filename = sanitize_filename(&dest_filename);
    let filename_enc = format!("{}.enc", safe_filename);
    let final_path = lofi_dir.join(&filename_enc);
    let temp_path = lofi_dir.join(format!("{}.tmp", uuid::Uuid::new_v4()));

    let url = format!(
        "https://www.googleapis.com/drive/v3/files/{}?alt=media",
        drive_id
    );
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header(
            reqwest::header::AUTHORIZATION,
            format!("Bearer {}", access_token),
        )
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Drive download failed: HTTP {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut stream = response.bytes_stream();
    let mut file = tokio::fs::File::create(&temp_path)
        .await
        .map_err(|e| e.to_string())?;

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
                let _ = app.emit(
                    "lofi_download_progress",
                    serde_json::json!({
                        "driveId": drive_id,
                        "percent": percent
                    }),
                );
            }
        }
    }

    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

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
        if final_path.exists() {
            let _ = std::fs::remove_file(&final_path);
        }
        std::fs::rename(&temp_path, &final_path).map_err(|e| e.to_string())?;
    } else {
        let keys_guard = db_state.lock_keys()?;
        let unlocked_keys = keys_guard.as_ref().ok_or("Keys not unlocked")?;
        let focus_key = unlocked_keys
            .focus
            .clone()
            .ok_or("Focus key not found")?;

        if is_raw_audio {
            if final_path.exists() {
                let _ = std::fs::remove_file(&final_path);
            }
            if let Err(e) = crate::crypto_stream::encrypt_file_chunked(
                &temp_path,
                &final_path,
                &focus_key,
            ) {
                let _ = std::fs::remove_file(&temp_path);
                return Err(e);
            }
            let _ = std::fs::remove_file(&temp_path);
        } else {
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
                let plain_temp_path =
                    lofi_dir.join(format!("{}.plain.tmp", uuid::Uuid::new_v4()));
                std::fs::write(&plain_temp_path, plain_bytes).map_err(|e| e.to_string())?;
                if final_path.exists() {
                    let _ = std::fs::remove_file(&final_path);
                }
                let enc_res = crate::crypto_stream::encrypt_file_chunked(
                    &plain_temp_path,
                    &final_path,
                    &focus_key,
                );
                let _ = std::fs::remove_file(&plain_temp_path);
                let _ = std::fs::remove_file(&temp_path);
                enc_res?;
            } else {
                if final_path.exists() {
                    let _ = std::fs::remove_file(&final_path);
                }
                if let Err(e) = crate::crypto_stream::encrypt_file_chunked(
                    &temp_path,
                    &final_path,
                    &focus_key,
                ) {
                    let _ = std::fs::remove_file(&temp_path);
                    return Err(e);
                }
                let _ = std::fs::remove_file(&temp_path);
            }
        }
    }

    let _ = app.emit(
        "lofi_download_progress",
        serde_json::json!({
            "driveId": drive_id,
            "percent": 100
        }),
    );

    Ok(final_path.to_string_lossy().to_string())
}
