use crate::cmd_auth_keys::{resolve_unlocked_keys, KeychainRow};
pub use crate::cmd_auth_keys::{AuthStatus, LoginResponse, UnlockedKeys};
use crate::crypto::{
    decrypt_module_key_with_key, derive_key_from_password, encrypt_module_key, generate_module_key,
};
use crate::db::{run_blocking, DbState};
use std::collections::HashMap;
use synapse_core::crypto::hash_auth_password_v2;
use synapse_core::db::keychain::{replace_keychain_module_keys, rewrap_keychain_for_account};
use tauri::State;
use zeroize::{Zeroize, Zeroizing};

struct SensitiveKeys(HashMap<String, String>);

impl SensitiveKeys {
    fn into_inner(mut self) -> HashMap<String, String> {
        std::mem::take(&mut self.0)
    }
}

impl Drop for SensitiveKeys {
    fn drop(&mut self) {
        for key in self.0.values_mut() {
            key.zeroize();
        }
    }
}

#[tauri::command]
pub fn get_base_dir() -> Result<String, String> {
    Ok(crate::get_app_data_dir().to_string_lossy().to_string())
}

#[tauri::command]
pub async fn auth_status(db_state: State<'_, DbState>) -> Result<AuthStatus, String> {
    let state = db_state.inner().clone();
    run_blocking(move || {
        let reader = match state.acquire_reader() {
            Ok(r) => r,
            Err(_) => {
                return Ok(AuthStatus {
                    status: "new".into(),
                })
            }
        };

        let mut stmt = reader
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
    })
    .await
}

#[tauri::command]
pub async fn auth_wipe_local_data(
    app: tauri::AppHandle,
    db_state: tauri::State<'_, crate::db::DbState>,
) -> Result<(), String> {
    let state = db_state.inner().clone();
    run_blocking(move || {
        state.close_all()?;

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
        Ok(())
    })
    .await?;

    app.restart();
}

