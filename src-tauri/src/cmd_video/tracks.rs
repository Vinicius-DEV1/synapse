use serde_json::Value;
use std::fs;
use std::process::Command;
use tauri::{AppHandle, Manager};
use crate::video_probe::{get_videos_dir, is_file_encrypted};
#[cfg(target_os = "windows")]
use crate::video_probe::CREATE_NO_WINDOW;

/// Probes an input video using ffprobe and returns full JSON metadata of audio, video, and subtitle streams.
#[tauri::command]
pub async fn video_scan_tracks(local_path: String, app: AppHandle) -> Result<Value, String> {
    let ffprobe_path = crate::cmd_binaries::get_bin_path("ffprobe");
    let videos_dir = get_videos_dir(&app)?;

    let input_path = if is_file_encrypted(&videos_dir.join(&local_path)) {
        let port = app.state::<crate::cmd_stream::StreamPortState>().0;
        let filename = std::path::Path::new(&local_path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap();
        format!(
            "http://127.0.0.1:{}/stream?file=culture/{}",
            port,
            urlencoding::encode(filename)
        )
    } else {
        local_path.clone()
    };

    let mut cmd = Command::new(ffprobe_path);
    cmd.args([
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        &input_path,
    ]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().map_err(|e| {
        println!("[DEBUG] video_scan_tracks - ffprobe command failed: {}", e);
        e.to_string()
    })?;

    if output.status.success() {
        let json_str = String::from_utf8_lossy(&output.stdout);
        println!("\x1b[1;36m[CADERNO VIDEO]\x1b[0m 🔍 \x1b[1;32mffprobe escaneou com sucesso:\x1b[0m {} bytes de metadados", json_str.len());
        let val: Value = serde_json::from_str(&json_str).map_err(|e| {
            println!("\x1b[1;31m[CADERNO VIDEO ERROR]\x1b[0m Erro ao ler JSON do ffprobe: {}", e);
            e.to_string()
        })?;
        Ok(val)
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        println!("\x1b[1;31m[CADERNO VIDEO ERROR]\x1b[0m Falha no ffprobe: {}", err_msg);
        Err(err_msg)
    }
}

/// Extracts a specific subtitle stream into WebVTT text format.
#[tauri::command]
pub async fn video_extract_subtitles(
    local_path: String,
    track_index: String,
    app: AppHandle,
) -> Result<String, String> {
    let ffmpeg_path = crate::cmd_binaries::get_bin_path("ffmpeg");
    let videos_dir = get_videos_dir(&app)?;
    let vtt_out_path = videos_dir.join(format!("temp_sub_{}.vtt", uuid::Uuid::new_v4()));
    let full_path = videos_dir.join(&local_path);

    let input_path = if is_file_encrypted(&full_path) {
        let port = app.state::<crate::cmd_stream::StreamPortState>().0;
        let filename = std::path::Path::new(&local_path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap();
        format!(
            "http://127.0.0.1:{}/stream?file=culture/{}",
            port,
            urlencoding::encode(filename)
        )
    } else {
        local_path.clone()
    };

    println!("\x1b[1;36m[CADERNO VIDEO]\x1b[0m 📝 \x1b[1;33mExtraindo legenda:\x1b[0m Faixa \x1b[35m{}\x1b[0m", track_index);

    let mut cmd = Command::new(ffmpeg_path);
    cmd.args([
        "-y", // overwrite
        "-i",
        &input_path,
        "-map",
        &format!("0:s:{}", track_index.replace("0:s:", "")), // Ensure clean stream mapping
        "-c:s",
        "webvtt",
        &vtt_out_path.to_string_lossy().to_string(),
    ]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    
    let output = cmd.output().map_err(|e| {
        println!("\x1b[1;31m[CADERNO VIDEO ERROR]\x1b[0m Falha ao executar FFmpeg para legenda: {}", e);
        e.to_string()
    })?;

    if output.status.success() || vtt_out_path.exists() {
        let content = fs::read(&vtt_out_path)
            .map(|bytes| String::from_utf8_lossy(&bytes).into_owned())
            .unwrap_or_default();
        let _ = fs::remove_file(&vtt_out_path);
        println!(
            "\x1b[1;36m[CADERNO VIDEO]\x1b[0m ✅ \x1b[1;32mLegenda extraída com sucesso!\x1b[0m Tamanho: \x1b[33m{} caracteres\x1b[0m",
            content.len()
        );
        Ok(content)
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        println!("\x1b[1;31m[CADERNO VIDEO ERROR]\x1b[0m Falha ao extrair legenda: {}", err);
        Err(err)
    }
}

/// Extracts an audio track to M4A (AAC 128k) and saves it encrypted.
#[tauri::command]
pub async fn video_extract_audio(
    local_path: String,
    track_index: String,
    db_state: tauri::State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let ffmpeg_path = crate::cmd_binaries::get_bin_path("ffmpeg");
    let videos_dir = get_videos_dir(&app)?;

    let track_clean = track_index.replace(":", "");
    let temp_audio = videos_dir.join(format!("temp_audio_{}.m4a", track_clean));
    let final_enc = videos_dir.join(format!("{}_{}.m4a.enc", uuid::Uuid::new_v4(), track_clean));

    let input_path = if is_file_encrypted(&videos_dir.join(&local_path)) {
        let port = app.state::<crate::cmd_stream::StreamPortState>().0;
        let filename = std::path::Path::new(&local_path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap();
        format!(
            "http://127.0.0.1:{}/stream?file=culture/{}",
            port,
            urlencoding::encode(filename)
        )
    } else {
        local_path.clone()
    };

    println!("\x1b[1;36m[CADERNO VIDEO]\x1b[0m 🎵 \x1b[1;33mExtraindo áudio secundário:\x1b[0m Faixa \x1b[35m{}\x1b[0m (Forçando estéreo -ac 2)", track_index);

    let mut cmd = Command::new(ffmpeg_path);
    cmd.args([
        "-y",
        "-i",
        &input_path,
        "-map",
        &track_index,
        "-c:a",
        "aac",
        "-ac",
        "2",
        "-b:a",
        "128k",
        &temp_audio.to_string_lossy().to_string(),
    ]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().map_err(|e| {
        println!("\x1b[1;31m[CADERNO VIDEO ERROR]\x1b[0m Falha ao executar FFmpeg para extrair áudio: {}", e);
        e.to_string()
    })?;

    if output.status.success() || temp_audio.exists() {
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

        crate::crypto_stream::encrypt_file_chunked(&temp_audio, &final_enc, &master_key)?;
        let _ = fs::remove_file(&temp_audio);

        println!("\x1b[1;36m[CADERNO VIDEO]\x1b[0m ✅ \x1b[1;32mÁudio secundário extraído e criptografado com sucesso!\x1b[0m");
        Ok(final_enc.to_string_lossy().to_string())
    } else {
        let err_output = String::from_utf8_lossy(&output.stderr).to_string();
        println!("\x1b[1;31m[CADERNO VIDEO ERROR]\x1b[0m Erro no FFmpeg ao extrair áudio: {}", err_output);
        let _ = fs::remove_file(&temp_audio);
        Err(err_output)
    }
}

/// Remuxes video with selected audio/subtitle track as default and encrypts the output container.
#[tauri::command]
pub async fn video_remux_default_track(
    source_path: String,
    filename: String,
    track_index: String,
    db_state: tauri::State<'_, crate::db::DbState>,
    app: AppHandle,
) -> Result<String, String> {
    let ffmpeg_path = crate::cmd_binaries::get_bin_path("ffmpeg");
    let videos_dir = get_videos_dir(&app)?;
    let temp_dest = videos_dir.join(format!("temp_remux_{}", filename));
    let final_dest = videos_dir.join(format!("{}.enc", filename));

    let input_path = if is_file_encrypted(&videos_dir.join(&source_path)) {
        let port = app.state::<crate::cmd_stream::StreamPortState>().0;
        let fname = std::path::Path::new(&source_path)
            .file_name()
            .unwrap()
            .to_str()
            .unwrap();
        format!(
            "http://127.0.0.1:{}/stream?file=culture/{}",
            port,
            urlencoding::encode(fname)
        )
    } else {
        source_path.clone()
    };

    let mut cmd = Command::new(ffmpeg_path);
    cmd.args([
        "-y",
        "-i",
        &input_path,
        "-map",
        "0:v",
        "-map",
        &track_index,
        "-map",
        "0:a",
        "-map",
        "0:s?",
        "-c",
        "copy",
        &temp_dest.to_string_lossy().to_string(),
    ]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    let output = cmd.output().map_err(|e| e.to_string())?;

    if output.status.success() || temp_dest.exists() {
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

        crate::crypto_stream::encrypt_file_chunked(&temp_dest, &final_dest, &master_key)?;
        let _ = fs::remove_file(&temp_dest);

        Ok(final_dest.to_string_lossy().to_string())
    } else {
        let _ = fs::remove_file(&temp_dest);
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
