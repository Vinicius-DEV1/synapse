use tauri::State;
use std::process::Command;
use crate::db::DbState;
use serde_json::Value;

#[tauri::command]
pub fn drive_open_url(url: String) -> Result<(), String> {
    // Escapa a URL para o CMD para que o '&' não seja interpretado como novo comando
    let safe_url = url.replace("&", "^&");
    Command::new("cmd")
        .args(["/C", "start", "", &safe_url])
        .spawn()
        .map_err(|e| format!("Falha ao abrir navegador: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn drive_get_credentials(db_state: State<'_, DbState>) -> Result<Option<Value>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("DB not initialized")?;

    let mut stmt = conn.prepare("SELECT data FROM config WHERE id = 'drive_credentials'").map_err(|e| e.to_string())?;
    let row = stmt.query_row([], |row| row.get::<_, String>(0));
    
    match row {
        Ok(data) => {
            let parsed: Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;
            Ok(Some(parsed))
        },
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub fn drive_save_credentials(data: Value, db_state: State<'_, DbState>) -> Result<(), String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("DB not initialized")?;

    let str_data = serde_json::to_string(&data).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO config (id, data, updated_at) VALUES ('drive_credentials', ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP",
        rusqlite::params![&str_data]
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}
