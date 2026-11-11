use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;

#[cfg(target_os = "windows")]
pub const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn sanitize_filename(name: &str) -> String {
    Path::new(name)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unnamed_file")
        .to_string()
}

pub fn get_videos_dir(_app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = crate::get_app_data_dir();
    let videos_dir = app_data_dir.join("videos");
    if !videos_dir.exists() {
        fs::create_dir_all(&videos_dir).map_err(|e| e.to_string())?;
    }
    Ok(videos_dir)
}

pub fn is_file_encrypted(path: &Path) -> bool {
    if let Ok(mut f) = fs::File::open(path) {
        use std::io::Read;
        let mut magic = [0u8; 4];
        if f.read_exact(&mut magic).is_ok() && &magic == crate::crypto_stream::MAGIC_BYTES {
            return true;
        }
    }
    false
}

pub fn normalize_to_mp4_name(filename: &str) -> String {
    let path = Path::new(filename);
    let stem = path.file_stem().unwrap_or_default().to_string_lossy();
    format!("{}.mp4", stem)
}

pub fn video_probe_codec(path: &str, stream_type: &str) -> Result<String, String> {
    let ffprobe_path = crate::cmd_binaries::get_bin_path("ffprobe");
    let output = Command::new(&ffprobe_path)
        .args([
            "-v",
            "error",
            "-select_streams",
            stream_type,
            "-show_entries",
            "stream=codec_name",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            path,
        ])
        .output()
        .map_err(|e| format!("Falha ao executar ffprobe: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
