mod crypto;
mod db;
mod cmd_auth;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let app_data_dir = app.path().app_data_dir().unwrap();
      std::fs::create_dir_all(&app_data_dir).unwrap();
      
      let conn = db::init_db(app_data_dir).ok();
      
      app.manage(db::DbState {
          conn: Mutex::new(conn),
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
        cmd_auth::auth_status
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
