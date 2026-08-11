use crate::crypto::{
    decrypt_module_key_with_key, derive_key_from_password,
    encrypt_module_key, encrypt_module_key_with_key, generate_module_key, hash_auth_password,
};
use crate::db::DbState;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

#[derive(Serialize, Deserialize)]
pub struct AuthStatus {
    pub status: String,
}

#[tauri::command]
pub fn auth_status(db_state: State<'_, DbState>) -> Result<AuthStatus, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = match &*guard {
        Some(c) => c,
        None => {
            return Ok(AuthStatus {
                status: "new".into(),
            })
        }
    };

    let mut stmt = conn
        .prepare("SELECT count(*) as count FROM keychain")
        .map_err(|e| e.to_string())?;

    let count: i64 = stmt.query_row([], |row| row.get(0)).unwrap_or(0);

    if count == 0 {
        Ok(AuthStatus {
            status: "new".into(),
        })
    } else {
        Ok(AuthStatus {
            status: "encrypted".into(),
        })
    }
}

#[tauri::command]
pub fn auth_wipe_local_data(
    app: tauri::AppHandle,
    db_state: tauri::State<'_, crate::db::DbState>,
) -> Result<(), String> {
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
    pub calendar: Option<String>,
    pub practice: Option<String>,
    pub core: Option<String>,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub error: Option<String>,
    pub modules: Vec<String>,
    pub keys: Option<UnlockedKeys>,
}

#[tauri::command]
pub async fn auth_login(
    password: String,
    db_state: State<'_, DbState>,
) -> Result<LoginResponse, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = match &*guard {
        Some(c) => c,
        None => {
            return Ok(LoginResponse {
                success: false,
                error: Some("Banco não inicializado".into()),
                modules: vec![],
                keys: None,
            })
        }
    };

    let auth_hash = hash_auth_password(&password);

    let modern_key = derive_key_from_password(&password);

    let mut stmt = conn.prepare("SELECT auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc, focus_key_enc, files_key_enc, vault_key_enc, calendar_key_enc, practice_key_enc, core_key_enc FROM keychain LIMIT 1")
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
            row.get::<_, Option<String>>(9).unwrap_or(None),
            row.get::<_, Option<String>>(10).unwrap_or(None),
            row.get::<_, Option<String>>(11).unwrap_or(None),
        ))
    }) {
        Ok(r) => r,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return Ok(LoginResponse {
                success: false,
                error: Some("Senha incorreta".into()),
                modules: vec![],
                keys: None,
            });
        }
        Err(e) => return Err(e.to_string()),
    };

    let mut is_valid = false;

    if row_data.0 == auth_hash {
        is_valid = true;
    } else {
        // Fallback: testa se a senha descriptografa as chaves
        let test_enc = row_data.1.as_ref().or(row_data.3.as_ref());
        if let Some(enc) = test_enc {
            if decrypt_module_key_with_key(enc, &modern_key).is_ok() {
                is_valid = true;
                let _ = conn.execute(
                    "UPDATE keychain SET auth_hash = ?",
                    rusqlite::params![&auth_hash],
                );
            }
        }
    }

    if !is_valid {
        return Ok(LoginResponse {
            success: false,
            error: Some("Senha incorreta".into()),
            modules: vec![],
            keys: None,
        });
    }

    // Escolhe a chave correta para decriptar
    let try_decrypt = |enc: &Option<String>| -> Option<String> {
        if let Some(e) = enc {
            if let Ok(dec) = decrypt_module_key_with_key(e, &modern_key) {
                return Some(dec);
            }
        }
        None
    };

    let library = try_decrypt(&row_data.1);
    let finance = try_decrypt(&row_data.2);
    let notes = try_decrypt(&row_data.3);
    
    let calendar = try_decrypt(&row_data.9).or_else(|| notes.clone());
    let practice = try_decrypt(&row_data.10).or_else(|| notes.clone());
    let core = try_decrypt(&row_data.11).or_else(|| notes.clone());
    let culture = try_decrypt(&row_data.4).or_else(|| notes.clone());
    let anki = try_decrypt(&row_data.5).or_else(|| notes.clone());
    let focus = try_decrypt(&row_data.6).or_else(|| notes.clone());
    let files = try_decrypt(&row_data.7).or_else(|| notes.clone());
    let vault = try_decrypt(&row_data.8).or_else(|| notes.clone());

    let mut modules = Vec::new();
    if library.is_some() {
        modules.push("library".into());
    }
    if finance.is_some() {
        modules.push("finance".into());
    }
    if notes.is_some() {
        modules.push("notes".into());
    }
    if culture.is_some() {
        modules.push("culture".into());
    }
    if anki.is_some() {
        modules.push("anki".into());
    }
    if focus.is_some() {
        modules.push("focus".into());
    }
    if files.is_some() {
        modules.push("files".into());
    }
    if vault.is_some() {
        modules.push("vault".into());
    }
    if calendar.is_some() {
        modules.push("calendar".into());
    }
    if practice.is_some() {
        modules.push("practice".into());
    }
    if core.is_some() {
        modules.push("core".into());
    }

    let keys_to_return = UnlockedKeys {
        library: library.clone(),
        finance: finance.clone(),
        notes: notes.clone(),
        culture: culture.clone(),
        anki: anki.clone(),
        focus: focus.clone(),
        files: files.clone(),
        vault: vault.clone(),
        calendar: calendar.clone(),
        practice: practice.clone(),
        core: core.clone(),
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
        keys: Some(keys_to_return),
    })
}

