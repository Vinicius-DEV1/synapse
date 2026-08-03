use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::fs;

use crate::db::DbState;

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct BackupOptions {
    pub destination: String,
    #[serde(rename = "type")]
    pub backup_type: String, // "encrypted" | "decrypted"
    #[serde(rename = "includeMedia")]
    pub include_media: bool,
    #[serde(rename = "driveToken")]
    pub drive_token: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct BackupLogPayload {
    pub message: String,
    pub progress: Option<f64>,
}

#[derive(Serialize)]
pub struct BackupResult {
    pub success: bool,
    pub message: String,
}

#[derive(Serialize)]
struct BackupManifest {
    version: u32,
    created_at: String,
    backup_type: String,
    include_media: bool,
    include_drive: bool,
    stats: BackupStats,
}

#[derive(Serialize)]
struct BackupStats {
    db_size_bytes: u64,
    pages_count: i64,
    videos_copied: u32,
    files_copied: u32,
    audio_copied: u32,
    drive_downloaded: u32,
    errors: u32,
    total_size_bytes: u64,
}

// ─── Global cancel flag ──────────────────────────────────────────────────────

static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

fn is_cancelled() -> bool {
    CANCEL_FLAG.load(Ordering::Relaxed)
}

fn emit_log(app: &AppHandle, message: &str, progress: Option<f64>) {
    let _ = app.emit("backup-log", BackupLogPayload {
        message: message.to_string(),
        progress,
    });
}

// ─── Commands ────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn backup_select_folder(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    
    let (tx, rx) = std::sync::mpsc::channel();
    
    app.dialog()
        .file()
        .set_title("Selecione a pasta de destino do backup")
        .pick_folder(move |folder| {
            let result = folder.and_then(|f| f.as_path().map(|p| p.to_string_lossy().to_string()));
            let _ = tx.send(result);
        });
    
    let result = rx.recv().map_err(|e| format!("Dialog error: {}", e))?;
    Ok(result)
}

#[tauri::command]
pub async fn backup_start(
    options: BackupOptions,
    db_state: tauri::State<'_, DbState>,
    app: AppHandle,
) -> Result<BackupResult, String> {
    // Reset cancel flag
    CANCEL_FLAG.store(false, Ordering::Relaxed);
    
    // Clone keys from state (need them in the spawned thread)
    let keys = {
        let keys_guard = db_state.keys.lock().unwrap();
        keys_guard.clone()
    };
    
    // Get the DB path
    let app_data_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Cannot get exe parent")?
        .join("data");
    
    let db_path = app_data_dir.join("caderno.sqlite");
    
    if !db_path.exists() {
        return Err("Banco de dados não encontrado".into());
    }
    
    let app_data_dir_clone = app_data_dir.clone();
    let app_clone = app.clone();
    
    // Spawn the backup work on a separate thread
    tauri::async_runtime::spawn(async move {
        let result = run_backup(
            &app_clone,
            &options,
            &app_data_dir_clone,
            &db_path,
            keys,
        );
        
        match result {
            Ok(_) => {
                if is_cancelled() {
                    emit_log(&app_clone, "⚠️ Backup cancelado pelo usuário.", Some(0.0));
                }
            }
            Err(e) => {
                emit_log(&app_clone, &format!("ERRO FATAL: {}", e), Some(0.0));
            }
        }
    });
    
    Ok(BackupResult {
        success: true,
        message: "Backup iniciado".into(),
    })
}

#[tauri::command]
pub fn backup_cancel() -> Result<bool, String> {
    CANCEL_FLAG.store(true, Ordering::Relaxed);
    Ok(true)
}

// ─── Core backup logic ──────────────────────────────────────────────────────

