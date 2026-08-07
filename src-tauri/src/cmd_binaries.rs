use std::path::{Path, PathBuf};
use std::fs;
use std::io::Write;
use tauri::AppHandle;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

// Retorna a extensão de executável, se houver
fn get_exe_extension() -> &'static str {
    if cfg!(target_os = "windows") {
        ".exe"
    } else {
        ""
    }
}

// Retorna o caminho final absoluto de um binário a partir do nome base
pub fn get_bin_path(binary_base_name: &str) -> PathBuf {
    let app_data_dir = std::env::current_exe().unwrap().parent().unwrap().join("data");
    let bin_dir = app_data_dir.join("bin");
    bin_dir.join(format!("{}{}", binary_base_name, get_exe_extension()))
}

// Funções para pegar as URLs de download dependendo da plataforma
fn get_ytdlp_url() -> &'static str {
    match std::env::consts::OS {
        "windows" => "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
        "macos" => "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos",
        _ => "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp",
    }
}

fn get_ffmpeg_url() -> &'static str {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", _) => "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-win32-x64",
        ("macos", "aarch64") => "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-darwin-arm64",
        ("macos", _) => "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-darwin-x64",
        ("linux", "aarch64") => "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-linux-arm64",
        _ => "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-linux-x64",
    }
}

fn get_ffprobe_url() -> &'static str {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", _) => "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffprobe-win32-x64",
        ("macos", "aarch64") => "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffprobe-darwin-arm64",
        ("macos", _) => "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffprobe-darwin-x64",
        ("linux", "aarch64") => "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffprobe-linux-arm64",
        _ => "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffprobe-linux-x64",
    }
}

pub async fn ensure_binaries(_app: &AppHandle) -> Result<(), String> {
    let app_data_dir = std::env::current_exe().unwrap().parent().unwrap().join("data");
    let bin_dir = app_data_dir.join("bin");
    
    if !bin_dir.exists() {
        fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;
    }
    
    let ytdlp_path = get_bin_path("yt-dlp");
    let ffmpeg_path = get_bin_path("ffmpeg");
    let ffprobe_path = get_bin_path("ffprobe");
    
    // Download yt-dlp
    if !ytdlp_path.exists() {
        println!("Downloading yt-dlp...");
        download_file(get_ytdlp_url(), &ytdlp_path).await?;
        make_executable(&ytdlp_path)?;
    }
    
    // Download ffmpeg
    if !ffmpeg_path.exists() {
        println!("Downloading ffmpeg...");
        download_file(get_ffmpeg_url(), &ffmpeg_path).await?;
        make_executable(&ffmpeg_path)?;
    }
    
    // Download ffprobe
    if !ffprobe_path.exists() {
        println!("Downloading ffprobe...");
        download_file(get_ffprobe_url(), &ffprobe_path).await?;
        make_executable(&ffprobe_path)?;
    }
    
    Ok(())
}

fn make_executable(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        let mut perms = fs::metadata(path).map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(path, perms).map_err(|e| e.to_string())?;
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
    Ok(get_bin_path("yt-dlp").exists() && 
       get_bin_path("ffmpeg").exists() && 
       get_bin_path("ffprobe").exists())
}

#[tauri::command]
pub async fn force_download_binaries(app: AppHandle) -> Result<(), String> {
    ensure_binaries(&app).await
}
