use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};

use crate::cmd_backup::types::{
    BackupLogPayload, BackupOptions, BackupResult,
};
use crate::db::DbState;

pub use crate::cmd_backup::pipeline::run_backup;

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

    // Safely clone keys from state for the background thread without mutex panics
    let keys = {
        let keys_guard = db_state.lock_keys()?;
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