fn run_backup(
    app: &AppHandle,
    options: &BackupOptions,
    app_data_dir: &Path,
    db_path: &Path,
    keys: Option<crate::cmd_auth::UnlockedKeys>,
) -> Result<(), String> {
    let mut stats = BackupStats {
        db_size_bytes: 0,
        pages_count: 0,
        videos_copied: 0,
        files_copied: 0,
        audio_copied: 0,
        drive_downloaded: 0,
        errors: 0,
        total_size_bytes: 0,
    };
    
    // ── Step 1: Create backup folder ─────────────────────────────────────
    emit_log(app, "📁 Criando pasta de backup...", Some(1.0));
    
    let timestamp = chrono::Local::now().format("%Y-%m-%d_%Hh%M").to_string();
    let backup_folder_name = format!("Caderno_Backup_{}", timestamp);
    let backup_dir = PathBuf::from(&options.destination).join(&backup_folder_name);
    
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Falha ao criar pasta: {}", e))?;
    
    if is_cancelled() { return Ok(()); }
    
    // ── Step 2: Checkpoint WAL and copy database ─────────────────────────
    emit_log(app, "💾 Preparando banco de dados...", Some(3.0));
    
    // Open a temporary connection to do WAL checkpoint
    {
        let conn = rusqlite::Connection::open(db_path)
            .map_err(|e| format!("Falha ao abrir DB para checkpoint: {}", e))?;
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| format!("Falha no checkpoint WAL: {}", e))?;
    }
    
    let dest_db_path = backup_dir.join("caderno.sqlite");
    fs::copy(db_path, &dest_db_path)
        .map_err(|e| format!("Falha ao copiar banco: {}", e))?;
    
    stats.db_size_bytes = fs::metadata(&dest_db_path).map(|m| m.len()).unwrap_or(0);
    stats.total_size_bytes += stats.db_size_bytes;
    
    // Also copy WAL/SHM if they exist (shouldn't after TRUNCATE, but safety)
    let wal_path = db_path.with_extension("sqlite-wal");
    let shm_path = db_path.with_extension("sqlite-shm");
    if wal_path.exists() {
        let _ = fs::copy(&wal_path, backup_dir.join("caderno.sqlite-wal"));
    }
    if shm_path.exists() {
        let _ = fs::copy(&shm_path, backup_dir.join("caderno.sqlite-shm"));
    }
    
    emit_log(app, &format!("✓ Banco de dados copiado ({:.1} MB)", stats.db_size_bytes as f64 / 1_048_576.0), Some(10.0));
    
    if is_cancelled() { return Ok(()); }
    
    // ── Step 3: Decrypt database if needed ───────────────────────────────
    if options.backup_type == "decrypted" {
        emit_log(app, "🔓 Descriptografando banco de dados...", Some(12.0));
        
        match decrypt_database_copy(&dest_db_path, &keys) {
            Ok(count) => {
                stats.pages_count = count;
                emit_log(app, &format!("✓ {} registros descriptografados", count), Some(18.0));
            }
            Err(e) => {
                stats.errors += 1;
                emit_log(app, &format!("ERRO ao descriptografar DB: {}", e), Some(18.0));
            }
        }
    } else {
        // Count pages for stats
        if let Ok(conn) = rusqlite::Connection::open(&dest_db_path) {
            stats.pages_count = conn.query_row("SELECT COUNT(*) FROM pages WHERE deleted_at IS NULL", [], |r| r.get(0)).unwrap_or(0);
        }
        emit_log(app, &format!("✓ Banco mantido criptografado ({} páginas)", stats.pages_count), Some(18.0));
    }
    
    if is_cancelled() { return Ok(()); }
    
    // ── Step 4: Copy local media directories ─────────────────────────────
    if options.include_media {
        let media_dirs = vec![
            ("videos", "🎬 Copiando vídeos"),
            ("files", "📄 Copiando arquivos"),
            ("audio", "🎵 Copiando áudios"),
            ("anki", "🃏 Copiando áudios do Anki"),
            ("lofis", "🎶 Copiando lo-fi"),
        ];
        
        let total_dirs = media_dirs.len() as f64;
        let progress_per_dir = 50.0 / total_dirs; // 20% → 70% for media
        
        for (i, (dir_name, label)) in media_dirs.iter().enumerate() {
            if is_cancelled() { return Ok(()); }
            
            let source_dir = app_data_dir.join(dir_name);
            let base_progress = 20.0 + (i as f64 * progress_per_dir);
            
            if !source_dir.exists() || !source_dir.is_dir() {
                emit_log(app, &format!("⏭ Pasta {} não existe, pulando...", dir_name), Some(base_progress + progress_per_dir));
                continue;
            }
            
            let entries: Vec<_> = fs::read_dir(&source_dir)
                .map(|rd| rd.filter_map(|e| e.ok()).collect())
                .unwrap_or_default();
            
            if entries.is_empty() {
                emit_log(app, &format!("⏭ Pasta {} vazia, pulando...", dir_name), Some(base_progress + progress_per_dir));
                continue;
            }
            
            let dest_media_dir = backup_dir.join(dir_name);
            fs::create_dir_all(&dest_media_dir).map_err(|e| e.to_string())?;
            
            let total_files = entries.len();
            emit_log(app, &format!("{} ({} arquivos)...", label, total_files), Some(base_progress));
            
            let decrypt_media = options.backup_type == "decrypted";
            let media_key = if decrypt_media {
                get_key_for_media_dir(dir_name, &keys)
            } else {
                None
            };
            
            for (j, entry) in entries.iter().enumerate() {
                if is_cancelled() { return Ok(()); }
                
                let file_path = entry.path();
                if !file_path.is_file() { continue; }
                
                let file_name = file_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                let file_progress = base_progress + ((j as f64 / total_files as f64) * progress_per_dir);
                
                // If decrypted mode and file is .enc, decrypt it
                if decrypt_media && file_name.ends_with(".enc") {
                    if let Some(ref key) = media_key {
                        let decrypted_name = file_name.trim_end_matches(".enc");
                        let dest_file = dest_media_dir.join(decrypted_name);
                        
                        match decrypt_media_file(&file_path, &dest_file, key) {
                            Ok(size) => {
                                stats.total_size_bytes += size;
                                increment_media_stat(&mut stats, dir_name);
                            }
                            Err(e) => {
                                stats.errors += 1;
                                emit_log(app, &format!("ERRO {}: {}", file_name, e), Some(file_progress));
                                // Fallback: copy encrypted file as-is
                                if let Ok(size) = copy_file_safe(&file_path, &dest_media_dir.join(&file_name)) {
                                    stats.total_size_bytes += size;
                                    increment_media_stat(&mut stats, dir_name);
                                }
                            }
                        }
                    } else {
                        // No key available, copy as-is
                        if let Ok(size) = copy_file_safe(&file_path, &dest_media_dir.join(&file_name)) {
                            stats.total_size_bytes += size;
                            increment_media_stat(&mut stats, dir_name);
                        }
                    }
                } else {
                    // Non-encrypted file, just copy
                    if let Ok(size) = copy_file_safe(&file_path, &dest_media_dir.join(&file_name)) {
                        stats.total_size_bytes += size;
                        increment_media_stat(&mut stats, dir_name);
                    } else {
                        stats.errors += 1;
                    }
                }
                
                if (j + 1) % 5 == 0 || j + 1 == total_files {
                    emit_log(app, &format!("  {} {}/{}", dir_name, j + 1, total_files), Some(file_progress));
                }
            }
            
            let count = get_media_count(&stats, dir_name);
            emit_log(app, &format!("✓ {} — {} arquivos copiados", dir_name, count), Some(base_progress + progress_per_dir));
        }
    } else {
        emit_log(app, "⏭ Mídias locais não incluídas (opção desativada)", Some(70.0));
    }
    
    if is_cancelled() { return Ok(()); }
    
    // ── Step 5: Download Drive media ─────────────────────────────────────
    if options.include_media && options.drive_token.is_some() {
        let token = options.drive_token.as_ref().unwrap();
        emit_log(app, "☁️ Baixando mídias do Google Drive...", Some(72.0));
        
        // Query drive_file_ids from the backup DB
        let drive_files = get_drive_file_ids(&dest_db_path);
        
        if drive_files.is_empty() {
            emit_log(app, "⏭ Nenhuma mídia no Drive encontrada", Some(90.0));
        } else {
            let drive_dir = backup_dir.join("drive");
            fs::create_dir_all(&drive_dir).map_err(|e| e.to_string())?;
            
            let total = drive_files.len();
            emit_log(app, &format!("☁️ {} arquivos para baixar do Drive", total), Some(73.0));
            
            for (i, (file_id, file_name)) in drive_files.iter().enumerate() {
                if is_cancelled() { return Ok(()); }
                
                let progress = 73.0 + ((i as f64 / total as f64) * 17.0); // 73% → 90%
                emit_log(app, &format!("  ⬇ Baixando {}/{}: {}", i + 1, total, file_name), Some(progress));
                
                match download_drive_file(token, file_id, &drive_dir, file_name) {
                    Ok(size) => {
                        stats.drive_downloaded += 1;
                        stats.total_size_bytes += size;
                    }
                    Err(e) => {
                        stats.errors += 1;
                        emit_log(app, &format!("ERRO ao baixar {}: {}", file_name, e), Some(progress));
                    }
                }
            }
            
            emit_log(app, &format!("✓ Drive — {} arquivos baixados", stats.drive_downloaded), Some(90.0));
        }
    } else if options.include_media {
        emit_log(app, "⏭ Download do Drive não solicitado", Some(90.0));
    }
    
    if is_cancelled() { return Ok(()); }
    
    // ── Step 6: Generate manifest ────────────────────────────────────────
    emit_log(app, "📋 Gerando manifest do backup...", Some(92.0));
    
    let manifest = BackupManifest {
        version: 1,
        created_at: chrono::Utc::now().to_rfc3339(),
        backup_type: options.backup_type.clone(),
        include_media: options.include_media,
        include_drive: options.drive_token.is_some(),
        stats,
    };
    
    let manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("Falha ao serializar manifest: {}", e))?;
    
    fs::write(backup_dir.join("manifest.json"), &manifest_json)
        .map_err(|e| format!("Falha ao escrever manifest: {}", e))?;
    
    // ── Done! ────────────────────────────────────────────────────────────
    let total_mb = manifest.stats.total_size_bytes as f64 / 1_048_576.0;
    let errors = manifest.stats.errors;
    
    let final_msg = if errors > 0 {
        format!("✅ Backup concluído com {} erros! Tamanho total: {:.1} MB — Pasta: {}", errors, total_mb, backup_dir.display())
    } else {
        format!("✅ Backup concluído com sucesso! Tamanho total: {:.1} MB — Pasta: {}", total_mb, backup_dir.display())
    };
    
    emit_log(app, &final_msg, Some(100.0));
    
    Ok(())
}

