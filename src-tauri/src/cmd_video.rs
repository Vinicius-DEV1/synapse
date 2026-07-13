use tauri::AppHandle;
use std::path::PathBuf;
use std::fs;
use std::process::Command;
use serde_json::Value;

fn get_videos_dir(_app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = std::env::current_exe().unwrap().parent().unwrap().join("data");
    let videos_dir = app_data_dir.join("videos");
    if !videos_dir.exists() {
        fs::create_dir_all(&videos_dir).map_err(|e| e.to_string())?;
    }
    Ok(videos_dir)
}

fn get_bin_path(_app: &AppHandle, binary_name: &str) -> PathBuf {
    std::env::current_exe().unwrap().parent().unwrap().join("data").join("bin").join(binary_name)
}

#[tauri::command]
pub fn video_get_local_path(filename: String, app: AppHandle) -> Result<String, String> {
    let videos_dir = get_videos_dir(&app)?;
    let path = videos_dir.join(&filename);
    if path.exists() {
        Ok(path.to_string_lossy().to_string())
    } else {
        Ok("".to_string())
    }
}

#[tauri::command]
pub fn video_delete_local(filename: String, app: AppHandle) -> Result<bool, String> {
    let videos_dir = get_videos_dir(&app)?;
    let path = videos_dir.join(&filename);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(true)
}

#[tauri::command]
pub fn video_scan_tracks(local_path: String, app: AppHandle) -> Result<Value, String> {
    let ffprobe_path = get_bin_path(&app, "ffprobe.exe");
    
    let output = Command::new(ffprobe_path)
        .args(["-v", "quiet", "-print_format", "json", "-show_streams", &local_path])
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
pub fn video_extract_subtitles(local_path: String, track_index: String, app: AppHandle) -> Result<String, String> {
    let ffmpeg_path = get_bin_path(&app, "ffmpeg.exe");
    let videos_dir = get_videos_dir(&app)?;
    let vtt_out_path = videos_dir.join(format!("temp_sub_{}.vtt", uuid::Uuid::new_v4()));
    
    let output = Command::new(ffmpeg_path)
        .args([
            "-y", // overwrite
            "-i", &local_path,
            "-map", &format!("0:s:{}", track_index.replace("0:s:", "")), // Ensure clean map
            "-c:s", "webvtt",
            &vtt_out_path.to_string_lossy().to_string()
        ])
        .output()
        .map_err(|e| e.to_string())?;
        
    if output.status.success() || vtt_out_path.exists() {
        let content = fs::read_to_string(&vtt_out_path).unwrap_or_default();
        let _ = fs::remove_file(&vtt_out_path);
        Ok(content)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn video_extract_audio(local_path: String, track_index: String, app: AppHandle) -> Result<String, String> {
    let ffmpeg_path = get_bin_path(&app, "ffmpeg.exe");
    
    let track_clean = track_index.replace(":", "");
    let audio_out_path = format!("{}_{}.m4a", local_path, track_clean);
    
    let output = Command::new(ffmpeg_path)
        .args([
            "-y",
            "-i", &local_path,
            "-map", &track_index,
            "-c:a", "aac",
            "-b:a", "128k",
            &audio_out_path
        ])
        .output()
        .map_err(|e| e.to_string())?;
        
    if output.status.success() || PathBuf::from(&audio_out_path).exists() {
        Ok(audio_out_path)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn video_remux_default_track(source_path: String, filename: String, track_index: String, app: AppHandle) -> Result<String, String> {
    let ffmpeg_path = get_bin_path(&app, "ffmpeg.exe");
    let videos_dir = get_videos_dir(&app)?;
    let dest_path = videos_dir.join(&filename).to_string_lossy().to_string();
    
    let output = Command::new(ffmpeg_path)
        .args([
            "-y",
            "-i", &source_path,
            "-map", "0:v",
            "-map", &track_index,
            "-map", "0:a",
            "-map", "0:s?",
            "-c", "copy",
            &dest_path
        ])
        .output()
        .map_err(|e| e.to_string())?;
        
    if output.status.success() || PathBuf::from(&dest_path).exists() {
        Ok(dest_path)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
