use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

use crate::cmd_backup::db::decrypt_database_copy;
use crate::cmd_backup::media_steps::{copy_local_media_step, download_drive_media_step};
use crate::cmd_backup::runner::{emit_log, is_cancelled};
use crate::cmd_backup::types::{BackupManifest, BackupOptions, BackupStats};

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

    // ── Step 1: Validate and create backup folder ─────────────────────────
    emit_log(app, "📁 Criando pasta de backup...", Some(1.0));

    let dest_path = PathBuf::from(&options.destination);
    let canonical_dest = dest_path
        .canonicalize()
        .map_err(|e| format!("Destino de backup inválido: {}", e))?;

    if !canonical_dest.is_dir() {
        return Err("O destino do backup precisa ser uma pasta válida".into());
    }

    let timestamp = chrono::Local::now().format("%Y-%m-%d_%Hh%M").to_string();
    let backup_folder_name = format!("Caderno_Backup_{}", timestamp);
    let backup_dir = canonical_dest.join(&backup_folder_name);

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
    copy_local_media_step(app, options, app_data_dir, &backup_dir, &keys, &mut stats)?;

    if is_cancelled() {
        return Ok(());
    }

    // ── Step 5: Download Drive media ─────────────────────────────────────
    download_drive_media_step(app, options, &dest_db_path, &backup_dir, &mut stats)?;

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