// ─── Helper: Decrypt the copied database ─────────────────────────────────────

fn decrypt_database_copy(
    db_path: &Path,
    keys: &Option<crate::cmd_auth::UnlockedKeys>,
) -> Result<i64, String> {
    let keys = keys.as_ref().ok_or("Chaves não disponíveis — faça login primeiro")?;
    
    let conn = rusqlite::Connection::open(db_path)
        .map_err(|e| format!("Falha ao abrir cópia: {}", e))?;
    
    let mut total_decrypted: i64 = 0;
    
    // Decrypt pages
    if let Some(ref notes_key) = keys.notes {
        let mut stmt = conn.prepare("SELECT id, encrypted_content FROM pages WHERE encrypted_content IS NOT NULL")
            .map_err(|e| e.to_string())?;
        
        let rows: Vec<(String, String)> = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        }).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        
        for (id, enc) in &rows {
            if let Ok(decrypted) = crate::crypto::decrypt_content(notes_key, enc) {
                let _ = conn.execute(
                    "UPDATE pages SET content = ?, encrypted_content = NULL WHERE id = ?",
                    rusqlite::params![decrypted, id]
                );
                total_decrypted += 1;
            }
        }
    }
    
    // Decrypt page_history
    if let Some(ref notes_key) = keys.notes {
        let mut stmt = conn.prepare("SELECT id, encrypted_content FROM page_history WHERE encrypted_content IS NOT NULL")
            .map_err(|e| e.to_string())?;
        
        let rows: Vec<(String, String)> = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        }).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        
        for (id, enc) in &rows {
            if let Ok(decrypted) = crate::crypto::decrypt_content(notes_key, enc) {
                let _ = conn.execute(
                    "UPDATE page_history SET content = ?, encrypted_content = NULL WHERE id = ?",
                    rusqlite::params![decrypted, id]
                );
                total_decrypted += 1;
            }
        }
    }
    
    // Decrypt diagrams
    if let Some(ref notes_key) = keys.notes {
        let mut stmt = conn.prepare("SELECT id, encrypted_content FROM diagrams WHERE encrypted_content IS NOT NULL")
            .map_err(|e| e.to_string())?;
        
        let rows: Vec<(String, String)> = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        }).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        
        for (id, enc) in &rows {
            if let Ok(decrypted) = crate::crypto::decrypt_content(notes_key, enc) {
                let _ = conn.execute(
                    "UPDATE diagrams SET content = ?, encrypted_content = NULL WHERE id = ?",
                    rusqlite::params![decrypted, id]
                );
                total_decrypted += 1;
            }
        }
    }
    
    // Decrypt files metadata (local_path, drive_file_id)
    if let Some(ref files_key) = keys.files {
        let mut stmt = conn.prepare("SELECT id, local_path, drive_file_id FROM files")
            .map_err(|e| e.to_string())?;
        
        let rows: Vec<(String, Option<String>, Option<String>)> = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        }).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        
        for (id, local_path, drive_id) in &rows {
            let dec_path = local_path.as_ref()
                .and_then(|p| crate::crypto::decrypt_content(files_key, p).ok());
            let dec_drive = drive_id.as_ref()
                .and_then(|d| crate::crypto::decrypt_content(files_key, d).ok());
            
            if dec_path.is_some() || dec_drive.is_some() {
                let _ = conn.execute(
                    "UPDATE files SET local_path = ?, drive_file_id = ? WHERE id = ?",
                    rusqlite::params![
                        dec_path.or_else(|| local_path.clone()),
                        dec_drive.or_else(|| drive_id.clone()),
                        id
                    ]
                );
                total_decrypted += 1;
            }
        }
    }
    
    // Decrypt vault items
    if let Some(ref vault_key) = keys.vault {
        
        let mut stmt = conn.prepare("SELECT id, password, notes, custom_fields FROM vault_items")
            .map_err(|e| e.to_string())?;
        
        let rows: Vec<(String, Option<String>, Option<String>, Option<String>)> = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        }).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        
        for (id, password, notes, custom) in &rows {
            let dec_pass = password.as_ref()
                .and_then(|p| crate::crypto::decrypt_content(vault_key, p).ok());
            let dec_notes = notes.as_ref()
                .and_then(|n| crate::crypto::decrypt_content(vault_key, n).ok());
            let dec_custom = custom.as_ref()
                .and_then(|c| crate::crypto::decrypt_content(vault_key, c).ok());
            
            if dec_pass.is_some() || dec_notes.is_some() || dec_custom.is_some() {
                let _ = conn.execute(
                    "UPDATE vault_items SET password = ?, notes = ?, custom_fields = ? WHERE id = ?",
                    rusqlite::params![
                        dec_pass.or_else(|| password.clone()),
                        dec_notes.or_else(|| notes.clone()),
                        dec_custom.or_else(|| custom.clone()),
                        id
                    ]
                );
                total_decrypted += 1;
            }
        }
        
        // Also decrypt vault password history
        let mut stmt2 = conn.prepare("SELECT id, password FROM vault_password_history")
            .map_err(|e| e.to_string())?;
        
        let rows2: Vec<(String, String)> = stmt2.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        }).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        
        for (id, password) in &rows2 {
            if let Ok(dec) = crate::crypto::decrypt_content(vault_key, password) {
                let _ = conn.execute(
                    "UPDATE vault_password_history SET password = ? WHERE id = ?",
                    rusqlite::params![dec, id]
                );
                total_decrypted += 1;
            }
        }
    }
    
    // Remove the keychain from decrypted backup (no longer needed, and sensitive)
    let _ = conn.execute("DELETE FROM keychain", []);
    
    Ok(total_decrypted)
}

