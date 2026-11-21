use crate::cmd_vault::helpers::get_vault_key;
use crate::cmd_vault::types::{GroupOrderUpdate, VaultGroup};
use crate::db::{run_blocking, DbState};
use synapse_core::domain::vault::groups as core_groups;
use tauri::State;

/// Retrieves all active vault groups ordered by position and creation date.
#[tauri::command]
pub async fn vault_get_groups(db_state: State<'_, DbState>) -> Result<Vec<VaultGroup>, String> {
    let vault_key = get_vault_key(&db_state)?;
    let state = db_state.inner().clone();

    run_blocking(move || {
        let raw_groups = {
            let reader = state.acquire_reader()?;
            core_groups::get_vault_groups(&reader).map_err(|e| e.to_string())?
        };

        let mut groups = Vec::with_capacity(raw_groups.len());
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
    })
    .await
}

/// Creates or updates an encrypted vault group.
#[tauri::command]
pub async fn vault_upsert_group(
    group: VaultGroup,
    db_state: State<'_, DbState>,
) -> Result<(), String> {
    let vault_key = get_vault_key(&db_state)?;
    let state = db_state.inner().clone();

    run_blocking(move || {
        let group_id = if group.id.trim().is_empty() {
            uuid::Uuid::new_v4().to_string()
        } else {
            group.id
        };
        let now = chrono::Utc::now().to_rfc3339();
        let created_at = if group.created_at.trim().is_empty() {
            now.clone()
        } else {
            group.created_at
        };
        let updated_at = now;

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

        let guard = state.lock_conn()?;
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
            rusqlite::params![
                group_id,
                enc_name,
                enc_icon,
                enc_color,
                group.position,
                created_at,
                updated_at,
                group.deleted_at
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    })
    .await
}

/// Soft-deletes a vault group and cascades deletion to all associated items.
#[tauri::command]
pub async fn vault_delete_group(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    db_state
        .write(move |conn| {
            core_groups::delete_vault_group(conn, &id).map_err(|e| e.to_string())?;
            Ok(())
        })
        .await
}

/// Batch updates order/position of vault groups.
#[tauri::command]
pub async fn vault_reorder_groups(
    updates: Vec<GroupOrderUpdate>,
    db_state: State<'_, DbState>,
) -> Result<(), String> {
    db_state
        .write(move |conn| {
            let tuples: Vec<(&str, i32)> =
                updates.iter().map(|u| (u.id.as_str(), u.position)).collect();
            core_groups::reorder_vault_groups(conn, &tuples).map_err(|e| e.to_string())?;
            Ok(())
        })
        .await
}
