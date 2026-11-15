use super::models::{VaultItem, VaultPasswordHistoryEntry};
use crate::error::Result;
use rusqlite::params;

pub fn get_vault_items(conn: &rusqlite::Connection, group_id: Option<&str>) -> Result<Vec<VaultItem>> {
    let sql = match group_id {
        Some(gid) if !gid.trim().is_empty() => {
            "SELECT id, group_id, label, username, email, password, url, notes, is_favorite, \
             custom_fields, login_type, created_at, updated_at \
             FROM vault_items WHERE deleted_at IS NULL AND group_id = ?1 ORDER BY label ASC LIMIT 100"
        }
        _ => {
            "SELECT id, group_id, label, username, email, password, url, notes, is_favorite, \
             custom_fields, login_type, created_at, updated_at \
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
            custom_fields: row.get(9)?,
            login_type: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
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
    let clean_custom = item.custom_fields.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty());
    let clean_login = item.login_type.as_deref().map(|s| s.trim()).unwrap_or("password");
    let is_fav_int = if item.is_favorite { 1 } else { 0 };

    if item.id.trim().is_empty() {
        item.id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO vault_items (id, group_id, label, username, email, password, url, notes, \
             custom_fields, login_type, is_favorite, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            params![
                item.id,
                clean_group,
                clean_label,
                clean_user,
                clean_email,
                clean_pass,
                clean_url,
                clean_notes,
                clean_custom,
                clean_login,
                is_fav_int,
            ],
        )?;
    } else {
        // Record previous password in history if changed
        if let Some(new_p) = clean_pass {
            let old_pass: rusqlite::Result<Option<String>> = conn.query_row(
                "SELECT password FROM vault_items WHERE id = ?1 AND deleted_at IS NULL",
                params![item.id.trim()],
                |row| row.get(0),
            );
            if let Ok(Some(old)) = old_pass {
                if old != new_p && !old.is_empty() {
                    let hist_id = uuid::Uuid::new_v4().to_string();
                    let _ = conn.execute(
                        "INSERT INTO vault_password_history (id, item_id, password, changed_at) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)",
                        params![hist_id, item.id.trim(), old],
                    );
                }
            }
        }

        conn.execute(
            "UPDATE vault_items SET group_id = ?1, label = ?2, username = ?3, email = ?4, \
             password = ?5, url = ?6, notes = ?7, custom_fields = ?8, login_type = ?9, \
             is_favorite = ?10, updated_at = CURRENT_TIMESTAMP \
             WHERE id = ?11 AND deleted_at IS NULL",
            params![
                clean_group,
                clean_label,
                clean_user,
                clean_email,
                clean_pass,
                clean_url,
                clean_notes,
                clean_custom,
                clean_login,
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

    let _ = conn.execute(
        "UPDATE vault_password_history SET deleted_at = CURRENT_TIMESTAMP WHERE item_id = ?1 AND deleted_at IS NULL",
        params![id.trim()],
    );

    let rows = conn.execute(
        "UPDATE vault_items SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id.trim()],
    )?;

    Ok(rows > 0)
}

pub fn get_vault_password_history(conn: &rusqlite::Connection, item_id: &str) -> Result<Vec<VaultPasswordHistoryEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, item_id, password, changed_at, deleted_at FROM vault_password_history WHERE item_id = ?1 AND deleted_at IS NULL ORDER BY changed_at DESC"
    )?;

    let rows = stmt.query_map(params![item_id.trim()], |row| {
        Ok(VaultPasswordHistoryEntry {
            id: row.get(0)?,
            item_id: row.get(1)?,
            password: row.get(2)?,
            changed_at: row.get(3)?,
            deleted_at: row.get(4)?,
        })
    })?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(entry) = r {
            list.push(entry);
        }
    }
    Ok(list)
}

pub fn check_password_strength(password: &str) -> i32 {
    let len = password.len();
    let has_upper = password.chars().any(|c| c.is_uppercase());
    let has_lower = password.chars().any(|c| c.is_lowercase());
    let has_num = password.chars().any(|c| c.is_numeric());
    let has_sym = password.chars().any(|c| !c.is_alphanumeric());

    let mut score = 0;
    if len > 8 {
        score += 1;
    }
    if len >= 12 {
        score += 1;
    }
    if has_upper && has_lower {
        score += 1;
    }
    if has_num && has_sym {
        score += 1;
    }

    if len >= 16 && (has_upper || has_lower) && (has_num || has_sym) {
        score = std::cmp::max(score, 4);
    }

    if score > 4 {
        score = 4;
    }

    let lower = password.to_lowercase();
    if lower == "password" || lower == "123456" || lower == "12345678" || lower == "admin" {
        score = 0;
    }

    score
}
