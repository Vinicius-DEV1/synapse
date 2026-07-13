use std::path::Path;
use std::fs;
use std::io::Write;
use tauri::AppHandle;

const YTDLP_URL: &str = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
const FFMPEG_URL: &str = "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/win32-x64";
const FFPROBE_URL: &str = "https://github.com/eugeneware/ffprobe-static/releases/latest/download/win32-x64";

pub async fn ensure_binaries(_app: &AppHandle) -> Result<(), String> {
    let app_data_dir = std::env::current_exe().unwrap().parent().unwrap().join("data");
    let bin_dir = app_data_dir.join("bin");
    
    if !bin_dir.exists() {
        fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;
    }
    
    let ytdlp_path = bin_dir.join("yt-dlp.exe");
    let ffmpeg_path = bin_dir.join("ffmpeg.exe");
    let ffprobe_path = bin_dir.join("ffprobe.exe");
    
    // Download yt-dlp
    if !ytdlp_path.exists() {
        println!("Downloading yt-dlp...");
        download_file(YTDLP_URL, &ytdlp_path).await?;
    }
    
    // Download ffmpeg
    if !ffmpeg_path.exists() {
        println!("Downloading ffmpeg...");
        download_file(FFMPEG_URL, &ffmpeg_path).await?;
    }
    
    // Download ffprobe
    if !ffprobe_path.exists() {
        println!("Downloading ffprobe...");
        download_file(FFPROBE_URL, &ffprobe_path).await?;
    }
    
    Ok(())
}

async fn download_file(url: &str, dest: &Path) -> Result<(), String> {
    let response = reqwest::get(url).await.map_err(|e| e.to_string())?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to download from {}: HTTP {}", url, response.status()));
    }
    
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    
    let mut file = fs::File::create(dest).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn check_binaries_status(_app: AppHandle) -> Result<bool, String> {
    let app_data_dir = std::env::current_exe().unwrap().parent().unwrap().join("data");
    let bin_dir = app_data_dir.join("bin");
    
    Ok(bin_dir.join("yt-dlp.exe").exists() && 
       bin_dir.join("ffmpeg.exe").exists() && 
       bin_dir.join("ffprobe.exe").exists())
}

#[tauri::command]
pub async fn force_download_binaries(app: AppHandle) -> Result<(), String> {
    ensure_binaries(&app).await
}
