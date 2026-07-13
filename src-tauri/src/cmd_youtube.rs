use tauri::{AppHandle, Manager, Emitter};
use std::path::PathBuf;
use std::fs;
use std::process::{Command, Stdio};
use serde_json::Value;
use std::io::{BufReader, BufRead};

fn get_videos_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().unwrap();
    let videos_dir = app_data_dir.join("videos");
    if !videos_dir.exists() {
        fs::create_dir_all(&videos_dir).map_err(|e| e.to_string())?;
    }
    Ok(videos_dir)
}

fn get_bin_path(app: &AppHandle, binary_name: &str) -> PathBuf {
    app.path().app_data_dir().unwrap().join("bin").join(binary_name)
}

#[tauri::command]
pub async fn youtube_fetch_info(url: String, app: AppHandle) -> Result<Value, String> {
    let ytdlp_path = get_bin_path(&app, "yt-dlp.exe");
    
    // spawning yt-dlp -j to get JSON info
    let output = Command::new(ytdlp_path)
        .args(["-j", &url])
        .output()
        .map_err(|e| e.to_string())?;
        
    if output.status.success() {
        let json_str = String::from_utf8_lossy(&output.stdout);
        let val: Value = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
        Ok(val)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub async fn youtube_download(url: String, filename: String, quality: String, subs: Option<Vec<String>>, app: AppHandle) -> Result<bool, String> {
    let ytdlp_path = get_bin_path(&app, "yt-dlp.exe");
    let ffmpeg_dir = get_bin_path(&app, "ffmpeg.exe").parent().unwrap().to_path_buf();
    let videos_dir = get_videos_dir(&app)?;
    let dest_path = videos_dir.join(&filename);
    
    let mut args = vec![
        url.clone(),
        "-f".to_string(), quality,
        "-o".to_string(), dest_path.to_string_lossy().to_string(),
        "--ffmpeg-location".to_string(), ffmpeg_dir.to_string_lossy().to_string()
    ];
    
    if let Some(sub_langs) = subs {
        if !sub_langs.is_empty() {
            let langs = sub_langs.join(",");
            args.push("--write-subs".to_string());
            args.push("--write-auto-subs".to_string());
            args.push("--sub-langs".to_string());
            args.push(langs);
            args.push("--embed-subs".to_string());
            args.push("--compat-options".to_string());
            args.push("no-keep-subs".to_string());
        }
    }
    
    let mut child = Command::new(ytdlp_path)
        .args(&args)
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;
        
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let reader = BufReader::new(stdout);
    
    for line in reader.lines() {
        if let Ok(line_str) = line {
            // Parser simplista para progresso (ex: "[download]  45.0% of ...")
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
        Ok(true)
    } else {
        Err("Download failed".to_string())
    }
}
