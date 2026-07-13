mod crypto;
mod db;
mod cmd_auth;
mod cmd_notes;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let app_data_dir = app.path().app_data_dir().unwrap();
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

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
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
        cmd_notes::image_cache_put
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