// ─── Helper: Decrypt a .enc media file ───────────────────────────────────────

fn decrypt_media_file(src: &Path, dest: &Path, key_hex: &str) -> Result<u64, String> {
    let result = crate::crypto_stream::read_chunked_range(
        src,
        key_hex,
        0,
        u64::MAX, // Read entire file
    )?;
    
    fs::write(dest, &result.data)
        .map_err(|e| format!("Falha ao escrever arquivo decriptado: {}", e))?;
    
    Ok(result.data.len() as u64)
}

// ─── Helper: Copy file safely ────────────────────────────────────────────────

fn copy_file_safe(src: &Path, dest: &Path) -> Result<u64, String> {
    fs::copy(src, dest).map_err(|e| format!("Falha ao copiar {}: {}", src.display(), e))
}

// ─── Helper: Get the right decryption key for a media directory ──────────────

fn get_key_for_media_dir(dir_name: &str, keys: &Option<crate::cmd_auth::UnlockedKeys>) -> Option<String> {
    let keys = keys.as_ref()?;
    match dir_name {
        "videos" | "lofis" => keys.library.clone(), // Videos/lofis use library key
        "files" => keys.files.clone(),
        "audio" | "anki" => keys.notes.clone(), // Audio clips from notes/anki
        _ => None,
    }
}

