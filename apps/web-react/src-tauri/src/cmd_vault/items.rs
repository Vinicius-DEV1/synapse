use crate::cmd_vault::helpers::{decrypt_vault_item, get_vault_key, row_to_vault_item};
use crate::cmd_vault::types::{ItemOrderUpdate, VaultItem};
use crate::db::{run_blocking, DbState};
use tauri::State;

fn fetch_and_decrypt_vault_items(
    state: &DbState,
    group_id: Option<String>,
    vault_key: &str,
) -> Result<Vec<VaultItem>, String> {
    let mut raw_items = {
        let reader = state.acquire_reader()?;
        let mut list = Vec::new();

        if let Some(gid) = group_id {
            let mut stmt = reader
                .prepare("SELECT id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at, deleted_at, position, login_type FROM vault_items WHERE group_id = ? AND deleted_at IS NULL ORDER BY is_favorite DESC, position ASC, created_at DESC")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(rusqlite::params![gid], |row| Ok(row_to_vault_item(row)))
                .map_err(|e| e.to_string())?;
            for item in rows.flatten() {
                list.push(item);
            }
        } else {
            let mut stmt = reader
                .prepare("SELECT id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at, deleted_at, position, login_type FROM vault_items WHERE deleted_at IS NULL ORDER BY is_favorite DESC, position ASC, created_at DESC")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], |row| Ok(row_to_vault_item(row)))
                .map_err(|e| e.to_string())?;
            for item in rows.flatten() {
                list.push(item);
            }
        }

        list
    };

    // Decrypt after returning reader connection to the WAL pool
    for item in &mut raw_items {
        decrypt_vault_item(item, vault_key);
    }

    Ok(raw_items)
}

/// Retrieves all active vault items, optionally filtered by group ID.
#[tauri::command]
pub async fn vault_get_items(
    group_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<Vec<VaultItem>, String> {
    let vault_key = get_vault_key(&db_state)?;
    let state = db_state.inner().clone();

    run_blocking(move || fetch_and_decrypt_vault_items(&state, group_id, &vault_key)).await
}

/// Retrieves a single vault item by ID with sensitive fields decrypted.
#[tauri::command]
pub async fn vault_get_item(id: String, db_state: State<'_, DbState>) -> Result<VaultItem, String> {
    let vault_key = get_vault_key(&db_state)?;
    let state = db_state.inner().clone();

    run_blocking(move || {
        let mut item = {
            let reader = state.acquire_reader()?;
            let mut stmt = reader
                .prepare("SELECT id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at, deleted_at, position, login_type FROM vault_items WHERE id = ?")
                .map_err(|e| e.to_string())?;

            stmt.query_row(rusqlite::params![id], |row| Ok(row_to_vault_item(row)))
                .map_err(|e| e.to_string())?
        };

        decrypt_vault_item(&mut item, &vault_key);
        Ok(item)
    })
    .await
}

/// Creates or updates a vault item, maintaining password history changes.
#[tauri::command]
pub async fn vault_upsert_item(
    item: VaultItem,
    db_state: State<'_, DbState>,
) -> Result<(), String> {
    let vault_key = get_vault_key(&db_state)?;
    let state = db_state.inner().clone();

    run_blocking(move || {
        let mut item = item;
        if item.id.trim().is_empty() {
            item.id = uuid::Uuid::new_v4().to_string();
        }
        let now = chrono::Utc::now().to_rfc3339();
        if item.created_at.trim().is_empty() {
            item.created_at = now.clone();
        }
        item.updated_at = now;

        // Encrypt all fields before acquiring the SQLite writer lock
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

        let guard = state.lock_conn()?;
        let conn = guard.as_ref().ok_or("Database not initialized")?;

        // Check whether password actually changed to record history entry
        if enc_pass.is_some() {
            let old_pass_enc: Result<Option<String>, _> = conn.query_row(
                "SELECT password FROM vault_items WHERE id = ?",
                rusqlite::params![item.id],
                |row| row.get(0),
            );

            if let Ok(Some(old)) = old_pass_enc {
                let old_plain = crate::crypto::decrypt_content(&vault_key, &old).ok();
                let new_plain = item.password.as_deref();
                if let (Some(old_p), Some(new_p)) = (old_plain, new_plain) {
                    if old_p != new_p && !old.is_empty() {
                        let hist_id = uuid::Uuid::new_v4().to_string();
                        let hist_now = chrono::Utc::now().to_rfc3339();
                        let _ = conn.execute(
                            "INSERT INTO vault_password_history (id, item_id, password, changed_at) VALUES (?, ?, ?, ?)",
                            rusqlite::params![hist_id, item.id, old, hist_now],
                        );
                    }
                }
            }
        }

        let login_type = item.login_type.as_deref().unwrap_or("password");

        conn.execute(
            "INSERT INTO vault_items (id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at, deleted_at, position, login_type) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                group_id = excluded.group_id,
                label = excluded.label,
                username = excluded.username,
                email = excluded.email,
                password = excluded.password,
                url = excluded.url,
                notes = excluded.notes,
                custom_fields = excluded.custom_fields,
                is_favorite = excluded.is_favorite,
                password_changed_at = excluded.password_changed_at,
                password_strength = excluded.password_strength,
                deleted_at = excluded.deleted_at,
                position = excluded.position,
                login_type = excluded.login_type,
                updated_at = excluded.updated_at",
            rusqlite::params![
                item.id,
                item.group_id,
                enc_label,
                enc_user,
                enc_email,
                enc_pass,
                enc_url,
                enc_notes,
                enc_custom,
                item.is_favorite,
                item.password_changed_at,
                item.password_strength,
                item.created_at,
                item.updated_at,
                item.deleted_at,
                item.position,
                login_type
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    })
    .await
}

/// Soft-deletes a vault item by setting deleted_at timestamp.
#[tauri::command]
pub async fn vault_delete_item(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    db_state
        .write(move |conn| {
            let now = chrono::Utc::now().to_rfc3339();

            conn.execute(
                "UPDATE vault_password_history SET deleted_at = ? WHERE item_id = ? AND deleted_at IS NULL",
                rusqlite::params![now, id],
            )
            .map_err(|e| e.to_string())?;

            conn.execute(
                "UPDATE vault_items SET deleted_at = ?, updated_at = ? WHERE id = ?",
                rusqlite::params![now, now, id],
            )
            .map_err(|e| e.to_string())?;

            Ok(())
        })
        .await
}

/// Searches vault items matching the search query across label, username, email, url, and notes.
#[tauri::command]
pub async fn vault_search_items(
    query: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<VaultItem>, String> {
    let vault_key = get_vault_key(&db_state)?;
    let state = db_state.inner().clone();

    run_blocking(move || {
        let items = fetch_and_decrypt_vault_items(&state, None, &vault_key)?;
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
    })
    .await
}

/// Batch updates order/position of vault items.
#[tauri::command]
pub async fn vault_reorder_items(
    updates: Vec<ItemOrderUpdate>,
    db_state: State<'_, DbState>,
) -> Result<(), String> {
    db_state
        .write(move |conn| {
            let now = chrono::Utc::now().to_rfc3339();
            let tx = conn.transaction().map_err(|e| e.to_string())?;
            for update in updates {
                tx.execute(
                    "UPDATE vault_items SET position = ?1, updated_at = ?2 WHERE id = ?3",
                    rusqlite::params![update.position, now, update.id],
                )
                .map_err(|e| e.to_string())?;
            }
            tx.commit().map_err(|e| e.to_string())?;
            Ok(())
        })
        .await
}
