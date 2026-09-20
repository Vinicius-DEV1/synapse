pub use crate::cmd_auth_keys::{AuthStatus, LoginResponse, UnlockedKeys};
use crate::cmd_auth_keys::{resolve_unlocked_keys, KeychainRow};
use crate::crypto::{
    decrypt_module_key_with_key, derive_key_from_password, encrypt_module_key,
    generate_module_key, hash_auth_password,
};
use crate::db::DbState;
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub fn get_base_dir() -> Result<String, String> {
    Ok(crate::get_app_data_dir().to_string_lossy().to_string())
}

#[tauri::command]
pub fn auth_status(db_state: State<'_, DbState>) -> Result<AuthStatus, String> {
    let guard = db_state.lock_conn()?;
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
        let mut guard = db_state.lock_conn()?;
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

#[tauri::command]
pub async fn auth_login(
    password: String,
    db_state: State<'_, DbState>,
) -> Result<LoginResponse, String> {
    // 1. Read keychain row in isolated block to drop conn mutex before decryption & keys acquisition
    let keychain_row = {
        let guard = db_state.lock_conn()?;
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

        let mut stmt = conn.prepare("SELECT auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc, focus_key_enc, files_key_enc, vault_key_enc, calendar_key_enc, practice_key_enc, core_key_enc FROM keychain LIMIT 1")
            .map_err(|e| e.to_string())?;

        match stmt.query_row([], |row| {
            Ok(KeychainRow {
                auth_hash: row.get::<_, String>(0)?,
                library_enc: row.get::<_, Option<String>>(1)?,
                finance_enc: row.get::<_, Option<String>>(2)?,
                notes_enc: row.get::<_, Option<String>>(3)?,
                culture_enc: row.get::<_, Option<String>>(4)?,
                anki_enc: row.get::<_, Option<String>>(5)?,
                focus_enc: row.get::<_, Option<String>>(6)?,
                files_enc: row.get::<_, Option<String>>(7).unwrap_or(None),
                vault_enc: row.get::<_, Option<String>>(8).unwrap_or(None),
                calendar_enc: row.get::<_, Option<String>>(9).unwrap_or(None),
                practice_enc: row.get::<_, Option<String>>(10).unwrap_or(None),
                core_enc: row.get::<_, Option<String>>(11).unwrap_or(None),
            })
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
        }
    }; // guard dropped here

    let auth_hash = hash_auth_password(&password);
    let modern_key = derive_key_from_password(&password);

    let mut is_valid = false;

    // Primary verification: Authenticated AES-256-GCM decryption check using 600,000-round PBKDF2 key
    let test_enc = keychain_row
        .library_enc
        .as_ref()
        .or(keychain_row.notes_enc.as_ref());
    if let Some(enc) = test_enc {
        if decrypt_module_key_with_key(enc, &modern_key).is_ok() {
            is_valid = true;
        }
    }

    // Secondary fallback for legacy keychain records
    if !is_valid && keychain_row.auth_hash == auth_hash {
        is_valid = true;
    }

    if !is_valid {
        return Ok(LoginResponse {
            success: false,
            error: Some("Senha incorreta".into()),
            modules: vec![],
            keys: None,
        });
    }

    let (keys_to_return, modules) = resolve_unlocked_keys(&keychain_row, &modern_key);

    // Persist to AppState with safe mutex recovery
    {
        let mut keys_guard = db_state.lock_keys()?;
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
        let guard = db_state.lock_conn()?;
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

/// Open developer tools only in debug builds to prevent production tampering.
#[tauri::command]
pub fn app_open_devtools(window: tauri::WebviewWindow) {
    #[cfg(debug_assertions)]
    window.open_devtools();
    #[cfg(not(debug_assertions))]
    let _ = window;
}

#[tauri::command]
pub async fn auth_force_update_keychain(
    password: String,
    keys: HashMap<String, String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
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

#[tauri::command]
pub fn auth_lock(db_state: State<'_, DbState>) -> Result<bool, String> {
    let mut keys_guard = db_state.lock_keys()?;
    *keys_guard = None;
    Ok(true)
}
