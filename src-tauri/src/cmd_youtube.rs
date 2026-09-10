use serde_json::Value;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn get_videos_dir(_app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = crate::get_app_data_dir();
    let videos_dir = app_data_dir.join("videos");
    if !videos_dir.exists() {
        fs::create_dir_all(&videos_dir).map_err(|e| e.to_string())?;
    }
    Ok(videos_dir)
}

#[tauri::command]
pub async fn youtube_fetch_info(url: String, _app: AppHandle) -> Result<Value, String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid YouTube URL: must start with http:// or https://".into());
    }

    let ytdlp_path = crate::cmd_binaries::get_bin_path("yt-dlp");

    // spawning yt-dlp -j to get JSON info
    let mut cmd = Command::new(ytdlp_path);
    cmd.args(["-j", "--", &url]);
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

#[tauri::command]
pub async fn youtube_download(
    url: String,
    filename: String,
    quality: String,
    subs: Option<Vec<String>>,
    db_state: tauri::State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid YouTube URL: must start with http:// or https://".into());
    }

    // Validate quality format string to prevent CLI argument injection
    if !quality.is_empty()
        && !quality
            .chars()
            .all(|c| c.is_alphanumeric() || matches!(c, '_' | '+' | ',' | '/' | '.' | '-'))
    {
        return Err("Invalid video quality parameter".into());
    }

    let ytdlp_path = crate::cmd_binaries::get_bin_path("yt-dlp");
    let ffmpeg_dir = crate::cmd_binaries::get_bin_path("ffmpeg")
        .parent()
        .unwrap()
        .to_path_buf();
    let videos_dir = get_videos_dir(&app)?;

    let safe_filename = std::path::Path::new(&filename)
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_else(|| "video.mp4".into());
    let temp_filename = format!("temp_{}_{}", uuid::Uuid::new_v4(), safe_filename);
    let temp_path = videos_dir.join(&temp_filename);

    let mut args = vec![
        "-f".to_string(),
        quality,
        "-o".to_string(),
        temp_path.to_string_lossy().to_string(),
        "--ffmpeg-location".to_string(),
        ffmpeg_dir.to_string_lossy().to_string(),
    ];

    if let Some(sub_langs) = subs {
        let valid_langs: Vec<String> = sub_langs
            .into_iter()
            .filter(|l| l.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_'))
            .collect();
        if !valid_langs.is_empty() {
            let langs = valid_langs.join(",");
            args.push("--write-subs".to_string());
            args.push("--write-auto-subs".to_string());
            args.push("--sub-langs".to_string());
            args.push(langs);
            args.push("--embed-subs".to_string());
            args.push("--compat-options".to_string());
            args.push("no-keep-subs".to_string());
        }
    }

    args.push("--".to_string());
    args.push(url.clone());

    let mut child = Command::new(ytdlp_path);
    child.args(&args).stdout(Stdio::piped());
    #[cfg(target_os = "windows")]
    child.creation_flags(CREATE_NO_WINDOW);
    let mut child = child.spawn().map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let reader = BufReader::new(stdout);

    for line in reader.lines() {
        if let Ok(line_str) = line {
            // Progress parser (e.g. "[download] 45.0% of ...")
            if line_str.contains("[download]") && line_str.contains("%") {
                if let Some(pct_str) = line_str.split('%').next() {
                    let parts: Vec<&str> = pct_str.split_whitespace().collect();
                    if let Some(last) = parts.last() {
                        if let Ok(pct) = last.parse::<f64>() {
                            let _ = app.emit("youtube-download-progress", pct);
                        }
                    }
                }
            }
        }
    }

    let status = child.wait().map_err(|e| e.to_string())?;

    if status.success() {
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

        // Securely use sanitized filename to prevent path traversal outside videos directory
        let enc_dest_path = videos_dir.join(format!("{}.enc", safe_filename));
        crate::crypto_stream::encrypt_file_chunked(&temp_path, &enc_dest_path, &master_key)?;
        let _ = fs::remove_file(&temp_path);

        Ok(enc_dest_path.to_string_lossy().to_string())
    } else {
        let _ = fs::remove_file(&temp_path);
        Err("Download failed".to_string())
    }
}

#[tauri::command]
pub async fn youtube_fetch_playlist_info(
    url: String,
    _app: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid YouTube URL: must start with http:// or https://".into());
    }

    let ytdlp_path = crate::cmd_binaries::get_bin_path("yt-dlp");
    let mut cmd = std::process::Command::new(ytdlp_path);
    cmd.args(["-J", "--flat-playlist", "--extractor-args", "youtubetab:approximate_date", "--", &url]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().map_err(|e| e.to_string())?;

    if output.status.success() {
        let json_str = String::from_utf8_lossy(&output.stdout);
        let val: serde_json::Value = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
        Ok(val)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}



#[tauri::command]
pub fn youtube_get_watched(
    video_ids: Vec<String>,
    db_state: tauri::State<crate::db::DbState>,
) -> Result<Vec<String>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    if video_ids.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = vec!["?"; video_ids.len()].join(",");
    let query = format!(
        "SELECT video_id FROM youtube_watched WHERE deleted_at IS NULL AND video_id IN ({})",
        placeholders
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let params_iter = rusqlite::params_from_iter(video_ids.iter());
    let iter = stmt
        .query_map(params_iter, |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    let mut watched = Vec::new();
    for id in iter.flatten() {
        watched.push(id);
    }
    Ok(watched)
}

#[tauri::command]
pub fn youtube_set_watched(
    video_id: String,
    is_watched: bool,
    title: Option<String>,
    channel: Option<String>,
    db_state: tauri::State<crate::db::DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco no inicializado")?;

    if is_watched {
        let mut stmt = conn
            .prepare("SELECT id FROM youtube_watched WHERE video_id = ?")
            .map_err(|e| e.to_string())?;
        let existing_id: Option<String> = stmt.query_row([&video_id], |row| row.get(0)).ok();

        if let Some(eid) = existing_id {
            conn.execute(
                "UPDATE youtube_watched SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                rusqlite::params![eid]
            ).map_err(|e| e.to_string())?;
        } else {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO youtube_watched (id, video_id, title, channel_name) VALUES (?, ?, ?, ?)",
                rusqlite::params![id, video_id, title.unwrap_or_default(), channel.unwrap_or_default()]
            ).map_err(|e| e.to_string())?;
        }
    } else {
        conn.execute(
            "UPDATE youtube_watched SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE video_id = ?",
            rusqlite::params![video_id]
        ).map_err(|e| e.to_string())?;
    }
    Ok(true)
}
