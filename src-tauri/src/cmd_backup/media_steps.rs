use std::fs;
use std::path::Path;
use tauri::AppHandle;

use crate::cmd_backup::db::get_drive_file_ids;
use crate::cmd_backup::media::{
    copy_file_safe, decrypt_media_file, download_drive_file, get_key_for_media_dir,
    get_media_count, increment_media_stat,
};
use crate::cmd_backup::runner::{emit_log, is_cancelled};
use crate::cmd_backup::types::{BackupOptions, BackupStats};

/// Copies and optionally decrypts local media directories.
pub fn copy_local_media_step(
    app: &AppHandle,
    options: &BackupOptions,
    app_data_dir: &Path,
    backup_dir: &Path,
    keys: &Option<crate::cmd_auth::UnlockedKeys>,
    stats: &mut BackupStats,
) -> Result<(), String> {
    if !options.include_media {
        emit_log(
            app,
            "⏭ Mídias locais não incluídas (opção desativada)",
            Some(70.0),
        );
        return Ok(());
    }

    let media_dirs = [
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
            get_key_for_media_dir(dir_name, keys)
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

            if decrypt_media && file_name.ends_with(".enc") {
                if let Some(ref key) = media_key {
                    let decrypted_name = file_name.trim_end_matches(".enc");
                    let dest_file = dest_media_dir.join(decrypted_name);

                    match decrypt_media_file(&file_path, &dest_file, key) {
                        Ok(size) => {
                            stats.total_size_bytes += size;
                            increment_media_stat(stats, dir_name);
                        }
                        Err(e) => {
                            stats.errors += 1;
                            emit_log(
                                app,
                                &format!("ERRO {}: {}", file_name, e),
                                Some(file_progress),
                            );
                            if let Ok(size) =
                                copy_file_safe(&file_path, &dest_media_dir.join(&file_name))
                            {
                                stats.total_size_bytes += size;
                                increment_media_stat(stats, dir_name);
                            }
                        }
                    }
                } else if let Ok(size) =
                    copy_file_safe(&file_path, &dest_media_dir.join(&file_name))
                {
                    stats.total_size_bytes += size;
                    increment_media_stat(stats, dir_name);
                }
            } else if let Ok(size) = copy_file_safe(&file_path, &dest_media_dir.join(&file_name)) {
                stats.total_size_bytes += size;
                increment_media_stat(stats, dir_name);
            } else {
                stats.errors += 1;
            }

            if (j + 1) % 5 == 0 || j + 1 == total_files {
                emit_log(
                    app,
                    &format!("  {} {}/{}", dir_name, j + 1, total_files),
                    Some(file_progress),
                );
            }
        }

        let count = get_media_count(stats, dir_name);
        emit_log(
            app,
            &format!("✓ {} — {} arquivos copiados", dir_name, count),
            Some(base_progress + progress_per_dir),
        );
    }

    Ok(())
}

/// Downloads media stored on Google Drive referenced in the database.
pub fn download_drive_media_step(
    app: &AppHandle,
    options: &BackupOptions,
    dest_db_path: &Path,
    backup_dir: &Path,
    stats: &mut BackupStats,
) -> Result<(), String> {
    if !options.include_media || options.drive_token.is_none() {
        if options.include_media {
            emit_log(app, "⏭ Download do Drive não solicitado", Some(90.0));
        }
        return Ok(());
    }

    let token = options.drive_token.as_ref().unwrap();
    emit_log(app, "☁️ Baixando mídias do Google Drive...", Some(72.0));

    let drive_files = get_drive_file_ids(dest_db_path);

    if drive_files.is_empty() {
        emit_log(app, "⏭ Nenhuma mídia no Drive encontrada", Some(90.0));
        return Ok(());
    }

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

    Ok(())
}