#[tauri::command]
pub async fn auth_setup(
    password: String,
    existing_keys: Option<HashMap<String, String>>,
    db_state: State<'_, DbState>,
) -> Result<LoginResponse, String> {
    {
        let guard = db_state.conn.lock().unwrap();
        let conn = match &*guard {
            Some(c) => c,
            None => {
                return Ok(LoginResponse {
                    success: false,
                    error: Some("Banco não inicializado".into()),
                    modules: vec![],
                    keys: None,
                })
            }
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
        let calendar_enc = encrypt_module_key(&get_key("calendar"), &password)?;
        let practice_enc = encrypt_module_key(&get_key("practice"), &password)?;
        let core_enc = encrypt_module_key(&get_key("core"), &password)?;

        let auth_hash = hash_auth_password(&password);
        let id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO keychain (id, auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc, focus_key_enc, files_key_enc, vault_key_enc, calendar_key_enc, practice_key_enc, core_key_enc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![&id, &auth_hash, &library_enc, &finance_enc, &notes_enc, &culture_enc, &anki_enc, &focus_enc, &files_enc, &vault_enc, &calendar_enc, &practice_enc, &core_enc],
        ).map_err(|e| e.to_string())?;
    }

    auth_login(password, db_state).await
}

#[tauri::command]
pub fn app_open_devtools(window: tauri::WebviewWindow) {
    window.open_devtools();
}

#[tauri::command]
pub async fn auth_force_update_keychain(
    password: String,
    keys: HashMap<String, String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let get_enc = |module: &str| -> Option<String> {
        keys.get(module).and_then(|k| encrypt_module_key(k, &password).ok())
    };

    let library_enc = get_enc("library");
    let finance_enc = get_enc("finance");
    let notes_enc = get_enc("notes");
    let culture_enc = get_enc("culture");
    let anki_enc = get_enc("anki");
    let focus_enc = get_enc("focus");
    let files_enc = get_enc("files");
    let vault_enc = get_enc("vault");
    let calendar_enc = get_enc("calendar");
    let practice_enc = get_enc("practice");
    let core_enc = get_enc("core");

    conn.execute(
        "UPDATE keychain SET library_key_enc = ?, finance_key_enc = ?, notes_key_enc = ?, culture_key_enc = ?, anki_key_enc = ?, focus_key_enc = ?, files_key_enc = ?, vault_key_enc = ?, calendar_key_enc = ?, practice_key_enc = ?, core_key_enc = ?",
        rusqlite::params![
            library_enc, finance_enc, notes_enc, culture_enc, anki_enc, focus_enc, files_enc, vault_enc, calendar_enc, practice_enc, core_enc
        ],
    ).map_err(|e| e.to_string())?;

    Ok(true)
}