// ─── Helper: Increment media stats ──────────────────────────────────────────

fn increment_media_stat(stats: &mut BackupStats, dir_name: &str) {
    match dir_name {
        "videos" | "lofis" => stats.videos_copied += 1,
        "files" => stats.files_copied += 1,
        "audio" | "anki" => stats.audio_copied += 1,
        _ => {}
    }
}

fn get_media_count(stats: &BackupStats, dir_name: &str) -> u32 {
    match dir_name {
        "videos" | "lofis" => stats.videos_copied,
        "files" => stats.files_copied,
        "audio" | "anki" => stats.audio_copied,
        _ => 0,
    }
}

// ─── Helper: Get drive file IDs from the backup DB ───────────────────────────

fn get_drive_file_ids(db_path: &Path) -> Vec<(String, String)> {
    let conn = match rusqlite::Connection::open(db_path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    
    let mut result = Vec::new();
    
    // Videos with drive_file_id
    if let Ok(mut stmt) = conn.prepare("SELECT drive_file_id, title FROM videos WHERE drive_file_id IS NOT NULL AND drive_file_id != ''") {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }) {
            for row in rows.flatten() {
                result.push(row);
            }
        }
    }
    
    // Books with drive_file_id
    if let Ok(mut stmt) = conn.prepare("SELECT drive_file_id, title FROM library_books WHERE drive_file_id IS NOT NULL AND drive_file_id != ''") {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }) {
            for row in rows.flatten() {
                result.push(row);
            }
        }
    }
    
    // Lofis with drive_file_id
    if let Ok(mut stmt) = conn.prepare("SELECT drive_file_id, title FROM lofis WHERE drive_file_id IS NOT NULL AND drive_file_id != ''") {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }) {
            for row in rows.flatten() {
                result.push(row);
            }
        }
    }
    
    result
}

// ─── Helper: Download a file from Google Drive ───────────────────────────────

fn download_drive_file(token: &str, file_id: &str, dest_dir: &Path, file_name: &str) -> Result<u64, String> {
    let url = format!(
        "https://www.googleapis.com/drive/v3/files/{}?alt=media",
        file_id
    );
    
    let client = reqwest::blocking::Client::new();
    let response = client.get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .map_err(|e| format!("Falha no download: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Drive API retornou status {}", response.status()));
    }
    
    let bytes = response.bytes()
        .map_err(|e| format!("Falha ao ler bytes: {}", e))?;
    
    // Sanitize filename
    let safe_name = file_name.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let dest_file = dest_dir.join(&safe_name);
    
    fs::write(&dest_file, &bytes)
        .map_err(|e| format!("Falha ao salvar {}: {}", safe_name, e))?;
    
    Ok(bytes.len() as u64)
}
