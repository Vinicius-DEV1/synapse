use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::{AppHandle, State};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[tauri::command]
pub async fn audio_extract_clip(
    video_path: String,
    start_time_ms: i32,
    end_time_ms: i32,
    db_state: State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    if video_path.trim().starts_with('-') || video_path.contains('\0') {
        return Err("Caminho de vídeo inválido ou inseguro".into());
    }

    let ffmpeg_path = crate::cmd_binaries::get_bin_path("ffmpeg");

    let app_data_dir = crate::get_app_data_dir();
    let anki_dir = app_data_dir.join("anki");
    if !anki_dir.exists() {
        fs::create_dir_all(&anki_dir).map_err(|e| e.to_string())?;
    }

    let duration_ms = end_time_ms - start_time_ms;
    if start_time_ms < 0 || duration_ms <= 0 {
        return Err("Invalid clip timestamps: start time must be non-negative and end time greater than start time".into());
    }

    let start_sec = start_time_ms as f64 / 1000.0;
    let duration_sec = duration_ms as f64 / 1000.0;

    let out_filename = format!("clip_{}.mp3", uuid::Uuid::new_v4());
    let temp_path = anki_dir.join(&out_filename);
    let final_enc = anki_dir.join(format!("{}.enc", out_filename));

    let input_path = if video_path.ends_with(".enc") {
        let port = tauri::Manager::state::<crate::cmd_stream::StreamPortState>(&app).0;
        let fname = Path::new(&video_path)
            .file_name()
            .ok_or("Invalid video path")?
            .to_str()
            .ok_or("Invalid filename encoding")?;

        if fname.contains("..") || fname.contains('/') || fname.contains('\\') {
            return Err("Caminho de stream inválido".into());
        }

        format!(
            "http://127.0.0.1:{}/stream?file=culture/{}",
            port,
            urlencoding::encode(fname)
        )
    } else {
        let p = Path::new(&video_path);
        let canonical = p
            .canonicalize()
            .map_err(|e| format!("Arquivo de vídeo inacessível: {}", e))?;
        if !canonical.is_file() {
            return Err("Input video file does not exist or is not a file".into());
        }
        canonical.to_string_lossy().to_string()
    };

    let mut cmd = Command::new(ffmpeg_path);
    cmd.args([
        "-y",
        "-i",
        &input_path,
        "-ss",
        &start_sec.to_string(),
        "-t",
        &duration_sec.to_string(),
        "-vn",
        "-c:a",
        "libmp3lame",
        "-q:a",
        "2",
        &temp_path.to_string_lossy().to_string(),
    ]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().map_err(|e| e.to_string())?;

    if output.status.success() || temp_path.exists() {
        let keys_guard = db_state.lock_keys()?;
        let master_key = if let Some(keys) = keys_guard.as_ref() {
            if let Some(ref k) = keys.anki {
                k.clone()
            } else {
                let _ = fs::remove_file(&temp_path);
                return Err("Anki key not found".into());
            }
        } else {
            let _ = fs::remove_file(&temp_path);
            return Err("Keys not unlocked".into());
        };

        if let Err(e) =
            crate::crypto_stream::encrypt_file_chunked(&temp_path, &final_enc, &master_key)
        {
            let _ = fs::remove_file(&temp_path);
            return Err(e);
        }
        let _ = fs::remove_file(&temp_path);

        Ok(final_enc.to_string_lossy().to_string())
    } else {
        let _ = fs::remove_file(&temp_path);
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// Edge TTS placeholder implementation for frontend compatibility:
#[tauri::command]
pub async fn audio_generate_tts(
    _text: String,
    _lang: Option<String>,
    _app: AppHandle,
) -> Result<String, String> {
    Err("Edge TTS via Rust not implemented yet. Wait for v2".to_string())
}
