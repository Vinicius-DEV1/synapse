use std::fs;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncBufReadExt;
use crate::cmd_video::transcode::VIDEO_CANCEL_FLAG;
use crate::cmd_video::types::ProcessUploadResult;
use crate::video_probe::{
    get_videos_dir, normalize_to_mp4_name, sanitize_filename, video_probe_codec,
};
#[cfg(target_os = "windows")]
use crate::video_probe::CREATE_NO_WINDOW;

/// Retrieves the absolute filesystem path for a locally stored video file (with debug fallback).
#[tauri::command]
pub fn video_get_local_path(filename: String, app: AppHandle) -> Result<String, String> {
    let videos_dir = get_videos_dir(&app)?;
    let safe_filename = sanitize_filename(&filename);
    let path = videos_dir.join(&safe_filename);
    if path.exists() {
        return Ok(path.to_string_lossy().to_string());
    }

    // Fallback: Search release folder when executing in debug mode
    if let Some(parent) = videos_dir.parent() {
        if let Some(grandparent) = parent.parent() {
            if let Some(greatgrandparent) = grandparent.parent() {
                let release_path = greatgrandparent
                    .join("release")
                    .join("data")
                    .join("videos")
                    .join(&filename);
                if release_path.exists() {
                    return Ok(release_path.to_string_lossy().to_string());
                }
            }
        }
    }

    Ok("".to_string())
}

/// Reads a local video file into memory with a 50MB safety limit to avoid WebView IPC OOM.
#[tauri::command]
pub fn video_read_file(path: String) -> Result<Vec<u8>, String> {
    // Safety: limit to 50 MB to prevent OOM crash via IPC for large video files
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    if metadata.len() > 50 * 1024 * 1024 {
        return Err(
            "File too large to read via IPC. Use video_upload_file_to_drive instead.".into(),
        );
    }
    fs::read(&path).map_err(|e| e.to_string())
}

/// Deletes a local video file from the application's video storage directory.
#[tauri::command]
pub fn video_delete_local(filename: String, app: AppHandle) -> Result<bool, String> {
    let videos_dir = get_videos_dir(&app)?;
    let safe_filename = sanitize_filename(&filename);
    let path = videos_dir.join(&safe_filename);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(true)
}

/// Imports an external video file, encrypts it with the Culture key and stores it locally.
#[tauri::command]
pub async fn video_import_and_encrypt(
    source_path: String,
    dest_filename: String,
    db_state: tauri::State<'_, crate::db::DbState>,
    app_handle: AppHandle,
) -> Result<String, String> {
    let videos_dir = get_videos_dir(&app_handle)?;
    let dest_filename_enc = format!("{}.enc", dest_filename);
    let dest_full_path = videos_dir.join(&dest_filename_enc);

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

    let actual_source = std::path::PathBuf::from(&source_path);

    let enc_res =
        crate::crypto_stream::encrypt_file_chunked(&actual_source, &dest_full_path, &master_key);
    enc_res?;

    Ok(dest_full_path.to_string_lossy().to_string())
}

/// Saves raw bytes directly into local encrypted video storage using an atomic temporary swap.
#[tauri::command]
pub async fn video_save_local(
    filename: String,
    buffer: Vec<u8>,
    _db_state: tauri::State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let videos_dir = get_videos_dir(&app)?;
    let safe_filename = sanitize_filename(&filename);
    let filename_enc = format!("{}.enc", safe_filename);
    let path = videos_dir.join(&filename_enc);
    let temp_path = videos_dir.join(format!("{}.tmp", uuid::Uuid::new_v4()));

    fs::write(&temp_path, buffer).map_err(|e| e.to_string())?;
    fs::rename(&temp_path, &path).map_err(|e| e.to_string())?;

    Ok(path.to_string_lossy().to_string())
}

