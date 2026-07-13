use tauri::{AppHandle, Manager};
use std::path::PathBuf;
use std::fs;
use std::process::Command;

fn get_audio_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = std::env::current_exe().unwrap().parent().unwrap().join("data");
    let audio_dir = app_data_dir.join("audio");
    if !audio_dir.exists() {
        fs::create_dir_all(&audio_dir).map_err(|e| e.to_string())?;
    }
    Ok(audio_dir)
}

fn get_bin_path(app: &AppHandle, binary_name: &str) -> PathBuf {
    std::env::current_exe().unwrap().parent().unwrap().join("data").join("bin").join(binary_name)
}

#[tauri::command]
pub fn audio_extract_clip(video_path: String, start_time_ms: i32, end_time_ms: i32, app: AppHandle) -> Result<String, String> {
    let ffmpeg_path = get_bin_path(&app, "ffmpeg.exe");
    let audio_dir = get_audio_dir(&app)?;
    
    let duration_ms = end_time_ms - start_time_ms;
    
    let start_sec = start_time_ms as f64 / 1000.0;
    let duration_sec = duration_ms as f64 / 1000.0;
    
    let out_filename = format!("clip_{}.mp3", uuid::Uuid::new_v4());
    let out_path = audio_dir.join(&out_filename);
    
    let output = Command::new(ffmpeg_path)
        .args([
            "-y",
            "-i", &video_path,
            "-ss", &start_sec.to_string(),
            "-t", &duration_sec.to_string(),
            "-vn", // no video
            "-c:a", "libmp3lame",
            "-q:a", "2", // high quality VBR
            &out_path.to_string_lossy().to_string()
        ])
        .output()
        .map_err(|e| e.to_string())?;
        
    if output.status.success() || out_path.exists() {
        Ok(out_path.to_string_lossy().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// Para o Edge TTS, usaremos uma lib ou chamada externa no futuro.
// Por enquanto, placeholder pro frontend não quebrar:
#[tauri::command]
pub async fn audio_generate_tts(text: String, lang: Option<String>, app: AppHandle) -> Result<String, String> {
    // TODO: Implementar comunicação WebSocket pura com o Edge TTS.
    Err("Edge TTS via Rust not implemented yet. Wait for v2".to_string())
}

// Comandos Lofi (que eram no lofi.ts)
fn get_lofi_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = std::env::current_exe().unwrap().parent().unwrap().join("data");
    let lofi_dir = app_data_dir.join("lofi");
    if !lofi_dir.exists() {
        fs::create_dir_all(&lofi_dir).map_err(|e| e.to_string())?;
    }
    Ok(lofi_dir)
}

#[tauri::command]
pub fn lofi_get_local_path(filename: String, app: AppHandle) -> Result<String, String> {
    let lofi_dir = get_lofi_dir(&app)?;
    let path = lofi_dir.join(&filename);
    if path.exists() {
        Ok(path.to_string_lossy().to_string())
    } else {
        Ok("".to_string())
    }
}

#[tauri::command]
pub fn lofi_delete_local(filename: String, app: AppHandle) -> Result<bool, String> {
    let lofi_dir = get_lofi_dir(&app)?;
    let path = lofi_dir.join(&filename);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(true)
}

#[tauri::command]
pub fn lofi_save_local(filename: String, buffer: Vec<u8>, app: AppHandle) -> Result<String, String> {
    let lofi_dir = get_lofi_dir(&app)?;
    let path = lofi_dir.join(&filename);
    fs::write(&path, buffer).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn lofi_copy_local(source_path: String, filename: String, app: AppHandle) -> Result<String, String> {
    let lofi_dir = get_lofi_dir(&app)?;
    let dest_path = lofi_dir.join(&filename);
    fs::copy(&source_path, &dest_path).map_err(|e| e.to_string())?;
    Ok(dest_path.to_string_lossy().to_string())
}
