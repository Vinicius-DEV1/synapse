use super::models::FileFolder;
use crate::error::Result;
use rusqlite::{params, OptionalExtension};

pub fn get_file_folders(
    conn: &rusqlite::Connection,
    parent_id: Option<&str>,
) -> Result<Vec<FileFolder>> {
    let sql = match parent_id {
        Some(pid) if !pid.trim().is_empty() => {
            "SELECT id, name, parent_id, color, created_at, updated_at \
             FROM file_folders WHERE deleted_at IS NULL AND parent_id = ?1 \
             ORDER BY name COLLATE NOCASE ASC"
        }
        _ => {
            "SELECT id, name, parent_id, color, created_at, updated_at \
             FROM file_folders WHERE deleted_at IS NULL AND parent_id IS NULL \
             ORDER BY name COLLATE NOCASE ASC"
        }
    };

    let mut stmt = conn.prepare(sql)?;
    let map_row = |row: &rusqlite::Row| {
        Ok(FileFolder {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            color: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    };

    let rows: Vec<FileFolder> = match parent_id {
        Some(pid) if !pid.trim().is_empty() => stmt
            .query_map([pid.trim()], map_row)?
            .collect::<rusqlite::Result<Vec<_>>>()?,
        _ => stmt
            .query_map([], map_row)?
            .collect::<rusqlite::Result<Vec<_>>>()?,
    };

    Ok(rows)
}

pub fn get_all_file_folders(conn: &rusqlite::Connection) -> Result<Vec<FileFolder>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, parent_id, color, created_at, updated_at \
         FROM file_folders WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE ASC",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(FileFolder {
            id: row.get(0)?,
            name: row.get(1)?,
            parent_id: row.get(2)?,
            color: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;

    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn create_file_folder(
    conn: &rusqlite::Connection,
    name: &str,
    parent_id: Option<&str>,
    color: Option<&str>,
) -> Result<Option<FileFolder>> {
    let clean_name = name.trim();
    if clean_name.is_empty() {
        return Ok(None);
    }

    let parent_clean = parent_id.map(|s| s.trim()).filter(|s| !s.is_empty());
    if let Some(pid) = parent_clean {
        let parent_exists: Option<String> = conn
            .query_row(
                "SELECT id FROM file_folders WHERE id = ?1 AND deleted_at IS NULL",
                params![pid],
                |r| r.get(0),
            )
            .optional()?;
        if parent_exists.is_none() {
            return Ok(None);
        }
    }

    let id = uuid::Uuid::new_v4().to_string();
    let resolved_color = color
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("#3b82f6");

    conn.execute(
        "INSERT INTO file_folders (id, name, parent_id, color, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        params![id, clean_name, parent_clean, resolved_color],
    )?;

    Ok(Some(FileFolder {
        id,
        name: clean_name.to_string(),
        parent_id: parent_clean.map(String::from),
        color: resolved_color.to_string(),
        created_at: None,
        updated_at: None,
    }))
}

pub fn rename_file_folder(conn: &rusqlite::Connection, id: &str, new_name: &str) -> Result<bool> {
    let clean_name = new_name.trim();
    if id.trim().is_empty() || clean_name.is_empty() {
        return Ok(false);
    }

    let rows = conn.execute(
        "UPDATE file_folders SET name = ?1, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?2 AND deleted_at IS NULL",
        params![clean_name, id.trim()],
    )?;

    Ok(rows > 0)
}

pub fn move_file_folder(
    conn: &rusqlite::Connection,
    id: &str,
    new_parent_id: Option<&str>,
) -> Result<bool> {
    if id.trim().is_empty() {
        return Ok(false);
    }
    let parent_clean = new_parent_id.map(|s| s.trim()).filter(|s| !s.is_empty());
    if let Some(pid) = parent_clean {
        if pid == id.trim() {
            return Ok(false);
        }
        let parent_exists: Option<String> = conn
            .query_row(
                "SELECT id FROM file_folders WHERE id = ?1 AND deleted_at IS NULL",
                params![pid],
                |r| r.get(0),
            )
            .optional()?;
        if parent_exists.is_none() {
            return Ok(false);
        }
        let creates_cycle: bool = conn.query_row(
            "WITH RECURSIVE descendants(id) AS (\
                 SELECT id FROM file_folders WHERE id = ?1 \
                 UNION SELECT child.id FROM file_folders child \
                 INNER JOIN descendants parent ON child.parent_id = parent.id) \
             SELECT EXISTS(SELECT 1 FROM descendants WHERE id = ?2)",
            params![id.trim(), pid],
            |row| row.get(0),
        )?;
        if creates_cycle {
            return Ok(false);
        }
    }

    let rows = conn.execute(
        "UPDATE file_folders SET parent_id = ?1, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?2 AND deleted_at IS NULL",
        params![parent_clean, id.trim()],
    )?;

    Ok(rows > 0)
}

pub fn delete_file_folder(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    if id.trim().is_empty() {
        return Ok(false);
    }

    let transaction = conn.unchecked_transaction()?;
    let now = chrono::Utc::now().to_rfc3339();
    let rows = transaction.execute(
        "UPDATE file_folders SET deleted_at = ?1, updated_at = ?1 \
         WHERE id = ?2 AND deleted_at IS NULL",
        params![now, id.trim()],
    )?;
    if rows == 0 {
        transaction.commit()?;
        return Ok(false);
    }
    transaction.execute(
        "UPDATE files SET folder_id = NULL, updated_at = ?1 \
         WHERE folder_id = ?2 AND deleted_at IS NULL",
        params![now, id.trim()],
    )?;
    transaction.execute(
        "UPDATE file_folders SET parent_id = NULL, updated_at = ?1 \
         WHERE parent_id = ?2 AND deleted_at IS NULL",
        params![now, id.trim()],
    )?;
    transaction.commit()?;
    Ok(true)
}
