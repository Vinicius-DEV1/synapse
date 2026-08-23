use serde_json::Value;
use std::fs;
use std::process::Command;
use tauri::{AppHandle, Manager};
use crate::video_probe::{get_videos_dir, is_file_encrypted};
#[cfg(target_os = "windows")]
use crate::video_probe::CREATE_NO_WINDOW;

/// Probes an input video using ffprobe and returns full JSON metadata of audio, video, and subtitle streams.
#[tauri::command]
pub async fn video_scan_tracks(local_path: String, app: AppHandle) -> Result<Value, String> {
    let ffprobe_path = crate::cmd_binaries::get_bin_path("ffprobe");
    let videos_dir = get_videos_dir(&app)?;

    let input_path = if is_file_encrypted(&videos_dir.join(&local_path)) {
        let port = app.state::<crate::cmd_stream::StreamPortState>().0;
        let filename = std::path::Path::new(&local_path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap();
        format!(
            "http://127.0.0.1:{}/stream?file=culture/{}",
            port,
            urlencoding::encode(filename)
        )
    } else {
        local_path.clone()
    };

    let mut cmd = Command::new(ffprobe_path);
    cmd.args([
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        &input_path,
    ]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().map_err(|e| e.to_string())?;

    if output.status.success() {
        let json_str = String::from_utf8_lossy(&output.stdout);
        let val: Value = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
        Ok(val)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// Extracts a specific subtitle stream into WebVTT text format.
#[tauri::command]
pub async fn video_extract_subtitles(
    local_path: String,
    track_index: String,
    app: AppHandle,
) -> Result<String, String> {
    let ffmpeg_path = crate::cmd_binaries::get_bin_path("ffmpeg");
    let videos_dir = get_videos_dir(&app)?;
    let vtt_out_path = videos_dir.join(format!("temp_sub_{}.vtt", uuid::Uuid::new_v4()));
    let full_path = videos_dir.join(&local_path);

    let input_path = if is_file_encrypted(&full_path) {
        let port = app.state::<crate::cmd_stream::StreamPortState>().0;
        let filename = std::path::Path::new(&local_path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap();
        format!(
            "http://127.0.0.1:{}/stream?file=culture/{}",
            port,
            urlencoding::encode(filename)
        )
    } else {
        local_path.clone()
    };

    let mut cmd = Command::new(ffmpeg_path);
    cmd.args([
        "-y", // overwrite
        "-i",
        &input_path,
        "-map",
        &format!("0:s:{}", track_index.replace("0:s:", "")), // Ensure clean stream mapping
        "-c:s",
        "webvtt",
        &vtt_out_path.to_string_lossy().to_string(),
    ]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().map_err(|e| e.to_string())?;

    if output.status.success() || vtt_out_path.exists() {
        let content = fs::read(&vtt_out_path)
            .map(|bytes| String::from_utf8_lossy(&bytes).into_owned())
            .unwrap_or_default();
        let _ = fs::remove_file(&vtt_out_path);
        println!(
            "[DEBUG] Subtitles extracted successfully (size: {})",
            content.len()
        );
        Ok(content)
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        println!("[DEBUG] Failed to extract subtitles: {}", err);
        Err(err)
    }
}

/// Extracts an audio track to M4A (AAC 128k) and saves it encrypted.
#[tauri::command]
pub async fn video_extract_audio(
    local_path: String,
    track_index: String,
    db_state: tauri::State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let ffmpeg_path = crate::cmd_binaries::get_bin_path("ffmpeg");
    let videos_dir = get_videos_dir(&app)?;

    let track_clean = track_index.replace(":", "");
    let temp_audio = videos_dir.join(format!("temp_audio_{}.m4a", track_clean));
    let final_enc = videos_dir.join(format!("{}_{}.m4a.enc", uuid::Uuid::new_v4(), track_clean));

    let input_path = if is_file_encrypted(&videos_dir.join(&local_path)) {
        let port = app.state::<crate::cmd_stream::StreamPortState>().0;
        let filename = std::path::Path::new(&local_path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap();
        format!(
            "http://127.0.0.1:{}/stream?file=culture/{}",
            port,
            urlencoding::encode(filename)
        )
    } else {
        local_path.clone()
    };

    let mut cmd = Command::new(ffmpeg_path);
    cmd.args([
        "-y",
        "-i",
        &input_path,
        "-map",
        &track_index,
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        &temp_audio.to_string_lossy().to_string(),
    ]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().map_err(|e| e.to_string())?;

    if output.status.success() || temp_audio.exists() {
        let keys_guard = db_state.keys.lock().unwrap();
        let master_key = if let Some(keys) = keys_guard.as_ref() {
            if let Some(ref k) = keys.culture {
                k.clone()
            } else {
                return Err("Culture key not found".into());
            }
        } else {
            return Err("Keys not unlocked".into());
        };

        crate::crypto_stream::encrypt_file_chunked(&temp_audio, &final_enc, &master_key)?;
        let _ = fs::remove_file(&temp_audio);

        Ok(final_enc.to_string_lossy().to_string())
    } else {
        let _ = fs::remove_file(&temp_audio);
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// Remuxes video with selected audio/subtitle track as default and encrypts the output container.
#[tauri::command]
pub async fn video_remux_default_track(
    source_path: String,
    filename: String,
    track_index: String,
    db_state: tauri::State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let ffmpeg_path = crate::cmd_binaries::get_bin_path("ffmpeg");
    let videos_dir = get_videos_dir(&app)?;
    let temp_dest = videos_dir.join(format!("temp_remux_{}", filename));
    let final_dest = videos_dir.join(format!("{}.enc", filename));

    let input_path = if is_file_encrypted(&videos_dir.join(&source_path)) {
        let port = app.state::<crate::cmd_stream::StreamPortState>().0;
        let fname = std::path::Path::new(&source_path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap();
        format!(
            "http://127.0.0.1:{}/stream?file=culture/{}",
            port,
            urlencoding::encode(fname)
        )
    } else {
        source_path.clone()
    };

    let mut cmd = Command::new(ffmpeg_path);
    cmd.args([
        "-y",
        "-i",
        &input_path,
        "-map",
        "0:v",
        "-map",
        &track_index,
        "-map",
        "0:a",
        "-map",
        "0:s?",
        "-c",
        "copy",
        &temp_dest.to_string_lossy().to_string(),
    ]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().map_err(|e| e.to_string())?;

    if output.status.success() || temp_dest.exists() {
        let keys_guard = db_state.keys.lock().unwrap();
        let master_key = if let Some(keys) = keys_guard.as_ref() {
            if let Some(ref k) = keys.culture {
                k.clone()
            } else {
                return Err("Culture key not found".into());
            }
        } else {
            return Err("Keys not unlocked".into());
        };

        crate::crypto_stream::encrypt_file_chunked(&temp_dest, &final_dest, &master_key)?;
        let _ = fs::remove_file(&temp_dest);

        Ok(final_dest.to_string_lossy().to_string())
    } else {
        let _ = fs::remove_file(&temp_dest);
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
