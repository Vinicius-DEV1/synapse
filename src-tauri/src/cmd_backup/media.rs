use std::fs;
use std::path::Path;
use crate::cmd_backup::types::BackupStats;

/// Decrypts a chunked encrypted media file to a destination path using the corresponding key.
pub fn decrypt_media_file(src: &Path, dest: &Path, key_hex: &str) -> Result<u64, String> {
    let result = crate::crypto_stream::read_chunked_range(
        src,
        key_hex,
        0,
        u64::MAX, // Read entire file
    )?;

    fs::write(dest, &result.data)
        .map_err(|e| format!("Failed to write decrypted file: {}", e))?;

    Ok(result.data.len() as u64)
}

/// Safely copies a file from source to destination, returning written byte count.
pub fn copy_file_safe(src: &Path, dest: &Path) -> Result<u64, String> {
    fs::copy(src, dest).map_err(|e| format!("Failed to copy {}: {}", src.display(), e))
}

/// Returns the specific decryption key corresponding to a given media directory.
pub fn get_key_for_media_dir(
    dir_name: &str,
    keys: &Option<crate::cmd_auth::UnlockedKeys>,
) -> Option<String> {
    let keys = keys.as_ref()?;
    match dir_name {
        "videos" => keys.culture.clone().or_else(|| keys.library.clone()),
        "lofis" => keys.focus.clone().or_else(|| keys.library.clone()),
        "files" => keys.files.clone(),
        "anki" => keys.anki.clone().or_else(|| keys.notes.clone()),
        "audio" => keys.notes.clone(),
        _ => None,
    }
}

/// Increments the appropriate media category counter in backup statistics.
pub fn increment_media_stat(stats: &mut BackupStats, dir_name: &str) {
    match dir_name {
        "videos" => stats.videos_copied += 1,
        "lofis" => stats.audio_copied += 1,
        "files" => stats.files_copied += 1,
        "audio" | "anki" => stats.audio_copied += 1,
        _ => {}
    }
}

/// Retrieves the count of copied media files for a specific directory name.
pub fn get_media_count(stats: &BackupStats, dir_name: &str) -> u32 {
    match dir_name {
        "videos" | "lofis" => stats.videos_copied,
        "files" => stats.files_copied,
        "audio" | "anki" => stats.audio_copied,
        _ => 0,
    }
}

/// Downloads a binary media file directly from Google Drive API using a bearer access token.
pub fn download_drive_file(
    token: &str,
    file_id: &str,
    dest_dir: &Path,
    file_name: &str,
) -> Result<u64, String> {
    let url = format!(
        "https://www.googleapis.com/drive/v3/files/{}?alt=media",
        file_id
    );

    let client = reqwest::blocking::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .map_err(|e| format!("Download request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Drive API returned status {}", response.status()));
    }

    let bytes = response
        .bytes()
        .map_err(|e| format!("Failed to read response bytes: {}", e))?;

    // Sanitize filename
    let safe_name = file_name.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let dest_file = dest_dir.join(&safe_name);

    fs::write(&dest_file, &bytes).map_err(|e| format!("Failed to save {}: {}", safe_name, e))?;

    Ok(bytes.len() as u64)
}
