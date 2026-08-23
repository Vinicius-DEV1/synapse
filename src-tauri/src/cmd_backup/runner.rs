use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};

use crate::cmd_backup::db::{decrypt_database_copy, get_drive_file_ids};
use crate::cmd_backup::media::{
    copy_file_safe, decrypt_media_file, download_drive_file, get_key_for_media_dir,
    get_media_count, increment_media_stat,
};
use crate::cmd_backup::types::{
    BackupLogPayload, BackupManifest, BackupOptions, BackupResult, BackupStats,
};
use crate::db::DbState;

static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

pub fn is_cancelled() -> bool {
    CANCEL_FLAG.load(Ordering::Relaxed)
}

pub fn emit_log(app: &AppHandle, message: &str, progress: Option<f64>) {
    let _ = app.emit(
        "backup-log",
        BackupLogPayload {
            message: message.to_string(),
            progress,
        },
    );
}

/// Displays a native folder picker dialog for selecting the backup destination directory.
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

/// Initiates an asynchronous backup job on a background runtime task.
#[tauri::command]
pub async fn backup_start(
    options: BackupOptions,
    db_state: tauri::State<'_, DbState>,
    app: AppHandle,
) -> Result<BackupResult, String> {
    // Reset cancel flag
    CANCEL_FLAG.store(false, Ordering::Relaxed);

    // Clone keys from state for the background thread
    let keys = {
        let keys_guard = db_state.keys.lock().unwrap();
        keys_guard.clone()
    };

    // Retrieve active database path
    let app_data_dir = crate::get_app_data_dir();
    let db_path = app_data_dir.join("caderno.sqlite");

    if !db_path.exists() {
        return Err("Database file not found".into());
    }

    let app_data_dir_clone = app_data_dir.clone();
    let app_clone = app.clone();

    // Spawn the backup execution in a separate async task
    tauri::async_runtime::spawn(async move {
        let result = run_backup(&app_clone, &options, &app_data_dir_clone, &db_path, keys);

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

/// Sets the cancellation flag to abort any running backup job.
#[tauri::command]
pub fn backup_cancel() -> Result<bool, String> {
    CANCEL_FLAG.store(true, Ordering::Relaxed);
    Ok(true)
}

/// Orchestrates the end-to-end backup pipeline (DB checkpoint, copy, decryption, media, Drive and manifest).
pub fn run_backup(
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

    fs::create_dir_all(&backup_dir).map_err(|e| format!("Falha ao criar pasta: {}", e))?;

    if is_cancelled() {
        return Ok(());
    }

    // ── Step 2: Checkpoint WAL and copy database ─────────────────────────
    emit_log(app, "💾 Preparando banco de dados...", Some(3.0));

    // Open a temporary connection to perform WAL checkpoint
    {
        let conn = rusqlite::Connection::open(db_path)
            .map_err(|e| format!("Falha ao abrir DB para checkpoint: {}", e))?;
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| format!("Falha no checkpoint WAL: {}", e))?;
    }

    let dest_db_path = backup_dir.join("caderno.sqlite");
    fs::copy(db_path, &dest_db_path).map_err(|e| format!("Falha ao copiar banco: {}", e))?;

    stats.db_size_bytes = fs::metadata(&dest_db_path).map(|m| m.len()).unwrap_or(0);
    stats.total_size_bytes += stats.db_size_bytes;

    // Also copy WAL/SHM if they exist
    let wal_path = db_path.with_extension("sqlite-wal");
    let shm_path = db_path.with_extension("sqlite-shm");
    if wal_path.exists() {
        let _ = fs::copy(&wal_path, backup_dir.join("caderno.sqlite-wal"));
    }
    if shm_path.exists() {
        let _ = fs::copy(&shm_path, backup_dir.join("caderno.sqlite-shm"));
    }

    emit_log(
        app,
        &format!(
            "✓ Banco de dados copiado ({:.1} MB)",
            stats.db_size_bytes as f64 / 1_048_576.0
        ),
        Some(10.0),
    );

    if is_cancelled() {
        return Ok(());
    }

    // ── Step 3: Decrypt database if requested ────────────────────────────
    if options.backup_type == "decrypted" {
        emit_log(app, "🔓 Descriptografando banco de dados...", Some(12.0));

        match decrypt_database_copy(&dest_db_path, &keys) {
            Ok(count) => {
                stats.pages_count = count;
                emit_log(
                    app,
                    &format!("✓ {} registros descriptografados", count),
                    Some(18.0),
                );
            }
            Err(e) => {
                stats.errors += 1;
                emit_log(
                    app,
                    &format!("ERRO ao descriptografar DB: {}", e),
                    Some(18.0),
                );
            }
        }
    } else {
        // Count active pages for statistics
        if let Ok(conn) = rusqlite::Connection::open(&dest_db_path) {
            stats.pages_count = conn
                .query_row(
                    "SELECT COUNT(*) FROM pages WHERE deleted_at IS NULL",
                    [],
                    |r| r.get(0),
                )
                .unwrap_or(0);
        }
        emit_log(
            app,
            &format!(
                "✓ Banco mantido criptografado ({} páginas)",
                stats.pages_count
            ),
            Some(18.0),
        );
    }

    if is_cancelled() {
        return Ok(());
    }

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
            if is_cancelled() {
                return Ok(());
            }

            let source_dir = app_data_dir.join(dir_name);
            let base_progress = 20.0 + (i as f64 * progress_per_dir);

            if !source_dir.exists() || !source_dir.is_dir() {
                emit_log(
                    app,
                    &format!("⏭ Pasta {} não existe, pulando...", dir_name),
                    Some(base_progress + progress_per_dir),
                );
                continue;
            }

            let entries: Vec<_> = fs::read_dir(&source_dir)
                .map(|rd| rd.filter_map(|e| e.ok()).collect())
                .unwrap_or_default();

            if entries.is_empty() {
                emit_log(
                    app,
                    &format!("⏭ Pasta {} vazia, pulando...", dir_name),
                    Some(base_progress + progress_per_dir),
                );
                continue;
            }

            let dest_media_dir = backup_dir.join(dir_name);
            fs::create_dir_all(&dest_media_dir).map_err(|e| e.to_string())?;

            let total_files = entries.len();
            emit_log(
                app,
                &format!("{} ({} arquivos)...", label, total_files),
                Some(base_progress),
            );

            let decrypt_media = options.backup_type == "decrypted";
            let media_key = if decrypt_media {
                get_key_for_media_dir(dir_name, &keys)
            } else {
                None
            };

            for (j, entry) in entries.iter().enumerate() {
                if is_cancelled() {
                    return Ok(());
                }

                let file_path = entry.path();
                if !file_path.is_file() {
                    continue;
                }

                let file_name = file_path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let file_progress =
                    base_progress + ((j as f64 / total_files as f64) * progress_per_dir);

                // If decrypted mode and file is encrypted (.enc), decrypt it
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
                                emit_log(
                                    app,
                                    &format!("ERRO {}: {}", file_name, e),
                                    Some(file_progress),
                                );
                                // Fallback: copy encrypted file as-is
                                if let Ok(size) =
                                    copy_file_safe(&file_path, &dest_media_dir.join(&file_name))
                                {
                                    stats.total_size_bytes += size;
                                    increment_media_stat(&mut stats, dir_name);
                                }
                            }
                        }
                    } else {
                        // No key available, copy as-is
                        if let Ok(size) =
                            copy_file_safe(&file_path, &dest_media_dir.join(&file_name))
                        {
                            stats.total_size_bytes += size;
                            increment_media_stat(&mut stats, dir_name);
                        }
                    }
                } else {
                    // Non-encrypted file, direct copy
                    if let Ok(size) = copy_file_safe(&file_path, &dest_media_dir.join(&file_name)) {
                        stats.total_size_bytes += size;
                        increment_media_stat(&mut stats, dir_name);
                    } else {
                        stats.errors += 1;
                    }
                }

                if (j + 1) % 5 == 0 || j + 1 == total_files {
                    emit_log(
                        app,
                        &format!("  {} {}/{}", dir_name, j + 1, total_files),
                        Some(file_progress),
                    );
                }
            }

            let count = get_media_count(&stats, dir_name);
            emit_log(
                app,
                &format!("✓ {} — {} arquivos copiados", dir_name, count),
                Some(base_progress + progress_per_dir),
            );
        }
    } else {
        emit_log(
            app,
            "⏭ Mídias locais não incluídas (opção desativada)",
            Some(70.0),
        );
    }

    if is_cancelled() {
        return Ok(());
    }

    // ── Step 5: Download Drive media ─────────────────────────────────────
    if options.include_media && options.drive_token.is_some() {
        let token = options.drive_token.as_ref().unwrap();
        emit_log(app, "☁️ Baixando mídias do Google Drive...", Some(72.0));

        let drive_files = get_drive_file_ids(&dest_db_path);

        if drive_files.is_empty() {
            emit_log(app, "⏭ Nenhuma mídia no Drive encontrada", Some(90.0));
        } else {
            let drive_dir = backup_dir.join("drive");
            fs::create_dir_all(&drive_dir).map_err(|e| e.to_string())?;

            let total = drive_files.len();
            emit_log(
                app,
                &format!("☁️ {} arquivos para baixar do Drive", total),
                Some(73.0),
            );

            for (i, (file_id, file_name)) in drive_files.iter().enumerate() {
                if is_cancelled() {
                    return Ok(());
                }

                let progress = 73.0 + ((i as f64 / total as f64) * 17.0); // 73% → 90%
                emit_log(
                    app,
                    &format!("  ⬇ Baixando {}/{}: {}", i + 1, total, file_name),
                    Some(progress),
                );

                match download_drive_file(token, file_id, &drive_dir, file_name) {
                    Ok(size) => {
                        stats.drive_downloaded += 1;
                        stats.total_size_bytes += size;
                    }
                    Err(e) => {
                        stats.errors += 1;
                        emit_log(
                            app,
                            &format!("ERRO ao baixar {}: {}", file_name, e),
                            Some(progress),
                        );
                    }
                }
            }

            emit_log(
                app,
                &format!("✓ Drive — {} arquivos baixados", stats.drive_downloaded),
                Some(90.0),
            );
        }
    } else if options.include_media {
        emit_log(app, "⏭ Download do Drive não solicitado", Some(90.0));
    }

    if is_cancelled() {
        return Ok(());
    }

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
        format!(
            "✅ Backup concluído com {} erros! Tamanho total: {:.1} MB — Pasta: {}",
            errors,
            total_mb,
            backup_dir.display()
        )
    } else {
        format!(
            "✅ Backup concluído com sucesso! Tamanho total: {:.1} MB — Pasta: {}",
            total_mb,
            backup_dir.display()
        )
    };

    emit_log(app, &final_msg, Some(100.0));

    Ok(())
}
