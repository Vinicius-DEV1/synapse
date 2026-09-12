mod cmd_anki;
mod cmd_audio;
mod cmd_auth;
mod cmd_backup;
mod cmd_binaries;
mod cmd_calendar;
mod cmd_culture;
mod cmd_diagrams;
mod cmd_drive;
mod cmd_files;
mod cmd_finance;
mod cmd_focus;
mod cmd_library;
mod cmd_notes;
mod cmd_notifications;
mod cmd_practice;
mod cmd_stream;
mod cmd_sync;
mod cmd_trash;
mod cmd_vault;
mod cmd_video;
mod cmd_youtube;
mod cmd_scraps;
pub mod crypto;
pub mod crypto_stream;
pub mod video_probe;
pub mod vault_security;
pub mod library_stats;
pub mod notes_history;
pub mod file_links;
pub mod anki_fsrs;
mod db;
pub mod protocol_encrypted;
use std::sync::{Mutex, OnceLock};
use tauri::Manager;

static APP_DATA_DIR: OnceLock<std::path::PathBuf> = OnceLock::new();

/// Copies all files and directories recursively from src to dst.
fn copy_dir_all(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            let target_file = dst.join(entry.file_name());
            if !target_file.exists() {
                let _ = std::fs::copy(entry.path(), target_file);
            }
        }
    }
    Ok(())
}

