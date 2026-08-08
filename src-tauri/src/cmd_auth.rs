use tauri::State;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::db::DbState;
use crate::crypto::{hash_auth_password, decrypt_module_key_with_key, encrypt_module_key_with_key, encrypt_module_key, generate_module_key, derive_key_from_password, derive_key_from_password_legacy};

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

#[tauri::command]
pub fn auth_wipe_local_data(app: tauri::AppHandle, db_state: tauri::State<'_, crate::db::DbState>) -> Result<(), String> {
    {
        let mut guard = db_state.conn.lock().unwrap();
        *guard = None; // Drop SQLite connection
    }
    
    let app_data_dir = crate::get_app_data_dir();
    
    if let Ok(entries) = std::fs::read_dir(&app_data_dir) {
        for entry in entries {
            if let Ok(e) = entry {
                let path = e.path();
                let file_name = path.file_name().unwrap_or_default().to_string_lossy();
                if file_name != "bin" {
                    if path.is_dir() {
                        let _ = std::fs::remove_dir_all(&path);
                    } else {
                        let _ = std::fs::remove_file(&path);
                    }
                }
            }
        }
    }
    
    app.restart();
}

#[derive(Serialize, Deserialize, Clone)]
pub struct UnlockedKeys {
    pub library: Option<String>,
    pub finance: Option<String>,
    pub notes: Option<String>,
    pub culture: Option<String>,
    pub anki: Option<String>,
    pub focus: Option<String>,
    pub files: Option<String>,
    pub vault: Option<String>,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub error: Option<String>,
    pub modules: Vec<String>,
    pub keys: Option<UnlockedKeys>,
}

