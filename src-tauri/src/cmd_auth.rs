use tauri::State;
use serde::{Deserialize, Serialize};
use crate::db::DbState;
use crate::crypto::{hash_auth_password, decrypt_module_key};

#[derive(Serialize, Deserialize)]
pub struct AuthStatus {
    pub status: String,
}

#[tauri::command]
pub fn auth_status(db_state: State<'_, DbState>) -> Result<AuthStatus, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = match &*guard {
        Some(c) => c,
        None => return Ok(AuthStatus { status: "new".into() }),
    };
    
    let mut stmt = conn.prepare("SELECT count(*) as count FROM keychain")
        .map_err(|e| e.to_string())?;
        
    let count: i64 = stmt.query_row([], |row| row.get(0)).unwrap_or(0);
    
    if count == 0 {
        Ok(AuthStatus { status: "new".into() })
    } else {
        Ok(AuthStatus { status: "encrypted".into() })
    }
}
