use tauri::AppHandle;
use std::path::PathBuf;
use std::fs;
use std::process::Command;
use serde_json::Value;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

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
pub fn video_import_and_encrypt(
    source_path: String,
    dest_filename: String,
    db_state: tauri::State<'_, crate::db::DbState>,
    app_handle: AppHandle
) -> Result<String, String> {
    let videos_dir = get_videos_dir(&app_handle)?;
    let dest_filename_enc = format!("{}.enc", dest_filename);
    let dest_full_path = videos_dir.join(&dest_filename_enc);
    
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
    
    crate::crypto_stream::encrypt_file_chunked(&source_path, &dest_full_path, &master_key)?;
    
    Ok(dest_full_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn video_save_local(filename: String, buffer: Vec<u8>, db_state: tauri::State<'_, crate::db::DbState>, app: AppHandle) -> Result<String, String> {
    let videos_dir = get_videos_dir(&app)?;
    let filename_enc = format!("{}.enc", filename);
    let path = videos_dir.join(&filename_enc);
    let temp_path = videos_dir.join(format!("{}.tmp", uuid::Uuid::new_v4()));
    
    fs::write(&temp_path, buffer).map_err(|e| e.to_string())?;
    
    let keys_guard = db_state.keys.lock().unwrap();
    let master_key = if let Some(keys) = keys_guard.as_ref() {
        if let Some(ref k) = keys.culture {
            k.clone()
        } else {
            let _ = fs::remove_file(&temp_path);
            return Err("Culture key not found".into());
        }
    } else {
        let _ = fs::remove_file(&temp_path);
        return Err("Keys not unlocked".into());
    };
    
    if let Err(e) = crate::crypto_stream::encrypt_file_chunked(&temp_path, &path, &master_key) {
        let _ = fs::remove_file(&temp_path);
        return Err(e);
    }
    
    let _ = fs::remove_file(&temp_path);
    
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn video_scan_tracks(local_path: String, app: AppHandle) -> Result<Value, String> {
    let ffprobe_path = get_bin_path(&app, "ffprobe.exe");
    
    let input_path = if local_path.ends_with(".enc") {
        let port = tauri::Manager::state::<crate::cmd_stream::StreamPortState>(&app).0;
        let filename = std::path::Path::new(&local_path).file_name().unwrap().to_str().unwrap();
        format!("http://127.0.0.1:{}/stream?file=culture/{}", port, urlencoding::encode(filename))
    } else {
        local_path.clone()
    };
    
    let mut cmd = Command::new(ffprobe_path);
    cmd.args(["-v", "quiet", "-print_format", "json", "-show_streams", &input_path]);
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
pub fn video_extract_subtitles(local_path: String, track_index: String, app: AppHandle) -> Result<String, String> {
    let ffmpeg_path = get_bin_path(&app, "ffmpeg.exe");
    let videos_dir = get_videos_dir(&app)?;
    let vtt_out_path = videos_dir.join(format!("temp_sub_{}.vtt", uuid::Uuid::new_v4()));
    
    let input_path = if local_path.ends_with(".enc") {
        let port = tauri::Manager::state::<crate::cmd_stream::StreamPortState>(&app).0;
        let filename = std::path::Path::new(&local_path).file_name().unwrap().to_str().unwrap();
        format!("http://127.0.0.1:{}/stream?file=culture/{}", port, urlencoding::encode(filename))
    } else {
        local_path.clone()
    };
    
    let output = Command::new(ffmpeg_path)
        .args([
            "-y", // overwrite
            "-i", &input_path,
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
pub fn video_extract_audio(local_path: String, track_index: String, db_state: tauri::State<'_, crate::db::DbState>, app: AppHandle) -> Result<String, String> {
    let ffmpeg_path = get_bin_path(&app, "ffmpeg.exe");
    let videos_dir = get_videos_dir(&app)?;
    
    let track_clean = track_index.replace(":", "");
    let temp_audio = videos_dir.join(format!("temp_audio_{}.m4a", track_clean));
    let final_enc = videos_dir.join(format!("{}_{}.m4a.enc", uuid::Uuid::new_v4(), track_clean));
    
    let input_path = if local_path.ends_with(".enc") {
        let port = tauri::Manager::state::<crate::cmd_stream::StreamPortState>(&app).0;
        let filename = std::path::Path::new(&local_path).file_name().unwrap().to_str().unwrap();
        format!("http://127.0.0.1:{}/stream?file=culture/{}", port, urlencoding::encode(filename))
    } else {
        local_path.clone()
    };
    
    let output = Command::new(ffmpeg_path)
        .args([
            "-y",
            "-i", &input_path,
            "-map", &track_index,
            "-c:a", "aac",
            "-b:a", "128k",
            &temp_audio.to_string_lossy().to_string()
        ])
        .output()
        .map_err(|e| e.to_string())?;
        
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
        
        Ok(final_enc.to_string_lossy().to_string())
    } else {
        let _ = fs::remove_file(&temp_audio);
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn video_remux_default_track(source_path: String, filename: String, track_index: String, db_state: tauri::State<'_, crate::db::DbState>, app: AppHandle) -> Result<String, String> {
    let ffmpeg_path = get_bin_path(&app, "ffmpeg.exe");
    let videos_dir = get_videos_dir(&app)?;
    let temp_dest = videos_dir.join(format!("temp_remux_{}", filename));
    let final_dest = videos_dir.join(format!("{}.enc", filename));
    
    let input_path = if source_path.ends_with(".enc") {
        let port = tauri::Manager::state::<crate::cmd_stream::StreamPortState>(&app).0;
        let fname = std::path::Path::new(&source_path).file_name().unwrap().to_str().unwrap();
        format!("http://127.0.0.1:{}/stream?file=culture/{}", port, urlencoding::encode(fname))
    } else {
        source_path.clone()
    };
    
    let output = Command::new(ffmpeg_path)
        .args([
            "-y",
            "-i", &input_path,
            "-map", "0:v",
            "-map", &track_index,
            "-map", "0:a",
            "-map", "0:s?",
            "-c", "copy",
            &temp_dest.to_string_lossy().to_string()
        ])
        .output()
        .map_err(|e| e.to_string())?;
        
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

#[tauri::command]
pub fn video_convert_mp4(source_path: String, filename: String, db_state: tauri::State<'_, crate::db::DbState>, app: AppHandle) -> Result<String, String> {
    let ffmpeg_path = get_bin_path(&app, "ffmpeg.exe");
    let videos_dir = get_videos_dir(&app)?;
    
    let temp_dest = videos_dir.join(format!("temp_mp4_{}.mp4", uuid::Uuid::new_v4()));
    
    let mut final_dest = videos_dir.join(&filename);
    final_dest.set_extension("mp4.enc");
    let dest_path_str = final_dest.to_string_lossy().to_string();
    
    if final_dest.exists() {
        return Ok(dest_path_str);
    }
    
    let input_path = if source_path.ends_with(".enc") {
        let port = tauri::Manager::state::<crate::cmd_stream::StreamPortState>(&app).0;
        let fname = std::path::Path::new(&source_path).file_name().unwrap().to_str().unwrap();
        format!("http://127.0.0.1:{}/stream?file=culture/{}", port, urlencoding::encode(fname))
    } else {
        source_path.clone()
    };
    
    let output = Command::new(ffmpeg_path)
        .args([
            "-y",
            "-i", &input_path,
            "-c", "copy",
            &temp_dest.to_string_lossy().to_string()
        ])
        .output()
        .map_err(|e| e.to_string())?;
        
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
        
        Ok(dest_path_str)
    } else {
        let _ = fs::remove_file(&temp_dest);
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
