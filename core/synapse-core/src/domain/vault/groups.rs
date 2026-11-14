use super::models::VaultGroup;
use crate::error::Result;
use rusqlite::params;

pub fn get_vault_groups(conn: &rusqlite::Connection) -> Result<Vec<VaultGroup>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, icon, color, position, created_at, updated_at \
         FROM vault_groups WHERE deleted_at IS NULL ORDER BY position ASC, name ASC",
    )?;

    let iter = stmt.query_map([], |row| {
        Ok(VaultGroup {
            id: row.get(0)?,
            name: row.get(1)?,
            icon: row.get(2)?,
            color: row.get(3)?,
            position: row.get(4).unwrap_or(0),
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;

    let mut list = Vec::new();
    for g in iter.flatten() {
        list.push(g);
    }
    Ok(list)
}

pub fn create_vault_group(
    conn: &rusqlite::Connection,
    name: &str,
    icon: Option<&str>,
    color: Option<&str>,
) -> Result<VaultGroup> {
    let id = uuid::Uuid::new_v4().to_string();
    let max_pos: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM vault_groups WHERE deleted_at IS NULL",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO vault_groups (id, name, icon, color, position, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        params![
            id,
            name.trim(),
            icon.map(|s| s.trim()),
            color.map(|s| s.trim()),
            max_pos,
        ],
    )?;

    Ok(VaultGroup {
        id,
        name: name.trim().to_string(),
        icon: icon.map(|s| s.trim().to_string()),
        color: color.map(|s| s.trim().to_string()),
        position: max_pos,
        created_at: None,
        updated_at: None,
    })
}

pub fn update_vault_group(
    conn: &rusqlite::Connection,
    id: &str,
    name: &str,
    icon: Option<&str>,
    color: Option<&str>,
    position: Option<i32>,
) -> Result<bool> {
    if id.trim().is_empty() || name.trim().is_empty() {
        return Ok(false);
    }

    let rows = if let Some(pos) = position {
        conn.execute(
            "UPDATE vault_groups SET name = ?1, icon = ?2, color = ?3, position = ?4, \
             updated_at = CURRENT_TIMESTAMP WHERE id = ?5 AND deleted_at IS NULL",
            params![name.trim(), icon.map(|s| s.trim()), color.map(|s| s.trim()), pos, id.trim()],
        )?
    } else {
        conn.execute(
            "UPDATE vault_groups SET name = ?1, icon = ?2, color = ?3, \
             updated_at = CURRENT_TIMESTAMP WHERE id = ?4 AND deleted_at IS NULL",
            params![name.trim(), icon.map(|s| s.trim()), color.map(|s| s.trim()), id.trim()],
        )?
    };

    Ok(rows > 0)
}

pub fn delete_vault_group(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    if id.trim().is_empty() {
        return Ok(false);
    }

    let rows = conn.execute(
        "UPDATE vault_groups SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id.trim()],
    )?;
    if rows > 0 {
        let _ = conn.execute(
            "UPDATE vault_items SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
             WHERE group_id = ?1 AND deleted_at IS NULL",
            params![id.trim()],
        );
    }
    Ok(rows > 0)
}
