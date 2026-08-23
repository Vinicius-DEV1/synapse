use std::fs;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncBufReadExt;
use crate::cmd_video::types::GenerateWebResult;
use crate::video_probe::{
    get_videos_dir, is_file_encrypted, normalize_to_mp4_name, video_probe_codec,
};
#[cfg(target_os = "windows")]
use crate::video_probe::CREATE_NO_WINDOW;

pub static VIDEO_CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

/// Cancels any currently running video conversion / transcoding process.
#[tauri::command]
pub fn video_cancel_conversion() -> Result<bool, String> {
    VIDEO_CANCEL_FLAG.store(true, Ordering::SeqCst);
    Ok(true)
}

/// Transcodes an input video to an optimized web-friendly MP4 format and encrypts the output.
#[tauri::command]
pub async fn video_generate_web(
    source_path: String,
    dest_filename: String,
    web_quality: String,
    conversion_preset: String,
    duration: f64,
    db_state: tauri::State<'_, crate::db::DbState>,
    app_handle: AppHandle,
) -> Result<GenerateWebResult, String> {
    VIDEO_CANCEL_FLAG.store(false, Ordering::SeqCst);

    let videos_dir = get_videos_dir(&app_handle)?;
    let norm_filename = normalize_to_mp4_name(&dest_filename);

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

    let web_filename_enc = format!("{}_web.mp4.enc", norm_filename.trim_end_matches(".mp4"));
    let web_full_path = videos_dir.join(&web_filename_enc);
    let temp_web_mp4 = videos_dir.join(format!("temp_web_{}.mp4", uuid::Uuid::new_v4()));

    let full_source_path = videos_dir.join(&source_path);
    if !full_source_path.exists() {
        return Err("Source file not found locally.".into());
    }

    let input_path = if is_file_encrypted(&full_source_path) {
        let port = app_handle.state::<crate::cmd_stream::StreamPortState>().0;
        let filename = std::path::Path::new(&source_path)
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
        full_source_path.to_string_lossy().to_string()
    };

    let ffmpeg_path = crate::cmd_binaries::get_bin_path("ffmpeg");
    let mut cmd = tokio::process::Command::new(&ffmpeg_path);

    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(),
        input_path.clone(),
        "-movflags".to_string(),
        "+faststart".to_string(),
        "-map_chapters".to_string(),
        "-1".to_string(),
        "-sn".to_string(),
        "-dn".to_string(),
    ];

    let preset_str = conversion_preset.as_str();

    if web_quality == "remux" {
        let v_codec = video_probe_codec(&input_path, "v:0").unwrap_or_else(|_| "unknown".to_string());
        let a_codec = video_probe_codec(&input_path, "a:0").unwrap_or_default();

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
    if !status.success() || !temp_web_mp4.exists() {
        let _ = fs::remove_file(&temp_web_mp4);
        return Err(format!("Failed to transcode web video: {}", error_log));
    }

    crate::crypto_stream::encrypt_file_chunked(&temp_web_mp4, &web_full_path, &master_key)?;
    let _ = fs::remove_file(&temp_web_mp4);

    let web_size = fs::metadata(&web_full_path).map(|m| m.len()).unwrap_or(0);

    Ok(GenerateWebResult {
        web_path: web_full_path.to_string_lossy().to_string(),
        web_size,
    })
}

/// Converts/remuxes an input stream into an MP4 container and encrypts the result.
#[tauri::command]
pub async fn video_convert_mp4(
    source_path: String,
    filename: String,
    db_state: tauri::State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let ffmpeg_path = crate::cmd_binaries::get_bin_path("ffmpeg");
    let videos_dir = get_videos_dir(&app)?;

    let temp_dest = videos_dir.join(format!("temp_mp4_{}.mp4", uuid::Uuid::new_v4()));

    let mut final_dest = videos_dir.join(&filename);
    final_dest.set_extension("mp4.enc");
    let dest_path_str = final_dest.to_string_lossy().to_string();

    if final_dest.exists() {
        return Ok(dest_path_str);
    }

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

        Ok(dest_path_str)
    } else {
        let _ = fs::remove_file(&temp_dest);
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
