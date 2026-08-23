use tauri::State;
use crate::cmd_vault::helpers::{decrypt_vault_item, get_vault_key, row_to_vault_item};
use crate::cmd_vault::types::VaultItem;
use crate::db::DbState;

/// Retrieves all active vault items, optionally filtered by group ID.
#[tauri::command]
pub fn vault_get_items(
    group_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<Vec<VaultItem>, String> {
    let vault_key = get_vault_key(&db_state)?;
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut items = Vec::new();

    if let Some(gid) = group_id {
        let mut stmt = conn.prepare("SELECT id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at, deleted_at FROM vault_items WHERE group_id = ? AND deleted_at IS NULL ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![gid], |row| Ok(row_to_vault_item(row)))
            .map_err(|e| e.to_string())?;
        for row in rows {
            if let Ok(mut item) = row {
                decrypt_vault_item(&mut item, &vault_key);
                items.push(item);
            }
        }
    } else {
        let mut stmt = conn.prepare("SELECT id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at, deleted_at FROM vault_items WHERE deleted_at IS NULL ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| Ok(row_to_vault_item(row)))
            .map_err(|e| e.to_string())?;
        for row in rows {
            if let Ok(mut item) = row {
                decrypt_vault_item(&mut item, &vault_key);
                items.push(item);
            }
        }
    }

    Ok(items)
}

/// Retrieves a single vault item by ID with sensitive fields decrypted.
#[tauri::command]
pub fn vault_get_item(id: String, db_state: State<'_, DbState>) -> Result<VaultItem, String> {
    let vault_key = get_vault_key(&db_state)?;
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn.prepare("SELECT id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at, deleted_at FROM vault_items WHERE id = ?")
        .map_err(|e| e.to_string())?;

    let mut item = stmt
        .query_row(rusqlite::params![id], |row| Ok(row_to_vault_item(row)))
        .map_err(|e| e.to_string())?;

    decrypt_vault_item(&mut item, &vault_key);
    Ok(item)
}

/// Creates or updates a vault item, maintaining password history changes.
#[tauri::command]
pub fn vault_upsert_item(item: VaultItem, db_state: State<'_, DbState>) -> Result<(), String> {
    let vault_key = get_vault_key(&db_state)?;
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let enc_label = crate::crypto::encrypt_content(&vault_key, &item.label)?;
    let enc_user = item
        .username
        .as_ref()
        .map(|s| crate::crypto::encrypt_content(&vault_key, s))
        .transpose()?;
    let enc_email = item
        .email
        .as_ref()
        .map(|s| crate::crypto::encrypt_content(&vault_key, s))
        .transpose()?;
    let enc_pass = item
        .password
        .as_ref()
        .map(|s| crate::crypto::encrypt_content(&vault_key, s))
        .transpose()?;
    let enc_url = item
        .url
        .as_ref()
        .map(|s| crate::crypto::encrypt_content(&vault_key, s))
        .transpose()?;
    let enc_notes = item
        .notes
        .as_ref()
        .map(|s| crate::crypto::encrypt_content(&vault_key, s))
        .transpose()?;
    let enc_custom = item
        .custom_fields
        .as_ref()
        .map(|s| crate::crypto::encrypt_content(&vault_key, s))
        .transpose()?;

    // Check whether password changed to record history entry
    if let Some(ref new_pass_enc) = enc_pass {
        let old_pass_enc: Result<Option<String>, _> = conn.query_row(
            "SELECT password FROM vault_items WHERE id = ?",
            rusqlite::params![item.id],
            |row| row.get(0),
        );

        if let Ok(Some(old)) = old_pass_enc {
            if old != *new_pass_enc && !old.is_empty() {
                let hist_id = uuid::Uuid::new_v4().to_string();
                let now = chrono::Utc::now().to_rfc3339();
                let _ = conn.execute(
                    "INSERT INTO vault_password_history (id, item_id, password, changed_at) VALUES (?, ?, ?, ?)",
                    rusqlite::params![hist_id, item.id, old, now],
                );
            }
        }
    }

    conn.execute(
        "INSERT OR REPLACE INTO vault_items (id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![item.id, item.group_id, enc_label, enc_user, enc_email, enc_pass, enc_url, enc_notes, enc_custom, item.is_favorite, item.password_changed_at, item.password_strength, item.created_at, item.updated_at, item.deleted_at],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Soft-deletes a vault item by setting deleted_at timestamp.
#[tauri::command]
pub fn vault_delete_item(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE vault_items SET deleted_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![now, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Searches vault items matching the search query across label, username, email, url, and notes.
#[tauri::command]
pub fn vault_search_items(
    query: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<VaultItem>, String> {
    let items = vault_get_items(None, db_state)?;
    let q = query.to_lowercase();

    let filtered = items
        .into_iter()
        .filter(|i| {
            i.label.to_lowercase().contains(&q)
                || i.username
                    .as_ref()
                    .map(|s| s.to_lowercase().contains(&q))
                    .unwrap_or(false)
                || i.email
                    .as_ref()
                    .map(|s| s.to_lowercase().contains(&q))
                    .unwrap_or(false)
                || i.url
                    .as_ref()
                    .map(|s| s.to_lowercase().contains(&q))
                    .unwrap_or(false)
                || i.notes
                    .as_ref()
                    .map(|s| s.to_lowercase().contains(&q))
                    .unwrap_or(false)
        })
        .collect();

    Ok(filtered)
}
