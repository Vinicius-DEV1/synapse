use tauri::State;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::db::DbState;
use crate::crypto::{hash_auth_password, decrypt_module_key, encrypt_module_key, generate_module_key};

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

#[derive(Serialize, Deserialize, Clone)]
pub struct UnlockedKeys {
    pub library: Option<String>,
    pub finance: Option<String>,
    pub notes: Option<String>,
    pub culture: Option<String>,
    pub anki: Option<String>,
    pub focus: Option<String>,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub error: Option<String>,
    pub modules: Vec<String>,
    pub keys: Option<UnlockedKeys>,
}

#[tauri::command]
pub fn auth_login(password: String, db_state: State<'_, DbState>) -> Result<LoginResponse, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = match &*guard {
        Some(c) => c,
        None => return Ok(LoginResponse { success: false, error: Some("Banco não inicializado".into()), modules: vec![], keys: None }),
    };
    
    let auth_hash = hash_auth_password(&password);
    
    let mut stmt = conn.prepare("SELECT library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc, focus_key_enc FROM keychain WHERE auth_hash = ?")
        .map_err(|e| e.to_string())?;
        
    let row = match stmt.query_row([&auth_hash], |row| {
        Ok((
            row.get::<_, Option<String>>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, Option<String>>(4)?,
            row.get::<_, Option<String>>(5)?,
        ))
    }) {
        Ok(r) => r,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return Ok(LoginResponse { success: false, error: Some("Senha incorreta".into()), modules: vec![], keys: None });
        },
        Err(e) => return Err(e.to_string())
    };
    
    let dec = |enc: Option<String>| -> Option<String> {
        enc.and_then(|e| decrypt_module_key(&e, &password).ok())
    };
    
    let library = dec(row.0);
    let finance = dec(row.1);
    let notes = dec(row.2);
    // Legacy fallback: se não tiver chave própria, usa a de notas (antigo Electron)
    let culture = dec(row.3).or_else(|| notes.clone());
    let anki = dec(row.4).or_else(|| notes.clone());
    let focus = dec(row.5).or_else(|| notes.clone());
    
    let mut modules = Vec::new();
    if library.is_some() { modules.push("library".into()); }
    if finance.is_some() { modules.push("finance".into()); }
    if notes.is_some() { modules.push("notes".into()); }
    if culture.is_some() { modules.push("culture".into()); }
    if anki.is_some() { modules.push("anki".into()); }
    if focus.is_some() { modules.push("focus".into()); }
    
    let keys_to_return = UnlockedKeys {
        library: library.clone(),
        finance: finance.clone(),
        notes: notes.clone(),
        culture: culture.clone(),
        anki: anki.clone(),
        focus: focus.clone()
    };
    
    // Salva no State
    {
        let mut keys_guard = db_state.keys.lock().unwrap();
        *keys_guard = Some(keys_to_return.clone());
    }
    
    Ok(LoginResponse {
        success: true,
        error: None,
        modules,
        keys: Some(keys_to_return)
    })
}

#[tauri::command]
pub fn auth_setup(password: String, existing_keys: Option<HashMap<String, String>>, db_state: State<'_, DbState>) -> Result<LoginResponse, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = match &*guard {
        Some(c) => c,
        None => return Ok(LoginResponse { success: false, error: Some("Banco nuo inicializado".into()), modules: vec![], keys: None }),
    };
    
    let get_key = |module: &str| -> String {
        if let Some(keys) = &existing_keys {
            if let Some(k) = keys.get(module) {
                return k.clone();
            }
        }
        generate_module_key()
    };

    let library_enc = encrypt_module_key(&get_key("library"), &password)?;
    let finance_enc = encrypt_module_key(&get_key("finance"), &password)?;
    let notes_enc = encrypt_module_key(&get_key("notes"), &password)?;
    let culture_enc = encrypt_module_key(&get_key("culture"), &password)?;
    let anki_enc = encrypt_module_key(&get_key("anki"), &password)?;
    let focus_enc = encrypt_module_key(&get_key("focus"), &password)?;
    
    let auth_hash = hash_auth_password(&password);
    let id = uuid::Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO keychain (id, auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc, focus_key_enc) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![&id, &auth_hash, &library_enc, &finance_enc, &notes_enc, &culture_enc, &anki_enc, &focus_enc],
    ).map_err(|e| e.to_string())?;
    
    drop(guard);
    
    auth_login(password, db_state)
}
