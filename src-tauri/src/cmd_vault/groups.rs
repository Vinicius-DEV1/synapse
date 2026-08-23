use tauri::State;
use crate::cmd_vault::helpers::get_vault_key;
use crate::cmd_vault::types::{GroupOrderUpdate, VaultGroup};
use crate::db::DbState;

/// Retrieves all active vault groups ordered by position and creation date.
#[tauri::command]
pub fn vault_get_groups(db_state: State<'_, DbState>) -> Result<Vec<VaultGroup>, String> {
    let vault_key = get_vault_key(&db_state)?;
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, icon, color, position, created_at, updated_at, deleted_at FROM vault_groups WHERE deleted_at IS NULL ORDER BY position ASC, created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(VaultGroup {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                color: row.get(3)?,
                position: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut groups = Vec::new();
    for row in rows {
        if let Ok(mut g) = row {
            if let Ok(dec_name) = crate::crypto::decrypt_content(&vault_key, &g.name) {
                g.name = dec_name;
            }
            if let Some(ref icon_enc) = g.icon {
                if let Ok(dec_icon) = crate::crypto::decrypt_content(&vault_key, icon_enc) {
                    g.icon = Some(dec_icon);
                }
            }
            if let Some(ref color_enc) = g.color {
                if let Ok(dec_color) = crate::crypto::decrypt_content(&vault_key, color_enc) {
                    g.color = Some(dec_color);
                }
            }
            groups.push(g);
        }
    }

    Ok(groups)
}

/// Creates or updates an encrypted vault group.
#[tauri::command]
pub fn vault_upsert_group(group: VaultGroup, db_state: State<'_, DbState>) -> Result<(), String> {
    let vault_key = get_vault_key(&db_state)?;

    let enc_name = crate::crypto::encrypt_content(&vault_key, &group.name)?;
    let enc_icon = if let Some(ref icon) = group.icon {
        Some(crate::crypto::encrypt_content(&vault_key, icon)?)
    } else {
        None
    };
    let enc_color = if let Some(ref color) = group.color {
        Some(crate::crypto::encrypt_content(&vault_key, color)?)
    } else {
        None
    };

    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    conn.execute(
        "INSERT OR REPLACE INTO vault_groups (id, name, icon, color, position, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![group.id, enc_name, enc_icon, enc_color, group.position, group.created_at, group.updated_at, group.deleted_at],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Soft-deletes a vault group and cascades deletion to all associated items.
#[tauri::command]
pub fn vault_delete_group(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE vault_groups SET deleted_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![now, now, id],
    )
    .map_err(|e| e.to_string())?;

    // Delete associated credentials in cascade
    conn.execute(
        "UPDATE vault_items SET deleted_at = ?, updated_at = ? WHERE group_id = ?",
        rusqlite::params![now, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Batch updates order/position of vault groups.
#[tauri::command]
pub fn vault_reorder_groups(
    updates: Vec<GroupOrderUpdate>,
    db_state: State<'_, DbState>,
) -> Result<(), String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    for update in updates {
        conn.execute(
            "UPDATE vault_groups SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            rusqlite::params![update.position, update.id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
