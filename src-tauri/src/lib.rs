mod crypto;
mod db;
mod cmd_auth;
mod cmd_notes;
mod cmd_finance;
mod cmd_library;
mod cmd_calendar;
mod cmd_culture;
mod cmd_anki;
mod cmd_focus;
mod cmd_sync;
mod cmd_binaries;
mod cmd_video;
mod cmd_youtube;
mod cmd_audio;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::new().build())
    .setup(|app| {
      let app_data_dir = std::env::current_exe().unwrap().parent().unwrap().join("data");
      std::fs::create_dir_all(&app_data_dir).unwrap();
      
      let db_path = app_data_dir.join("caderno.sqlite");
      
      // Fallback/Migration: Se o db novo não existe, mas existe o exportado do Electron
      if !db_path.exists() {
          if let Some(data_dir) = dirs::data_dir() {
              let legacy_path = data_dir.join("caderno").join("caderno_migrated.sqlite");
              if legacy_path.exists() {
                  if let Err(e) = std::fs::copy(&legacy_path, &db_path) {
                      println!("Failed to copy legacy db: {}", e);
                  }
              }
          }
      }
      
      let conn = db::init_db(db_path).ok();
      
      app.manage(db::DbState {
          conn: Mutex::new(conn),
          keys: Mutex::new(None),
      });
      
      let app_handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
          if let Err(e) = cmd_binaries::ensure_binaries(&app_handle).await {
              println!("Erro ao baixar binários: {}", e);
          } else {
              println!("Binários multimídia prontos!");
          }
      });

      if cfg!(debug_assertions) {
        // Dev tools or plugins can be added here
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        cmd_auth::auth_status,
        cmd_auth::auth_login,
        cmd_notes::notes_get_all_pages,
        cmd_notes::notes_get_page_content,
        cmd_notes::notes_create_page,
        cmd_notes::notes_update_page,
        cmd_notes::notes_delete_page,
        cmd_notes::image_cache_get,
        cmd_notes::image_cache_put,
        cmd_finance::finance_get_transactions,
        cmd_finance::finance_add_transaction,
        cmd_finance::finance_update_transaction,
        cmd_finance::finance_delete_transaction,
        cmd_finance::finance_get_wishlist,
        cmd_finance::finance_add_wishlist,
        cmd_finance::finance_update_wishlist,
        cmd_finance::finance_delete_wishlist,
        cmd_calendar::calendar_get_events,
        cmd_calendar::calendar_add_event,
        cmd_calendar::calendar_update_event,
        cmd_calendar::calendar_delete_event,
        cmd_library::library_get_books,
        cmd_library::library_add_book,
        cmd_library::library_update_book,
        cmd_library::library_delete_book,
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
        cmd_anki::anki_save_card,
        cmd_anki::anki_get_due_cards,
        cmd_anki::anki_review_card,
        cmd_anki::anki_get_all_cards,
        cmd_anki::anki_delete_card,
        cmd_anki::anki_update_card,
        cmd_focus::focus_get_alarms,
        cmd_focus::focus_create_alarm,
        cmd_focus::focus_update_alarm,
        cmd_focus::focus_delete_alarm,
        cmd_focus::focus_get_sessions,
        cmd_focus::focus_create_session,
        cmd_sync::sync_get_table,
        cmd_sync::sync_delete_row,
        cmd_sync::sync_upsert_row,
        cmd_binaries::check_binaries_status,
        cmd_binaries::force_download_binaries,
        cmd_video::video_get_local_path,
        cmd_video::video_delete_local,
        cmd_video::video_scan_tracks,
        cmd_video::video_extract_subtitles,
        cmd_video::video_extract_audio,
        cmd_video::video_remux_default_track,
        cmd_youtube::youtube_fetch_info,
        cmd_youtube::youtube_download,
        cmd_audio::audio_extract_clip,
        cmd_audio::audio_generate_tts,
        cmd_audio::lofi_get_local_path,
        cmd_audio::lofi_delete_local,
        cmd_audio::lofi_save_local,
        cmd_audio::lofi_copy_local
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
