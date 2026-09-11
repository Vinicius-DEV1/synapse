use serde::{Deserialize, Serialize};
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
    if !ytdlp_path.exists() {
        return Err("yt-dlp binary not found".into());
    }

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
        Err(sanitize_ytdlp_error(&String::from_utf8_lossy(&output.stderr)))
    }
}

pub fn sanitize_ytdlp_error(stderr: &str) -> String {
    let lower = stderr.to_lowercase();
    if lower.contains("temporary failure in name resolution")
        || lower.contains("failed to resolve")
        || lower.contains("unable to download webpage")
        || lower.contains("unable to download api page")
        || lower.contains("network is unreachable")
        || lower.contains("connection refused")
        || lower.contains("timed out")
    {
        return "Não foi possível conectar ao YouTube. Verifique sua conexão com a internet.".to_string();
    }
    if lower.contains("the playlist does not exist") || lower.contains("playlist does not exist") {
        return "A playlist informada não existe ou foi removida do YouTube.".to_string();
    }
    if lower.contains("private video") {
        return "Este vídeo é privado ou requer permissão especial no YouTube.".to_string();
    }
    if lower.contains("video unavailable") || lower.contains("this video is unavailable") {
        return "Este vídeo não está disponível no YouTube.".to_string();
    }
    if lower.contains("sign in to confirm your age") || lower.contains("age-restricted") {
        return "Este vídeo possui restrição de idade no YouTube.".to_string();
    }

    for line in stderr.lines().rev() {
        let trimmed = line.trim();
        if trimmed.starts_with("ERROR:") {
            let msg = trimmed.trim_start_matches("ERROR:").trim();
            if let Some(pos) = msg.find("] ") {
                return msg[pos + 2..].trim().to_string();
            }
            return msg.to_string();
        }
    }

    let first_line = stderr
        .lines()
        .map(|l| l.trim())
        .find(|l| !l.is_empty() && !l.starts_with("WARNING:"))
        .unwrap_or("Falha na operação com o YouTube.");

    first_line.to_string()
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
    if !ytdlp_path.exists() {
        return Err("yt-dlp binary not found".into());
    }

    let mut cmd = std::process::Command::new(ytdlp_path);
    cmd.args(["-J", "--flat-playlist", "--no-warnings", "--", &url]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().map_err(|e| e.to_string())?;

    if output.status.success() {
        let json_str = String::from_utf8_lossy(&output.stdout);
        let val: serde_json::Value = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
        Ok(val)
    } else {
        Err(sanitize_ytdlp_error(&String::from_utf8_lossy(&output.stderr)))
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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct YouTubeTranscriptResult {
    pub video_id: String,
    pub title: String,
    pub channel: String,
    pub duration: Option<f64>,
    pub language: String,
    pub transcript: String,
    pub raw_vtt: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct YouTubeSummaryRecord {
    pub id: String,
    pub video_id: String,
    pub title: Option<String>,
    pub channel_name: Option<String>,
    pub summary: String,
    pub raw_transcript: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

fn format_vtt_timestamp(seconds: f64) -> String {
    let total_secs = seconds.floor() as u64;
    let hours = total_secs / 3600;
    let minutes = (total_secs % 3600) / 60;
    let secs = total_secs % 60;
    if hours > 0 {
        format!("{:02}:{:02}:{:02}", hours, minutes, secs)
    } else {
        format!("{:02}:{:02}", minutes, secs)
    }
}

fn parse_vtt_cue_time(ts: &str) -> Option<f64> {
    let clean = ts.trim().split_whitespace().next()?.replace(',', ".");
    let parts: Vec<&str> = clean.split(':').collect();
    match parts.len() {
        3 => {
            let h: f64 = parts[0].parse().ok()?;
            let m: f64 = parts[1].parse().ok()?;
            let s: f64 = parts[2].parse().ok()?;
            Some(h * 3600.0 + m * 60.0 + s)
        }
        2 => {
            let m: f64 = parts[0].parse().ok()?;
            let s: f64 = parts[1].parse().ok()?;
            Some(m * 60.0 + s)
        }
        _ => None,
    }
}

fn clean_vtt_content(vtt: &str) -> String {
    let mut result = Vec::new();
    let mut last_text = String::new();
    let mut current_ts = String::new();
    let mut current_block_text = Vec::new();
    let mut last_timestamp_seconds: Option<f64> = None;

    let tag_regex = regex::Regex::new(r"<[^>]+>").ok();

    for line in vtt.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty()
            || trimmed == "WEBVTT"
            || trimmed.starts_with("Kind:")
            || trimmed.starts_with("Language:")
            || trimmed.starts_with("NOTE")
            || trimmed.starts_with("STYLE")
            || trimmed.chars().all(|c| c.is_ascii_digit())
        {
            continue;
        }

        if trimmed.contains("-->") {
            if let Some(first_ts) = trimmed.split("-->").next() {
                if let Some(secs) = parse_vtt_cue_time(first_ts) {
                    let should_stamp = match last_timestamp_seconds {
                        None => true,
                        Some(prev) => (secs - prev) >= 20.0,
                    };
                    if should_stamp {
                        if !current_block_text.is_empty() {
                            let text_content = current_block_text.join(" ");
                            if !text_content.is_empty() {
                                result.push(format!("[{}] {}", current_ts, text_content));
                            }
                            current_block_text.clear();
                        }
                        current_ts = format_vtt_timestamp(secs);
                        last_timestamp_seconds = Some(secs);
                    }
                }
            }
            continue;
        }

        let no_tags = if let Some(ref re) = tag_regex {
            re.replace_all(trimmed, "").to_string()
        } else {
            trimmed.to_string()
        };

        let clean_text = no_tags
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&nbsp;", " ");
        let clean_text = clean_text.trim();

        if !clean_text.is_empty() && clean_text != last_text {
            last_text = clean_text.to_string();
            current_block_text.push(clean_text.to_string());
        }
    }

    if !current_block_text.is_empty() {
        let text_content = current_block_text.join(" ");
        if !text_content.is_empty() {
            let ts = if current_ts.is_empty() {
                "00:00".to_string()
            } else {
                current_ts
            };
            result.push(format!("[{}] {}", ts, text_content));
        }
    }

    result.join("\n\n")
}

fn find_best_vtt_url(formats: &[Value]) -> Option<String> {
    for fmt in formats {
        if let Some(ext) = fmt.get("ext").and_then(|e| e.as_str()) {
            if ext == "vtt" {
                if let Some(u) = fmt.get("url").and_then(|u| u.as_str()) {
                    return Some(u.to_string());
                }
            }
        }
    }
    formats
        .first()
        .and_then(|f| f.get("url"))
        .and_then(|u| u.as_str())
        .map(|s| s.to_string())
}

#[tauri::command]
pub async fn youtube_fetch_transcript(
    url: String,
    _app: AppHandle,
) -> Result<YouTubeTranscriptResult, String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("URL do YouTube inválida: deve começar com http:// ou https://".into());
    }

    let ytdlp_path = crate::cmd_binaries::get_bin_path("yt-dlp");
    if !ytdlp_path.exists() {
        return Err("Binário do yt-dlp não encontrado. Por favor, instale o yt-dlp nas configurações.".into());
    }

    let mut cmd = Command::new(ytdlp_path);
    cmd.args(["-j", "--no-playlist", "--", &url]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(sanitize_ytdlp_error(&String::from_utf8_lossy(&output.stderr)));
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let val: Value = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

    let video_id = val
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let title = val
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("Vídeo do YouTube")
        .to_string();

    let channel = val
        .get("uploader")
        .or_else(|| val.get("channel"))
        .and_then(|v| v.as_str())
        .unwrap_or("Canal do YouTube")
        .to_string();

    let duration = val.get("duration").and_then(|v| v.as_f64());

    let manual_subs = val.get("subtitles").and_then(|v| v.as_object());
    let auto_subs = val.get("automatic_captions").and_then(|v| v.as_object());

    let pref_langs = ["pt-BR", "pt", "en", "es"];

    let mut selected_lang = String::new();
    let mut selected_url = String::new();

    // 1. Prioritize manual subtitles
    if let Some(subs) = manual_subs {
        for lang in &pref_langs {
            if let Some(formats) = subs.get(*lang).and_then(|f| f.as_array()) {
                if let Some(target) = find_best_vtt_url(formats) {
                    selected_lang = lang.to_string();
                    selected_url = target;
                    break;
                }
            }
        }
        if selected_url.is_empty() {
            for (lang, formats_val) in subs {
                if let Some(formats) = formats_val.as_array() {
                    if let Some(target) = find_best_vtt_url(formats) {
                        selected_lang = lang.clone();
                        selected_url = target;
                        break;
                    }
                }
            }
        }
    }

    // 2. Fallback to automatic captions
    if selected_url.is_empty() {
        if let Some(subs) = auto_subs {
            for lang in &pref_langs {
                if let Some(formats) = subs.get(*lang).and_then(|f| f.as_array()) {
                    if let Some(target) = find_best_vtt_url(formats) {
                        selected_lang = lang.to_string();
                        selected_url = target;
                        break;
                    }
                }
            }
            if selected_url.is_empty() {
                for (lang, formats_val) in subs {
                    if let Some(formats) = formats_val.as_array() {
                        if let Some(target) = find_best_vtt_url(formats) {
                            selected_lang = lang.clone();
                            selected_url = target;
                            break;
                        }
                    }
                }
            }
        }
    }

    if selected_url.is_empty() {
        return Err("Nenhuma legenda ou transcrição disponível para este vídeo no YouTube.".to_string());
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(&selected_url)
        .send()
        .await
        .map_err(|e| format!("Falha ao baixar legendas do vídeo: {}", e))?;

    let raw_vtt = resp
        .text()
        .await
        .map_err(|e| format!("Falha ao ler conteúdo da legenda: {}", e))?;

    let cleaned_transcript = clean_vtt_content(&raw_vtt);

    if cleaned_transcript.trim().is_empty() {
        return Err("A transcrição do vídeo está vazia.".to_string());
    }

    Ok(YouTubeTranscriptResult {
        video_id,
        title,
        channel,
        duration,
        language: selected_lang,
        transcript: cleaned_transcript,
        raw_vtt: Some(raw_vtt),
    })
}

#[tauri::command]
pub fn youtube_get_summary(
    video_id: String,
    db_state: tauri::State<crate::db::DbState>,
) -> Result<Option<YouTubeSummaryRecord>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn
        .prepare("SELECT id, video_id, title, channel_name, summary, raw_transcript, created_at, updated_at FROM youtube_summaries WHERE video_id = ?")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt.query(rusqlite::params![video_id]).map_err(|e| e.to_string())?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(YouTubeSummaryRecord {
            id: row.get(0).map_err(|e| e.to_string())?,
            video_id: row.get(1).map_err(|e| e.to_string())?,
            title: row.get(2).map_err(|e| e.to_string())?,
            channel_name: row.get(3).map_err(|e| e.to_string())?,
            summary: row.get(4).map_err(|e| e.to_string())?,
            raw_transcript: row.get(5).map_err(|e| e.to_string())?,
            created_at: row.get(6).map_err(|e| e.to_string())?,
            updated_at: row.get(7).map_err(|e| e.to_string())?,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn youtube_save_summary(
    video_id: String,
    title: Option<String>,
    channel: Option<String>,
    summary: String,
    raw_transcript: Option<String>,
    db_state: tauri::State<crate::db::DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO youtube_summaries (id, video_id, title, channel_name, summary, raw_transcript, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)
         ON CONFLICT(video_id) DO UPDATE SET
             title = excluded.title,
             channel_name = excluded.channel_name,
             summary = excluded.summary,
             raw_transcript = excluded.raw_transcript,
             updated_at = CURRENT_TIMESTAMP",
        rusqlite::params![id, video_id, title, channel, summary, raw_transcript],
    ).map_err(|e| e.to_string())?;

    Ok(true)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct YouTubeStreamInfo {
    pub title: String,
    pub resolution: String,
    pub duration: f64,
    pub video_url: String,
    pub audio_url: Option<String>,
}

#[tauri::command]
pub async fn youtube_get_stream(url: String, _app: AppHandle) -> Result<YouTubeStreamInfo, String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid YouTube URL: must start with http:// or https://".into());
    }

    let ytdlp_path = crate::cmd_binaries::get_bin_path("yt-dlp");
    if !ytdlp_path.exists() {
        return Err("yt-dlp binary not found".into());
    }

    let mut cmd = Command::new(ytdlp_path);
    cmd.args([
        "--no-playlist",
        "--no-warnings",
        "-f",
        "bestvideo[height<=720]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best",
        "--print",
        "%(title)s",
        "--print",
        "%(resolution)s",
        "--print",
        "%(duration)s",
        "-g",
        "--",
        &url,
    ]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().map_err(|e| e.to_string())?;

    if !output.status.success() {
        let err_msg = sanitize_ytdlp_error(&String::from_utf8_lossy(&output.stderr));
        return Err(format!("Falha ao obter stream do vídeo: {}", err_msg));
    }

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout_str
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect();

    if lines.is_empty() {
        return Err("Nenhum stream retornado pelo yt-dlp".into());
    }

    // Partition lines into URLs (starting with http/https) and metadata lines
    let (url_lines, meta_lines): (Vec<&str>, Vec<&str>) = lines
        .into_iter()
        .partition(|l| l.starts_with("http://") || l.starts_with("https://"));

    if url_lines.is_empty() {
        return Err("Nenhuma URL de stream retornada pelo yt-dlp".into());
    }

    let title = meta_lines
        .get(0)
        .filter(|t| !t.is_empty() && *t != &"NA")
        .unwrap_or(&"Vídeo do YouTube")
        .to_string();

    let resolution = meta_lines
        .get(1)
        .filter(|r| !r.is_empty() && *r != &"NA")
        .unwrap_or(&"720p")
        .to_string();

    let duration: f64 = meta_lines
        .get(2)
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);

    let video_url = url_lines[0].to_string();
    let audio_url = url_lines.get(1).map(|s| s.to_string());

    Ok(YouTubeStreamInfo {
        title,
        resolution,
        duration,
        video_url,
        audio_url,
    })
}

