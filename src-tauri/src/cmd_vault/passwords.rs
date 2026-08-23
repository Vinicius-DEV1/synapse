use rand::Rng;
use tauri::State;
use crate::cmd_vault::helpers::get_vault_key;
use crate::cmd_vault::types::{PasswordGenOptions, VaultPasswordHistoryEntry};
use crate::db::DbState;

/// Retrieves decrypted password history revisions for a specific vault item.
#[tauri::command]
pub fn vault_get_password_history(
    item_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<VaultPasswordHistoryEntry>, String> {
    let vault_key = get_vault_key(&db_state)?;
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, item_id, password, changed_at, deleted_at FROM vault_password_history WHERE item_id = ? AND deleted_at IS NULL ORDER BY changed_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params![item_id], |row| {
            Ok(VaultPasswordHistoryEntry {
                id: row.get(0)?,
                item_id: row.get(1)?,
                password: row.get(2)?,
                changed_at: row.get(3)?,
                deleted_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut history = Vec::new();
    for row in rows {
        if let Ok(mut entry) = row {
            if let Ok(dec_pass) = crate::crypto::decrypt_content(&vault_key, &entry.password) {
                entry.password = dec_pass;
            }
            history.push(entry);
        }
    }

    Ok(history)
}

/// Generates a cryptographically strong random password adhering to user configuration rules.
#[tauri::command]
pub fn vault_generate_password(options: PasswordGenOptions) -> Result<String, String> {
    let mut chars = String::new();
    if options.uppercase {
        chars.push_str("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    if options.lowercase {
        chars.push_str("abcdefghijklmnopqrstuvwxyz");
    }
    if options.numbers {
        chars.push_str("0123456789");
    }
    if options.symbols {
        chars.push_str("!@#$%^&*()_+-=[]{}|;:,.<>?");
    }

    if chars.is_empty() {
        return Err("At least one character option must be selected".into());
    }

    let mut rng = rand::thread_rng();
    let chars_bytes = chars.as_bytes();
    let mut password = String::new();

    for _ in 0..options.length {
        let idx = rng.gen_range(0..chars_bytes.len());
        password.push(chars_bytes[idx] as char);
    }

    Ok(password)
}