#[tauri::command]
pub async fn auth_login(
    password: String,
    db_state: State<'_, DbState>,
) -> Result<LoginResponse, String> {
    let state = db_state.inner().clone();
    let keychain_row = run_blocking(move || -> Result<Option<KeychainRow>, String> {
        let reader = match state.acquire_reader() {
            Ok(r) => r,
            Err(_) => return Ok(None),
        };

        let mut stmt = reader.prepare("SELECT id, auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc, focus_key_enc, files_key_enc, vault_key_enc, calendar_key_enc, practice_key_enc, core_key_enc FROM keychain LIMIT 1")
            .map_err(|e| e.to_string())?;

        match stmt.query_row([], |row| {
            Ok(KeychainRow {
                id: row.get::<_, String>(0)?,
                auth_hash: row.get::<_, String>(1)?,
                library_enc: row.get::<_, Option<String>>(2)?,
                finance_enc: row.get::<_, Option<String>>(3)?,
                notes_enc: row.get::<_, Option<String>>(4)?,
                culture_enc: row.get::<_, Option<String>>(5)?,
                anki_enc: row.get::<_, Option<String>>(6)?,
                focus_enc: row.get::<_, Option<String>>(7)?,
                files_enc: row.get::<_, Option<String>>(8).unwrap_or(None),
                vault_enc: row.get::<_, Option<String>>(9).unwrap_or(None),
                calendar_enc: row.get::<_, Option<String>>(10).unwrap_or(None),
                practice_enc: row.get::<_, Option<String>>(11).unwrap_or(None),
                core_enc: row.get::<_, Option<String>>(12).unwrap_or(None),
            })
        }) {
            Ok(r) => Ok(Some(r)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    })
    .await?;

    let keychain_row = match keychain_row {
        Some(r) => r,
        None => {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            return Ok(LoginResponse {
                success: false,
                error: Some("Senha incorreta".into()),
                modules: vec![],
                keys: None,
            });
        }
    };

    // Offload 600,000-iteration PBKDF2 and envelope decryption onto the blocking pool.
    let (is_valid, auth_hash_v2, resolved) = run_blocking(move || {
        let password = Zeroizing::new(password);
        let auth_hash_v2 = hash_auth_password_v2(password.as_str());
        let modern_key = derive_key_from_password(password.as_str());

        let envelopes = [
            &keychain_row.library_enc,
            &keychain_row.finance_enc,
            &keychain_row.notes_enc,
            &keychain_row.culture_enc,
            &keychain_row.anki_enc,
            &keychain_row.focus_enc,
            &keychain_row.files_enc,
            &keychain_row.vault_enc,
            &keychain_row.calendar_enc,
            &keychain_row.practice_enc,
            &keychain_row.core_enc,
        ];
        let is_valid = envelopes
            .into_iter()
            .flatten()
            .any(|envelope| decrypt_module_key_with_key(envelope, &modern_key).is_ok());

        if !is_valid {
            return Ok((false, auth_hash_v2, None));
        }

        let (keys_to_return, modules) = resolve_unlocked_keys(&keychain_row, &modern_key);
        let needs_hash_upgrade = keychain_row.auth_hash != auth_hash_v2;
        Ok((
            true,
            auth_hash_v2,
            Some((keys_to_return, modules, keychain_row.id, needs_hash_upgrade)),
        ))
    })
    .await?;

    if !is_valid {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        return Ok(LoginResponse {
            success: false,
            error: Some("Senha incorreta".into()),
            modules: vec![],
            keys: None,
        });
    }

    let (keys_to_return, modules, keychain_id, needs_hash_upgrade) =
        resolved.expect("validated login must resolve unlocked keys");

    if needs_hash_upgrade {
        db_state
            .write(move |conn| {
                conn.execute(
                    "UPDATE keychain SET auth_hash = ?1 WHERE id = ?2",
                    rusqlite::params![auth_hash_v2, keychain_id],
                )
                .map_err(|e| e.to_string())?;
                Ok(())
            })
            .await?;
    }

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
    let setup_password = password.clone();
    let state = db_state.inner().clone();
    let initialized = run_blocking(move || -> Result<bool, String> {
        let setup_password = Zeroizing::new(setup_password);
        let get_key = |module: &str| -> String {
            if let Some(keys) = &existing_keys {
                if let Some(k) = keys.get(module) {
                    return k.clone();
                }
            }
            generate_module_key()
        };

        // Encrypt all module keys before acquiring the SQLite writer lock.
        let library_enc = encrypt_module_key(&get_key("library"), setup_password.as_str())?;
        let finance_enc = encrypt_module_key(&get_key("finance"), setup_password.as_str())?;
        let notes_enc = encrypt_module_key(&get_key("notes"), setup_password.as_str())?;
        let culture_enc = encrypt_module_key(&get_key("culture"), setup_password.as_str())?;
        let anki_enc = encrypt_module_key(&get_key("anki"), setup_password.as_str())?;
        let focus_enc = encrypt_module_key(&get_key("focus"), setup_password.as_str())?;
        let files_enc = encrypt_module_key(&get_key("files"), setup_password.as_str())?;
        let vault_enc = encrypt_module_key(&get_key("vault"), setup_password.as_str())?;
        let calendar_enc = encrypt_module_key(&get_key("calendar"), setup_password.as_str())?;
        let practice_enc = encrypt_module_key(&get_key("practice"), setup_password.as_str())?;
        let core_enc = encrypt_module_key(&get_key("core"), setup_password.as_str())?;

        let auth_hash = hash_auth_password_v2(setup_password.as_str());
        let id = uuid::Uuid::new_v4().to_string();

        let guard = state.lock_conn()?;
        let conn = match &*guard {
            Some(c) => c,
            None => return Ok(false),
        };

        conn.execute(
            "INSERT INTO keychain (id, auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc, focus_key_enc, files_key_enc, vault_key_enc, calendar_key_enc, practice_key_enc, core_key_enc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![&id, &auth_hash, &library_enc, &finance_enc, &notes_enc, &culture_enc, &anki_enc, &focus_enc, &files_enc, &vault_enc, &calendar_enc, &practice_enc, &core_enc],
        ).map_err(|e| e.to_string())?;
        Ok(true)
    })
    .await?;

    if !initialized {
        return Ok(LoginResponse {
            success: false,
            error: Some("Banco não inicializado".into()),
            modules: vec![],
            keys: None,
        });
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
    db_state
        .write(move |conn| {
            let password = Zeroizing::new(password);
            let keys = SensitiveKeys(keys);
            replace_keychain_module_keys(conn, password.as_str(), keys.into_inner())?;
            Ok(true)
        })
        .await
}

#[tauri::command]
pub async fn auth_rewrap_keychain(
    previous_password: String,
    account_password: String,
    keys: HashMap<String, String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            let previous_password = Zeroizing::new(previous_password);
            let account_password = Zeroizing::new(account_password);
            let keys = SensitiveKeys(keys);
            rewrap_keychain_for_account(
                conn,
                previous_password.as_str(),
                account_password.as_str(),
                keys.into_inner(),
            )?;
            Ok(true)
        })
        .await
}

#[tauri::command]
pub async fn auth_lock(db_state: State<'_, DbState>) -> Result<bool, String> {
    let mut keys_guard = db_state.lock_keys()?;
    *keys_guard = None;
    Ok(true)
}