/// Automatically migrates data from the legacy data dir (~/.local/share/caderno) to canonical app_data_dir if needed.
fn migrate_legacy_data_dir(canonical_dir: &std::path::Path) {
    if let Some(data_dir) = dirs::data_dir() {
        let legacy_dir = data_dir.join("caderno");
        if legacy_dir.exists() && legacy_dir != canonical_dir {
            let canonical_db = canonical_dir.join("caderno.sqlite");
            let legacy_db = legacy_dir.join("caderno.sqlite");

            if !canonical_db.exists() && legacy_db.exists() {
                println!("[Migration] Migrando dados legados de {:?} para {:?}", legacy_dir, canonical_dir);
                let _ = std::fs::create_dir_all(canonical_dir);
                if let Ok(entries) = std::fs::read_dir(&legacy_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        let target = canonical_dir.join(entry.file_name());
                        if !target.exists() {
                            if path.is_dir() {
                                let _ = copy_dir_all(&path, &target);
                            } else {
                                let _ = std::fs::copy(&path, &target);
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Initializes the Single Source of Truth directory path for the app.
pub fn init_app_data_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    let dir = APP_DATA_DIR.get_or_init(|| {
        // 1. Portable Mode: ./data alongside the binary
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                let local_data = parent.join("data");
                if local_data.exists() {
                    let test_file = local_data.join(".write_test");
                    if std::fs::write(&test_file, b"test").is_ok() {
                        let _ = std::fs::remove_file(&test_file);
                        return local_data;
                    }
                }
            }
        }

        // 2. Canonical Tauri App Data Dir
        if let Ok(p) = app.path().app_data_dir() {
            let _ = std::fs::create_dir_all(&p);
            return p;
        }

        // 3. Fallback
        if let Some(data_dir) = dirs::data_dir() {
            let p = data_dir.join("com.caderno.app");
            let _ = std::fs::create_dir_all(&p);
            return p;
        }

        std::path::PathBuf::from("data")
    });
    dir.clone()
}

/// Returns the Single Source of Truth canonical data directory.
pub fn get_app_data_dir() -> std::path::PathBuf {
    if let Some(dir) = APP_DATA_DIR.get() {
        return dir.clone();
    }
    // Fallback if accessed before setup initialization
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let local_data = parent.join("data");
            if local_data.exists() {
                return local_data;
            }
        }
    }
    if let Some(config_dir) = dirs::config_dir() {
        return config_dir.join("com.caderno.app");
    }
    if let Some(data_dir) = dirs::data_dir() {
        return data_dir.join("com.caderno.app");
    }
    std::path::PathBuf::from("data")
}

#[tauri::command]
fn app_window_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn app_window_toggle_maximize(window: tauri::Window) -> Result<bool, String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        window.maximize().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
fn app_window_close(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
fn app_window_start_dragging(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .level_for("h2", log::LevelFilter::Warn)
                .level_for("hyper", log::LevelFilter::Warn)
                .level_for("reqwest", log::LevelFilter::Warn)
                .level_for("tracing", log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .register_uri_scheme_protocol("encrypted", |ctx, req| {
            protocol_encrypted::handle_encrypted_protocol(ctx.app_handle(), req)
        })
        .setup(|app| {
            let app_data_dir = init_app_data_dir(app.handle());
            migrate_legacy_data_dir(&app_data_dir);
            std::fs::create_dir_all(&app_data_dir).unwrap();

            let db_path = app_data_dir.join("caderno.sqlite");

            // Clean SQLite database initialization
            let conn = db::init_db(db_path).ok();

            app.manage(db::DbState {
                conn: Mutex::new(conn),
                keys: Mutex::new(None),
            });

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = cmd_binaries::ensure_binaries(&app_handle).await {
                    println!("Erro ao baixar binários: {}", e);
                }

                match cmd_stream::start_stream_server(app_handle.clone()).await {
                    Ok(port) => {
                        println!("Stream server rodando na porta {}", port);
                        app_handle.manage(cmd_stream::StreamPortState(port));
                    }
                    Err(e) => {
                        println!("Erro ao iniciar stream server: {}", e);
                    }
                }
            });

            #[cfg(target_os = "linux")]
            {
                for (_label, window) in app.webview_windows() {
                    let _ = window.with_webview(|webview| {
                        use webkit2gtk::{PermissionRequestExt, SettingsExt, WebViewExt};
                        let wv = webview.inner();
                        if let Some(settings) = wv.settings() {
                            settings.set_enable_webrtc(true);
                            settings.set_enable_media_stream(true);
                        }
                        wv.connect_permission_request(|view, request| {
                            let uri = view.uri().map(|u| u.to_string()).unwrap_or_default();
                            let is_trusted_origin = uri.starts_with("tauri://")
                                || uri.starts_with("http://localhost")
                                || uri.starts_with("http://127.0.0.1");

                            if is_trusted_origin {
                                request.allow();
                            } else {
                                println!("[WebKitGTK] Bloqueando permissão de mídia para origem não confiável: {:?}", uri);
                                request.deny();
                            }
                            true
                        });
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_window_minimize,
            app_window_toggle_maximize,
            app_window_close,
            app_window_start_dragging,
            cmd_auth::get_base_dir,
            cmd_auth::auth_status,
            cmd_auth::auth_login,
            cmd_auth::auth_lock,
            cmd_auth::auth_setup,
            cmd_auth::auth_wipe_local_data,
            cmd_auth::auth_force_update_keychain,
            cmd_auth::app_open_devtools,
            cmd_notes::notes_get_all_pages,
            cmd_notes::notes_get_page_content,
            cmd_notes::notes_create_page,
            cmd_notes::notes_update_page,
            notes_history::notes_get_page_history,
            cmd_notes::notes_delete_page,
            cmd_notes::notes_get_deleted_pages,
            cmd_notes::notes_restore_page,
            notes_history::image_cache_get,
            notes_history::image_cache_put,
            notes_history::image_cache_delete,
            notes_history::notes_cleanup_orphaned_images,
            cmd_finance::finance_get_transactions,
            cmd_finance::finance_add_transaction,
            cmd_finance::finance_update_transaction,
            cmd_finance::finance_delete_transaction,
            cmd_finance::finance_get_wishlist,
            cmd_finance::finance_add_wishlist,
            cmd_finance::finance_update_wishlist,
            cmd_finance::finance_delete_wishlist,
            cmd_finance::finance_get_accounts,
            cmd_finance::finance_add_account,
            cmd_finance::finance_update_account,
            cmd_finance::finance_delete_account,
            cmd_calendar::calendar_get_events,
            cmd_calendar::calendar_add_event,
            cmd_calendar::calendar_update_event,
            cmd_calendar::calendar_delete_event,
            cmd_notifications::notifications_get_all,
            cmd_notifications::notifications_add,
            cmd_notifications::notifications_mark_read,
            cmd_notifications::notifications_delete,
            cmd_library::library_get_books,
            cmd_library::library_add_book,
            cmd_library::library_update_book,
            cmd_library::library_delete_book,
            cmd_library::library_get_book_file,
            cmd_library::library_evict_book_local_cache,
            cmd_library::library_import_and_encrypt_book,
            cmd_library::library_get_collections,
            cmd_library::library_add_collection,
            cmd_library::library_update_collection,
            cmd_library::library_delete_collection,
            cmd_library::library_add_book_to_collection,
            cmd_library::library_remove_book_from_collection,
            cmd_culture::culture_get_items,
            cmd_culture::culture_create_item,
            cmd_culture::culture_update_item,
            cmd_culture::culture_delete_item,
            cmd_culture::culture_update_progress,
            cmd_culture::culture_get_episodes,
            cmd_culture::culture_save_episodes,
            cmd_culture::culture_toggle_episode_watched,
            cmd_anki::anki_get_decks,
            cmd_anki::anki_create_deck,
            cmd_anki::anki_get_deck_settings,
            cmd_anki::anki_update_deck_settings,
            cmd_anki::anki_save_card,
            cmd_anki::anki_get_all_cards,
            cmd_anki::anki_get_card,
            anki_fsrs::anki_review_card_fsrs,
            cmd_anki::anki_delete_card,
            cmd_anki::anki_update_card,
            cmd_anki::anki_update_deck,
            cmd_anki::anki_delete_deck,
            anki_fsrs::anki_reset_deck,
            cmd_focus::focus_get_alarms,
            cmd_focus::focus_create_alarm,
            cmd_focus::focus_update_alarm,
            cmd_focus::focus_delete_alarm,
            cmd_focus::focus_get_sessions,
            cmd_focus::focus_create_session,
            cmd_sync::sync_get_table,
            cmd_sync::sync_delete_row,
            cmd_sync::sync_upsert_row,
            cmd_sync::sync_get_rows_by_ids,
            cmd_binaries::check_binaries_status,
            cmd_binaries::force_download_binaries,
            cmd_stream::video_get_stream_port,
            cmd_video::video_get_local_path,
            cmd_video::video_get_storage_stats,
            cmd_video::os_show_in_folder,
            cmd_video::video_read_file,
            cmd_video::video_upload_file_to_drive,
            cmd_video::video_delete_local,
            cmd_video::video_import_and_encrypt,
            cmd_video::video_process_upload,
            cmd_video::video_generate_web,
            cmd_video::video_save_local, cmd_video::video_download_drive_file,
            cmd_video::video_scan_tracks,
            cmd_video::video_extract_subtitles,
            cmd_video::video_extract_audio,
            cmd_video::video_remux_default_track,
            cmd_video::video_convert_mp4,
            cmd_video::video_cancel_conversion,
            cmd_youtube::youtube_fetch_info,
            cmd_youtube::youtube_fetch_playlist_info,
            cmd_youtube::youtube_fetch_transcript,
            cmd_youtube::youtube_get_summary,
            cmd_youtube::youtube_save_summary,
            cmd_youtube::youtube_get_stream,
            cmd_youtube::youtube_extract_frames,
            cmd_youtube::youtube_get_watched,
            cmd_youtube::youtube_set_watched,
            cmd_youtube::youtube_download,
            cmd_audio::audio_extract_clip,
            cmd_audio::audio_generate_tts,
            cmd_audio::lofi_get_local_path,
            cmd_audio::lofi_delete_local,
            cmd_audio::lofi_save_local,
            cmd_audio::lofi_copy_local,
            cmd_audio::lofi_download_drive_file,
            cmd_drive::drive_open_url,
            cmd_drive::drive_get_credentials,
            cmd_drive::drive_save_credentials,
            cmd_library::library_get_highlights,
            cmd_library::library_create_highlight,
            cmd_library::library_update_highlight,
            cmd_library::library_delete_highlight,
            cmd_library::library_get_bookmarks,
            cmd_library::library_create_bookmark,
            cmd_library::library_update_bookmark,
            cmd_library::library_delete_bookmark,
            cmd_library::library_get_book_collections,
            cmd_library::library_get_all_book_collections,
            cmd_library::library_set_book_collections,
            cmd_library::library_create_collection,
            library_stats::library_get_ocr_cache,
            library_stats::library_save_ocr_cache,
            library_stats::library_start_reading_session,
            library_stats::library_end_reading_session,
            library_stats::library_get_reading_stats,
            cmd_files::files_get_all,
            cmd_files::files_get_by_id,
            cmd_files::files_create,
            cmd_files::files_update,
            cmd_files::files_delete,
            cmd_files::files_move,
            cmd_files::files_save_local,
            cmd_files::files_get_local,
            cmd_files::read_local_binary_file,
            cmd_files::file_folders_get_all,
            cmd_files::file_folders_create,
            cmd_files::file_folders_update,
            cmd_files::file_folders_delete,
            file_links::file_links_get_by_page,
            file_links::file_links_get_by_file,
            file_links::file_links_create,
            file_links::file_links_delete,
            cmd_vault::vault_get_groups,
            cmd_vault::vault_upsert_group,
            cmd_vault::vault_delete_group,
            cmd_vault::vault_get_items,
            cmd_vault::vault_get_item,
            cmd_vault::vault_upsert_item,
            cmd_vault::vault_delete_item,
            cmd_vault::vault_search_items,
            cmd_vault::vault_get_password_history,
            cmd_vault::vault_generate_password,
            vault_security::vault_check_breach,
            vault_security::vault_check_strength,
            cmd_vault::vault_reorder_groups,
            cmd_practice::practice_get_sessions,
            cmd_practice::practice_create_session,
            cmd_practice::practice_update_session,
            cmd_practice::practice_get_messages,
            cmd_practice::practice_create_message,
            cmd_practice::practice_get_memories,
            cmd_practice::practice_create_memory,
            cmd_practice::practice_delete_memory,
            cmd_trash::trash_get_all,
            cmd_trash::trash_restore,
            cmd_trash::trash_empty,
            cmd_trash::trash_delete_permanently,
            cmd_diagrams::diagrams_get_all,
            cmd_diagrams::diagrams_get_content,
            cmd_diagrams::diagrams_create,
            cmd_diagrams::diagrams_update,
            cmd_diagrams::diagrams_delete,
            cmd_backup::backup_select_folder,
            cmd_backup::backup_start,
            cmd_backup::backup_cancel,
            cmd_scraps::scrap_capture_page,
            cmd_scraps::scrap_delete_local
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
