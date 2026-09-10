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

#[derive(serde::Serialize)]
pub struct VideoStorageStats {
    pub original_path: Option<String>,
    pub original_size: Option<u64>,
    pub web_path: Option<String>,
    pub web_size: Option<u64>,
    pub audio_sizes: std::collections::HashMap<String, u64>,
    pub subtitle_sizes: std::collections::HashMap<String, u64>,
    pub total_local_size: u64,
}

/// Retrieves the absolute filesystem path for a locally stored video file (with enc and debug fallback).
#[tauri::command]
pub fn video_get_local_path(filename: String, app: AppHandle) -> Result<String, String> {
    let videos_dir = get_videos_dir(&app)?;
    let safe_filename = sanitize_filename(&filename);

    // 1. Direct match
    let path = videos_dir.join(&safe_filename);
    if path.exists() {
        return Ok(path.to_string_lossy().to_string());
    }

    // 2. Encrypted variant
    let enc_path = videos_dir.join(format!("{}.enc", safe_filename));
    if enc_path.exists() {
        return Ok(enc_path.to_string_lossy().to_string());
    }

    // 3. Stripped enc variant
    if safe_filename.ends_with(".enc") {
        let stripped = safe_filename.trim_end_matches(".enc");
        let p = videos_dir.join(stripped);
        if p.exists() {
            return Ok(p.to_string_lossy().to_string());
        }
    }

    // 4. Web version variant
    let stem = std::path::Path::new(&safe_filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(&safe_filename);
    let web_enc = videos_dir.join(format!("{}_web.mp4.enc", stem));
    if web_enc.exists() {
        return Ok(web_enc.to_string_lossy().to_string());
    }
    let web_path = videos_dir.join(format!("{}_web.mp4", stem));
    if web_path.exists() {
        return Ok(web_path.to_string_lossy().to_string());
    }

    // 5. Fallback: Search release folder when executing in debug mode
    if let Some(parent) = videos_dir.parent() {
        if let Some(grandparent) = parent.parent() {
            if let Some(greatgrandparent) = grandparent.parent() {
                let release_path = greatgrandparent
                    .join("release")
                    .join("data")
                    .join("videos")
                    .join(&safe_filename);
                if release_path.exists() {
                    return Ok(release_path.to_string_lossy().to_string());
                }
                let release_enc = greatgrandparent
                    .join("release")
                    .join("data")
                    .join("videos")
                    .join(format!("{}.enc", safe_filename));
                if release_enc.exists() {
                    return Ok(release_enc.to_string_lossy().to_string());
                }
            }
        }
    }

    Ok("".to_string())
}

/// Computes accurate file sizes on disk for all variants of a video (original, web, audios, subtitles).
#[tauri::command]
pub fn video_get_storage_stats(
    filename: String,
    audio_tracks: Option<Vec<String>>,
    subtitle_tracks: Option<Vec<String>>,
    app: AppHandle,
) -> Result<VideoStorageStats, String> {
    let videos_dir = get_videos_dir(&app)?;
    let safe_filename = sanitize_filename(&filename);

    let mut total_size = 0u64;

    // 1. Original file
    let mut original_path = None;
    let mut original_size = None;
    let direct_orig = videos_dir.join(&safe_filename);
    let enc_orig = videos_dir.join(format!("{}.enc", safe_filename));
    if direct_orig.exists() {
        if let Ok(meta) = fs::metadata(&direct_orig) {
            original_size = Some(meta.len());
            total_size += meta.len();
            original_path = Some(direct_orig.to_string_lossy().to_string());
        }
    } else if enc_orig.exists() {
        if let Ok(meta) = fs::metadata(&enc_orig) {
            original_size = Some(meta.len());
            total_size += meta.len();
            original_path = Some(enc_orig.to_string_lossy().to_string());
        }
    }

    // 2. Web version
    let mut web_path = None;
    let mut web_size = None;
    let stem = std::path::Path::new(&safe_filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(&safe_filename);
    let direct_web = videos_dir.join(format!("{}_web.mp4", stem));
    let enc_web = videos_dir.join(format!("{}_web.mp4.enc", stem));
    if direct_web.exists() {
        if let Ok(meta) = fs::metadata(&direct_web) {
            web_size = Some(meta.len());
            total_size += meta.len();
            web_path = Some(direct_web.to_string_lossy().to_string());
        }
    } else if enc_web.exists() {
        if let Ok(meta) = fs::metadata(&enc_web) {
            web_size = Some(meta.len());
            total_size += meta.len();
            web_path = Some(enc_web.to_string_lossy().to_string());
        }
    }

    // 3. Audio track sizes
    let mut audio_sizes = std::collections::HashMap::new();
    if let Some(audios) = audio_tracks {
        for a in audios {
            let a_safe = sanitize_filename(&a);
            let a_file = videos_dir.join(&a_safe);
            let a_enc = videos_dir.join(format!("{}.enc", a_safe));
            if a_file.exists() {
                if let Ok(m) = fs::metadata(&a_file) {
                    audio_sizes.insert(a.clone(), m.len());
                    total_size += m.len();
                }
            } else if a_enc.exists() {
                if let Ok(m) = fs::metadata(&a_enc) {
                    audio_sizes.insert(a.clone(), m.len());
                    total_size += m.len();
                }
            }
        }
    }

    // 4. Subtitle track sizes
    let mut subtitle_sizes = std::collections::HashMap::new();
    if let Some(subs) = subtitle_tracks {
        for s in subs {
            let s_safe = sanitize_filename(&s);
            let s_file = videos_dir.join(&s_safe);
            let s_enc = videos_dir.join(format!("{}.enc", s_safe));
            if s_file.exists() {
                if let Ok(m) = fs::metadata(&s_file) {
                    subtitle_sizes.insert(s.clone(), m.len());
                    total_size += m.len();
                }
            } else if s_enc.exists() {
                if let Ok(m) = fs::metadata(&s_enc) {
                    subtitle_sizes.insert(s.clone(), m.len());
                    total_size += m.len();
                }
            }
        }
    }

    Ok(VideoStorageStats {
        original_path,
        original_size,
        web_path,
        web_size,
        audio_sizes,
        subtitle_sizes,
        total_local_size: total_size,
    })
}

/// Reveals a file or directory in the native desktop file manager.
#[tauri::command]
pub fn os_show_in_folder(path: String, app: AppHandle) -> Result<bool, String> {
    let mut target_path = std::path::PathBuf::from(&path);

    // If given just a filename, resolve against videos_dir
    if !target_path.exists() {
        if let Ok(videos_dir) = get_videos_dir(&app) {
            let direct = videos_dir.join(&path);
            let enc = videos_dir.join(format!("{}.enc", path));
            if direct.exists() {
                target_path = direct;
            } else if enc.exists() {
                target_path = enc;
            }
        }
    }

    if !target_path.exists() {
        return Err(format!("Caminho não encontrado: {}", path));
    }

    let folder = if target_path.is_dir() {
        target_path.clone()
    } else {
        target_path.parent().unwrap_or(&target_path).to_path_buf()
    };

    #[cfg(target_os = "windows")]
    {
        if target_path.is_file() {
            std::process::Command::new("explorer")
                .args(["/select,", &target_path.to_string_lossy()])
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            std::process::Command::new("explorer")
                .arg(&folder)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    #[cfg(target_os = "macos")]
    {
        if target_path.is_file() {
            std::process::Command::new("open")
                .args(["-R", &target_path.to_string_lossy()])
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            std::process::Command::new("open")
                .arg(&folder)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&folder)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(true)
}

/// Reads a local video or subtitle file into memory with a 50MB safety limit to avoid WebView IPC OOM.
#[tauri::command]
pub fn video_read_file(path: String, app: AppHandle) -> Result<Vec<u8>, String> {
    let videos_dir = get_videos_dir(&app)?;
    let app_data_dir = crate::get_app_data_dir();

    let mut file_path = std::path::PathBuf::from(&path);
    if !file_path.exists() {
        let direct = videos_dir.join(&path);
        let enc = videos_dir.join(format!("{}.enc", path));
        if direct.exists() {
            file_path = direct;
        } else if enc.exists() {
            file_path = enc;
        }
    }

    let canonical = file_path
        .canonicalize()
        .map_err(|e| format!("Arquivo não encontrado ({:?}): {}", file_path, e))?;

    let canonical_videos = videos_dir.canonicalize().unwrap_or(videos_dir);
    let canonical_app_data = app_data_dir.canonicalize().unwrap_or(app_data_dir);

    if !canonical.starts_with(&canonical_videos) && !canonical.starts_with(&canonical_app_data) {
        return Err("Acesso negado: o arquivo está fora dos diretórios autorizados".into());
    }

    if !canonical.is_file() {
        return Err("O caminho especificado não é um arquivo válido".into());
    }

    // Safety: limit to 50 MB to prevent OOM crash via IPC for large video files
    let metadata = fs::metadata(&canonical).map_err(|e| e.to_string())?;
    if metadata.len() > 50 * 1024 * 1024 {
        return Err(
            "File too large to read via IPC. Use video_upload_file_to_drive instead.".into(),
        );
    }
    fs::read(&canonical).map_err(|e| e.to_string())
}

/// Deletes a local video file from the application's video storage directory.
#[tauri::command]
pub fn video_delete_local(filename: String, app: AppHandle) -> Result<bool, String> {
    let videos_dir = get_videos_dir(&app)?;
    let safe_filename = sanitize_filename(&filename);
    
    // 1. Direct path
    let path = videos_dir.join(&safe_filename);
    if path.exists() {
        let _ = fs::remove_file(&path);
    }

    // 2. Encrypted variant (.enc)
    if !safe_filename.ends_with(".enc") {
        let enc_path = videos_dir.join(format!("{}.enc", safe_filename));
        if enc_path.exists() {
            let _ = fs::remove_file(&enc_path);
        }
    }

    // 3. Web version variants (e.g. video_web.mp4 and video_web.mp4.enc)
    let stem = std::path::Path::new(&safe_filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(&safe_filename);
    let web_name = format!("{}_web.mp4", stem);
    let web_path = videos_dir.join(&web_name);
    if web_path.exists() {
        let _ = fs::remove_file(&web_path);
    }
    let web_enc_path = videos_dir.join(format!("{}.enc", web_name));
    if web_enc_path.exists() {
        let _ = fs::remove_file(&web_enc_path);
    }

    println!("\x1b[1;36m[CADERNO VIDEO]\x1b[0m 🗑️  \x1b[1;33mArquivos locais excluídos para:\x1b[0m {}", safe_filename);
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
    let safe_dest_filename = sanitize_filename(&dest_filename);
    let dest_filename_enc = format!("{}.enc", safe_dest_filename);
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
    primary_audio_track: Option<String>,
    db_state: tauri::State<'_, crate::db::DbState>,
    app_handle: AppHandle,
) -> Result<ProcessUploadResult, String> {
    VIDEO_CANCEL_FLAG.store(false, Ordering::SeqCst);

    let videos_dir = get_videos_dir(&app_handle)?;
    let safe_dest_filename = sanitize_filename(&dest_filename);
    let norm_filename = normalize_to_mp4_name(&safe_dest_filename);
    let dest_filename_enc = format!("{}.enc", safe_dest_filename);
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

        let selected_audio = primary_audio_track.unwrap_or_else(|| "0:a:0".to_string());
        println!("\x1b[1;36m[CADERNO VIDEO]\x1b[0m 🎬 \x1b[1;32mTranscodificando versão Web:\x1b[0m Vídeo: \x1b[33m0:v:0\x1b[0m | Áudio Principal: \x1b[1;33m{}\x1b[0m | Qualidade: \x1b[35m{}\x1b[0m", selected_audio, web_quality);

        let mut args = vec![
            "-y".to_string(),
            "-i".to_string(),
            source_path.clone(),
            "-map".to_string(),
            "0:v:0".to_string(),
            "-map".to_string(),
            selected_audio,
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
                args.push("-ac".to_string());
                args.push("2".to_string());
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
                "-ac".to_string(),
                "2".to_string(),
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

        println!("\x1b[1;36m[CADERNO VIDEO]\x1b[0m ⚙️  \x1b[34mExecutando FFmpeg com argumentos:\x1b[0m {:?}", args);
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
            if !line.contains("frame=") && !line.contains("size=") {
                println!("\x1b[1;35m[FFMPEG]\x1b[0m {}", line);
            }

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