/// Processes a video upload: encrypts the original file in the background and optionally transcodes an optimized web version.
#[tauri::command]
pub async fn video_process_upload(
    source_path: String,
    dest_filename: String,
    web_quality: String,
    conversion_preset: String,
    duration: f64,
    db_state: tauri::State<'_, crate::db::DbState>,
    app_handle: AppHandle,
) -> Result<ProcessUploadResult, String> {
    VIDEO_CANCEL_FLAG.store(false, Ordering::SeqCst);

    let videos_dir = get_videos_dir(&app_handle)?;
    let norm_filename = normalize_to_mp4_name(&dest_filename);
    let dest_filename_enc = format!("{}.enc", dest_filename);
    let dest_full_path = videos_dir.join(&dest_filename_enc);

    let master_key = {
        let keys_guard = db_state.keys.lock().unwrap();
        if let Some(keys) = keys_guard.as_ref() {
            if let Some(ref k) = keys.culture {
                k.clone()
            } else {
                return Err("Culture key not found".into());
            }
        } else {
            return Err("Keys not unlocked".into());
        }
    };

    let actual_source = std::path::PathBuf::from(&source_path);

    // Spawn encryption of original file in background
    let actual_source_clone = actual_source.clone();
    let dest_full_path_clone = dest_full_path.clone();
    let master_key_clone = master_key.clone();

    println!("[DEBUG] Starting background encryption task for original video file...");
    let encrypt_task = tokio::task::spawn_blocking(move || {
        crate::crypto_stream::encrypt_file_chunked(
            &actual_source_clone,
            &dest_full_path_clone,
            &master_key_clone,
        )
    });

    let web_path = if web_quality != "original" {
        let web_filename_enc = format!("{}_web.mp4.enc", norm_filename.trim_end_matches(".mp4"));
        let web_full_path = videos_dir.join(&web_filename_enc);
        let temp_web_mp4 = videos_dir.join(format!("temp_web_{}.mp4", uuid::Uuid::new_v4()));

        let ffmpeg_path = crate::cmd_binaries::get_bin_path("ffmpeg");
        let mut cmd = tokio::process::Command::new(&ffmpeg_path);

        let mut args = vec![
            "-y".to_string(),
            "-i".to_string(),
            source_path.clone(),
            "-movflags".to_string(),
            "+faststart".to_string(),
            "-map_chapters".to_string(),
            "-1".to_string(),
            "-sn".to_string(),
            "-dn".to_string(),
        ];

        let preset_str = conversion_preset.as_str();

        if web_quality == "remux" {
            let v_codec = video_probe_codec(&source_path, "v:0")?;
            let a_codec = video_probe_codec(&source_path, "a:0").unwrap_or_default();

            if v_codec != "h264" {
                return Err(format!(
                    "Fast Remux mode blocked: Original video format is {} and cannot play natively. Please choose 720p or 1080p conversion.",
                    v_codec.to_uppercase()
                ));
            }

            args.push("-c:v".to_string());
            args.push("copy".to_string());
            args.push("-c:a".to_string());

            if a_codec == "aac" {
                args.push("copy".to_string());
            } else {
                args.push("aac".to_string());
            }
        } else {
            let scale_val = match web_quality.as_str() {
                "1080p" => "scale=-2:1080",
                "720p" => "scale=-2:720",
                "480p" => "scale=-2:480",
                "360p" => "scale=-2:360",
                _ => "scale=-2:720",
            };

            args.extend(vec![
                "-c:v".to_string(),
                "libx264".to_string(),
                "-c:a".to_string(),
                "aac".to_string(),
                "-preset".to_string(),
                preset_str.to_string(),
                "-threads".to_string(),
                "0".to_string(),
                "-crf".to_string(),
                "23".to_string(),
                "-vf".to_string(),
                scale_val.to_string(),
            ]);
        }

        let temp_web_mp4_str = temp_web_mp4.to_string_lossy().into_owned();
        args.push(temp_web_mp4_str);

        cmd.args(&args);

        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        cmd.stdout(std::process::Stdio::null());
        cmd.stderr(std::process::Stdio::piped());

        println!("[DEBUG] Spawning FFmpeg child process...");
        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn FFmpeg: {}", e))?;

        let stderr = child.stderr.take().unwrap();
        let mut reader = tokio::io::BufReader::new(stderr).lines();

        let mut error_log = String::new();
        while let Ok(Some(line)) = reader.next_line().await {
            if VIDEO_CANCEL_FLAG.load(Ordering::SeqCst) {
                let _ = child.kill().await;
                let _ = fs::remove_file(&temp_web_mp4);
                return Err("Conversion cancelled by user.".into());
            }

            error_log.push_str(&line);
            error_log.push('\n');
            println!("[DEBUG] FFmpeg: {}", line);

            if line.contains("time=") {
                if let Some(time_idx) = line.find("time=") {
                    let time_str = &line[time_idx + 5..];
                    if time_str.len() >= 8 {
                        let parts: Vec<&str> = time_str[..8].split(':').collect();
                        if parts.len() == 3 {
                            if let (Ok(h), Ok(m), Ok(s)) = (
                                parts[0].parse::<f64>(),
                                parts[1].parse::<f64>(),
                                parts[2].parse::<f64>(),
                            ) {
                                let current_sec = h * 3600.0 + m * 60.0 + s;
                                if duration > 0.0 {
                                    let mut pct = (current_sec / duration) * 100.0;
                                    if pct > 100.0 {
                                        pct = 100.0;
                                    }
                                    let _ = app_handle.emit("video_upload_progress", pct);
                                }
                            }
                        }
                    }
                }
            }
        }

        let status = child.wait().await.map_err(|e| e.to_string())?;
        println!("[DEBUG] FFmpeg finished. Status: {}", status);
        if !status.success() || !temp_web_mp4.exists() {
            let _ = fs::remove_file(&temp_web_mp4);
            return Err(format!("Failed to transcode web video: {}", error_log));
        }

        println!(
            "[DEBUG] Starting encryption for web-optimized video ({:?})...",
            temp_web_mp4
        );
        crate::crypto_stream::encrypt_file_chunked(&temp_web_mp4, &web_full_path, &master_key)?;
        println!("[DEBUG] Web video encryption complete.");
        let _ = fs::remove_file(&temp_web_mp4);

        Some(web_full_path.to_string_lossy().to_string())
    } else {
        None
    };

    println!("[DEBUG] Awaiting background encryption task for original video...");
    let enc_res = encrypt_task.await.map_err(|e| e.to_string())?;
    println!("[DEBUG] Original video encryption future completed.");
    enc_res?;

    let original_size = fs::metadata(&dest_full_path).map(|m| m.len()).unwrap_or(0);

    let web_size = if let Some(ref w) = web_path {
        Some(fs::metadata(w).map(|m| m.len()).unwrap_or(0))
    } else {
        None
    };

    Ok(ProcessUploadResult {
        original_path: dest_full_path.to_string_lossy().to_string(),
        web_path,
        original_size,
        web_size,
    })
}
