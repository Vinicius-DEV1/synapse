use futures_util::StreamExt;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;
use crate::video_probe::{get_videos_dir, sanitize_filename};

/// Downloads a video file from Google Drive via media stream and emits progress events.
#[tauri::command]
pub async fn video_download_drive_file(
    drive_id: String,
    access_token: String,
    dest_filename: String,
    app: AppHandle,
) -> Result<String, String> {
    let videos_dir = get_videos_dir(&app)?;
    let safe_filename = sanitize_filename(&dest_filename);
    let path = videos_dir.join(&safe_filename);

    let url = format!("https://www.googleapis.com/drive/v3/files/{}?alt=media", drive_id);
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Drive download failed: HTTP {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);

    let mut stream = response.bytes_stream();
    let mut file = tokio::fs::File::create(&path).await.map_err(|e| e.to_string())?;

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
                let _ = app.emit("video_download_progress", percent);
            }
        }
    }

    Ok(path.to_string_lossy().to_string())
}

/// Uploads a local file directly to Google Drive without passing bytes through the WebView IPC.
/// Steps:
///   1. POST metadata to create an empty file in Drive
///   2. PATCH the file content using uploadType=media with the file streamed from disk
/// Returns the Drive file ID.
#[tauri::command]
pub async fn video_upload_file_to_drive(
    local_path: String,
    drive_filename: String,
    folder_id: String,
    access_token: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let drive_api_url = "https://www.googleapis.com/drive/v3/files";

    // Step 1: Create empty file with metadata
    let metadata = serde_json::json!({
        "name": drive_filename,
        "parents": [folder_id]
    });

    let meta_res = client
        .post(drive_api_url)
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .header(CONTENT_TYPE, "application/json")
        .json(&metadata)
        .send()
        .await
        .map_err(|e| format!("Drive metadata request failed: {}", e))?;

    if !meta_res.status().is_success() {
        let status = meta_res.status();
        let body = meta_res.text().await.unwrap_or_default();
        return Err(format!(
            "Drive metadata creation failed ({}): {}",
            status, body
        ));
    }

    let meta_data: serde_json::Value = meta_res
        .json()
        .await
        .map_err(|e| format!("Failed to parse Drive metadata response: {}", e))?;

    let file_id = meta_data["id"]
        .as_str()
        .ok_or("Drive response missing 'id' field")?
        .to_string();

    // Step 2: Upload file content via PATCH with streaming body
    let file_bytes = tokio::fs::read(&local_path)
        .await
        .map_err(|e| format!("Failed to read local file '{}': {}", local_path, e))?;

    let upload_url = format!(
        "https://www.googleapis.com/upload/drive/v3/files/{}?uploadType=media",
        file_id
    );

    let upload_res = client
        .patch(&upload_url)
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .header(CONTENT_TYPE, "application/octet-stream")
        .body(file_bytes)
        .send()
        .await
        .map_err(|e| format!("Drive upload request failed: {}", e))?;

    if !upload_res.status().is_success() {
        let status = upload_res.status();
        let body = upload_res.text().await.unwrap_or_default();
        return Err(format!("Drive upload failed ({}): {}", status, body));
    }

    Ok(file_id)
}
