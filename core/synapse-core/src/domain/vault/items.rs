use super::models::VaultItem;
use crate::error::Result;
use rusqlite::params;

pub fn get_vault_items(conn: &rusqlite::Connection, group_id: Option<&str>) -> Result<Vec<VaultItem>> {
    let sql = match group_id {
        Some(gid) if !gid.trim().is_empty() => {
            "SELECT id, group_id, label, username, email, password, url, notes, is_favorite, \
             created_at, updated_at \
             FROM vault_items WHERE deleted_at IS NULL AND group_id = ?1 ORDER BY label ASC LIMIT 100"
        }
        _ => {
            "SELECT id, group_id, label, username, email, password, url, notes, is_favorite, \
             created_at, updated_at \
             FROM vault_items WHERE deleted_at IS NULL ORDER BY label ASC LIMIT 100"
        }
    };

    let mut stmt = conn.prepare(sql)?;
    let map_row = |row: &rusqlite::Row| {
        let is_fav_int: i32 = row.get(8).unwrap_or(0);
        Ok(VaultItem {
            id: row.get(0)?,
            group_id: row.get(1)?,
            label: row.get(2)?,
            username: row.get(3)?,
            email: row.get(4)?,
            password: row.get(5)?,
            url: row.get(6)?,
            notes: row.get(7)?,
            is_favorite: is_fav_int != 0,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    };

    let rows: Vec<VaultItem> = match group_id {
        Some(gid) if !gid.trim().is_empty() => stmt
            .query_map([gid.trim()], map_row)?
            .filter_map(std::result::Result::ok)
            .collect(),
        _ => stmt
            .query_map([], map_row)?
            .filter_map(std::result::Result::ok)
            .collect(),
    };

    Ok(rows)
}

pub fn save_vault_item(conn: &rusqlite::Connection, mut item: VaultItem) -> Result<VaultItem> {
    let clean_group = item.group_id.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty());
    let clean_label = item.label.trim();
    let clean_user = item.username.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty());
    let clean_email = item.email.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty());
    let clean_pass = item.password.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty());
    let clean_url = item.url.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty());
    let clean_notes = item.notes.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty());
    let is_fav_int = if item.is_favorite { 1 } else { 0 };

    if item.id.trim().is_empty() {
        item.id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO vault_items (id, group_id, label, username, email, password, url, notes, \
             is_favorite, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            params![
                item.id,
                clean_group,
                clean_label,
                clean_user,
                clean_email,
                clean_pass,
                clean_url,
                clean_notes,
                is_fav_int,
            ],
        )?;
    } else {
        conn.execute(
            "UPDATE vault_items SET group_id = ?1, label = ?2, username = ?3, email = ?4, \
             password = ?5, url = ?6, notes = ?7, is_favorite = ?8, updated_at = CURRENT_TIMESTAMP \
             WHERE id = ?9 AND deleted_at IS NULL",
            params![
                clean_group,
                clean_label,
                clean_user,
                clean_email,
                clean_pass,
                clean_url,
                clean_notes,
                is_fav_int,
                item.id.trim(),
            ],
        )?;
    }

    Ok(item)
}

pub fn delete_vault_item(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    if id.trim().is_empty() {
        return Ok(false);
    }

    let rows = conn.execute(
        "UPDATE vault_items SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id.trim()],
    )?;

    Ok(rows > 0)
}
