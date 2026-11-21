use tauri::State;
use crate::cmd_vault::helpers::get_vault_key;
use crate::cmd_vault::types::{GroupOrderUpdate, VaultGroup};
use crate::db::DbState;
use synapse_core::domain::vault::groups as core_groups;

/// Retrieves all active vault groups ordered by position and creation date.
#[tauri::command]
pub fn vault_get_groups(db_state: State<'_, DbState>) -> Result<Vec<VaultGroup>, String> {
    let vault_key = get_vault_key(&db_state)?;
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let raw_groups = core_groups::get_vault_groups(conn).map_err(|e| e.to_string())?;

    let mut groups = Vec::new();
    for g in raw_groups {
        let mut group = VaultGroup {
            id: g.id,
            name: g.name,
            icon: g.icon,
            color: g.color,
            position: g.position,
            created_at: g.created_at.unwrap_or_default(),
            updated_at: g.updated_at.unwrap_or_default(),
            deleted_at: None,
        };
        if let Ok(dec_name) = crate::crypto::decrypt_content(&vault_key, &group.name) {
            group.name = dec_name;
        }
        if let Some(ref icon_enc) = group.icon {
            if let Ok(dec_icon) = crate::crypto::decrypt_content(&vault_key, icon_enc) {
                group.icon = Some(dec_icon);
            }
        }
        if let Some(ref color_enc) = group.color {
            if let Ok(dec_color) = crate::crypto::decrypt_content(&vault_key, color_enc) {
                group.color = Some(dec_color);
            }
        }
        groups.push(group);
    }

    Ok(groups)
}

/// Creates or updates an encrypted vault group.
#[tauri::command]
pub fn vault_upsert_group(mut group: VaultGroup, db_state: State<'_, DbState>) -> Result<(), String> {
    let vault_key = get_vault_key(&db_state)?;

    if group.id.trim().is_empty() {
        group.id = uuid::Uuid::new_v4().to_string();
    }
    let now = chrono::Utc::now().to_rfc3339();
    if group.created_at.trim().is_empty() {
        group.created_at = now.clone();
    }
    group.updated_at = now;

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

    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    conn.execute(
        "INSERT INTO vault_groups (id, name, icon, color, position, created_at, updated_at, deleted_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            icon = excluded.icon,
            color = excluded.color,
            position = excluded.position,
            deleted_at = excluded.deleted_at,
            updated_at = excluded.updated_at",
        rusqlite::params![group.id, enc_name, enc_icon, enc_color, group.position, group.created_at, group.updated_at, group.deleted_at],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Soft-deletes a vault group and cascades deletion to all associated items.
#[tauri::command]
pub fn vault_delete_group(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    core_groups::delete_vault_group(conn, &id).map_err(|e| e.to_string())?;
    Ok(())
}

/// Batch updates order/position of vault groups.
#[tauri::command]
pub fn vault_reorder_groups(
    updates: Vec<GroupOrderUpdate>,
    db_state: State<'_, DbState>,
) -> Result<(), String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let tuples: Vec<(&str, i32)> = updates.iter().map(|u| (u.id.as_str(), u.position)).collect();
    core_groups::reorder_vault_groups(conn, &tuples).map_err(|e| e.to_string())?;
    Ok(())
}
