use tauri::State;
use crate::cmd_vault::types::VaultItem;
use crate::db::DbState;

/// Retrieves the active unlocked Vault encryption key from application state.
pub fn get_vault_key(db_state: &State<'_, DbState>) -> Result<String, String> {
    let keys_guard = db_state.keys.lock().unwrap();
    let keys = keys_guard.as_ref().ok_or("User not authenticated")?;
    let vault_key = keys.vault.as_ref().ok_or("Vault encryption key not found")?;
    Ok(vault_key.clone())
}

/// Converts a rusqlite row into a VaultItem entity.
pub fn row_to_vault_item(row: &rusqlite::Row) -> VaultItem {
    VaultItem {
        id: row.get(0).unwrap_or_default(),
        group_id: row.get(1).unwrap_or_default(),
        label: row.get(2).unwrap_or_default(),
        username: row.get(3).unwrap_or_default(),
        email: row.get(4).unwrap_or_default(),
        password: row.get(5).unwrap_or_default(),
        url: row.get(6).unwrap_or_default(),
        notes: row.get(7).unwrap_or_default(),
        custom_fields: row.get(8).unwrap_or_default(),
        is_favorite: row.get(9).unwrap_or(0),
        password_changed_at: row.get(10).unwrap_or_default(),
        password_strength: row.get(11).unwrap_or(0),
        created_at: row.get(12).unwrap_or_default(),
        updated_at: row.get(13).unwrap_or_default(),
        deleted_at: row.get(14).unwrap_or_default(),
    }
}

/// Decrypts all sensitive fields in a VaultItem in-place.
pub fn decrypt_vault_item(item: &mut VaultItem, key: &str) {
    if let Ok(dec) = crate::crypto::decrypt_content(key, &item.label) {
        item.label = dec;
    }
    if let Some(ref val) = item.username {
        if let Ok(dec) = crate::crypto::decrypt_content(key, val) {
            item.username = Some(dec);
        }
    }
    if let Some(ref val) = item.email {
        if let Ok(dec) = crate::crypto::decrypt_content(key, val) {
            item.email = Some(dec);
        }
    }
    if let Some(ref val) = item.password {
        if let Ok(dec) = crate::crypto::decrypt_content(key, val) {
            item.password = Some(dec);
        }
    }
    if let Some(ref val) = item.url {
        if let Ok(dec) = crate::crypto::decrypt_content(key, val) {
            item.url = Some(dec);
        }
    }
    if let Some(ref val) = item.notes {
        if let Ok(dec) = crate::crypto::decrypt_content(key, val) {
            item.notes = Some(dec);
        }
    }
    if let Some(ref val) = item.custom_fields {
        if let Ok(dec) = crate::crypto::decrypt_content(key, val) {
            item.custom_fields = Some(dec);
        }
    }
}