#[tauri::command]
pub async fn auth_login(password: String, db_state: State<'_, DbState>) -> Result<LoginResponse, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = match &*guard {
        Some(c) => c,
        None => return Ok(LoginResponse { success: false, error: Some("Banco não inicializado".into()), modules: vec![], keys: None }),
    };
    
    let auth_hash = hash_auth_password(&password);
    
    // Derivar as chaves PBKDF2 apenas UMA VEZ (operação cara ~1s)
    let modern_key = derive_key_from_password(&password);
    let legacy_key = derive_key_from_password_legacy(&password);
    
    let mut stmt = conn.prepare("SELECT auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc, focus_key_enc, files_key_enc, vault_key_enc FROM keychain LIMIT 1")
        .map_err(|e| e.to_string())?;
        
    let row_data = match stmt.query_row([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, Option<String>>(4)?,
            row.get::<_, Option<String>>(5)?,
            row.get::<_, Option<String>>(6)?,
            row.get::<_, Option<String>>(7).unwrap_or(None),
            row.get::<_, Option<String>>(8).unwrap_or(None),
        ))
    }) {
        Ok(r) => r,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return Ok(LoginResponse { success: false, error: Some("Senha incorreta".into()), modules: vec![], keys: None });
        },
        Err(e) => return Err(e.to_string())
    };

    let mut is_valid = false;
    let mut is_legacy = false;

    if row_data.0 == auth_hash {
        is_valid = true;
    } else {
        // Fallback: testa se a senha descriptografa as chaves
        let test_enc = row_data.1.as_ref().or(row_data.3.as_ref());
        if let Some(enc) = test_enc {
            if decrypt_module_key_with_key(enc, &modern_key).is_ok() {
                is_valid = true;
            } else if decrypt_module_key_with_key(enc, &legacy_key).is_ok() {
                is_valid = true;
                is_legacy = true;
            }
            if is_valid {
                let _ = conn.execute("UPDATE keychain SET auth_hash = ?", rusqlite::params![&auth_hash]);
            }
        }
    }

    if !is_valid {
        return Ok(LoginResponse { success: false, error: Some("Senha incorreta".into()), modules: vec![], keys: None });
    }
    
    // Escolhe a chave correta para decriptar (reutiliza a já derivada!)
    // let active_key = if is_legacy { &legacy_key } else { &modern_key };
    // Se não sabemos se é legacy, tenta modern primeiro
    let try_decrypt = |enc: &Option<String>| -> (Option<String>, bool) {
        if let Some(e) = enc {
            if let Ok(dec) = decrypt_module_key_with_key(e, &modern_key) {
                return (Some(dec), false);
            }
            if let Ok(dec) = decrypt_module_key_with_key(e, &legacy_key) {
                return (Some(dec), true);
            }
        }
        (None, false)
    };
    
    let (library, lib_legacy) = try_decrypt(&row_data.1);
    let (finance, fin_legacy) = try_decrypt(&row_data.2);
    let (notes, not_legacy) = try_decrypt(&row_data.3);
    let (culture, cul_legacy) = { let r = try_decrypt(&row_data.4); if r.0.is_some() { r } else { (notes.clone(), false) } };
    let (anki, ank_legacy) = { let r = try_decrypt(&row_data.5); if r.0.is_some() { r } else { (notes.clone(), false) } };
    let (focus, foc_legacy) = { let r = try_decrypt(&row_data.6); if r.0.is_some() { r } else { (notes.clone(), false) } };
    let (files, fil_legacy) = { let r = try_decrypt(&row_data.7); if r.0.is_some() { r } else { (notes.clone(), false) } };
    let (vault, vlt_legacy) = { let r = try_decrypt(&row_data.8); if r.0.is_some() { r } else { (notes.clone(), false) } };
    
    let any_legacy = is_legacy || lib_legacy || fin_legacy || not_legacy || cul_legacy || ank_legacy || foc_legacy || fil_legacy || vlt_legacy;
    
    // Se usou 100k iterações em qualquer chave, migramos todas para 600k agora mesmo!
    if any_legacy {
        println!("Migrating PBKDF2 iterations from 100k to 600k!");
        let enc_opt = |val: &Option<String>| -> Option<String> {
            val.as_ref().and_then(|v| encrypt_module_key_with_key(v, &modern_key).ok())
        };
        
        let _ = conn.execute(
            "UPDATE keychain SET library_key_enc = ?, finance_key_enc = ?, notes_key_enc = ?, culture_key_enc = ?, anki_key_enc = ?, focus_key_enc = ?, files_key_enc = ?, vault_key_enc = ?",
            rusqlite::params![
                enc_opt(&library),
                enc_opt(&finance),
                enc_opt(&notes),
                enc_opt(&culture),
                enc_opt(&anki),
                enc_opt(&focus),
                enc_opt(&files),
                enc_opt(&vault)
            ]
        );
    }
    
    let mut modules = Vec::new();
    if library.is_some() { modules.push("library".into()); }
    if finance.is_some() { modules.push("finance".into()); }
    if notes.is_some() { modules.push("notes".into()); }
    if culture.is_some() { modules.push("culture".into()); }
    if anki.is_some() { modules.push("anki".into()); }
    if focus.is_some() { modules.push("focus".into()); }
    if files.is_some() { modules.push("files".into()); }
    if vault.is_some() { modules.push("vault".into()); }
    
    let keys_to_return = UnlockedKeys {
        library: library.clone(),
        finance: finance.clone(),
        notes: notes.clone(),
        culture: culture.clone(),
        anki: anki.clone(),
        focus: focus.clone(),
        files: files.clone(),
        vault: vault.clone()
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
pub async fn auth_setup(password: String, existing_keys: Option<HashMap<String, String>>, db_state: State<'_, DbState>) -> Result<LoginResponse, String> {
    {
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
        let files_enc = encrypt_module_key(&get_key("files"), &password)?;
        let vault_enc = encrypt_module_key(&get_key("vault"), &password)?;
        
        let auth_hash = hash_auth_password(&password);
        let id = uuid::Uuid::new_v4().to_string();
        
        conn.execute(
            "INSERT INTO keychain (id, auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc, focus_key_enc, files_key_enc, vault_key_enc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![&id, &auth_hash, &library_enc, &finance_enc, &notes_enc, &culture_enc, &anki_enc, &focus_enc, &files_enc, &vault_enc],
        ).map_err(|e| e.to_string())?;
    }
    
    auth_login(password, db_state).await
}

#[tauri::command]
pub fn app_open_devtools(window: tauri::WebviewWindow) {
    window.open_devtools();
}
