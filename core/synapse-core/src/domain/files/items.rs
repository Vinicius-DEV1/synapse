use super::models::FileRecord;
use crate::error::Result;
use rusqlite::params;

pub fn get_files_for_section(
    conn: &rusqlite::Connection,
    section: &str,
    folder_id: Option<&str>,
) -> Result<Vec<FileRecord>> {
    let mut sql = String::from(
        "SELECT id, name, file_type, file_size, local_path, drive_file_id, \
         CASE WHEN drive_file_id IS NOT NULL AND drive_file_id != '' THEN 1 ELSE 0 END AS has_drive_copy, \
         folder_id, mime_type, created_at, updated_at \
         FROM files WHERE deleted_at IS NULL",
    );

    let clean_folder = folder_id.map(|s| s.trim()).filter(|s| !s.is_empty());

    match section {
        "recent" => {
            sql.push_str(" AND updated_at >= datetime('now', '-30 days') ORDER BY updated_at DESC, name COLLATE NOCASE ASC");
        }
        "drive" => {
            sql.push_str(" AND drive_file_id IS NOT NULL AND drive_file_id != '' ORDER BY name COLLATE NOCASE ASC");
        }
        _ => {
            if clean_folder.is_none() {
                sql.push_str(" AND folder_id IS NULL ORDER BY name COLLATE NOCASE ASC");
            } else {
                sql.push_str(" AND folder_id = ?1 ORDER BY name COLLATE NOCASE ASC");
            }
        }
    }

    let mut stmt = conn.prepare(&sql)?;
    let map_row = |row: &rusqlite::Row| {
        Ok(FileRecord {
            id: row.get(0)?,
            name: row.get(1)?,
            file_type: row.get(2)?,
            file_size: row.get(3).unwrap_or(0),
            local_path: row.get(4)?,
            drive_file_id: row.get(5)?,
            has_drive_copy: row.get(6).unwrap_or(0),
            folder_id: row.get(7)?,
            mime_type: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    };

    let rows: Vec<FileRecord> = if section != "recent" && section != "drive" && clean_folder.is_some() {
        stmt.query_map([clean_folder.unwrap()], map_row)?
            .filter_map(std::result::Result::ok)
            .collect()
    } else {
        stmt.query_map([], map_row)?
            .filter_map(std::result::Result::ok)
            .collect()
    };

    Ok(rows)
}

pub fn get_drive_file_count(conn: &rusqlite::Connection) -> Result<i32> {
    let count: i32 = conn.query_row(
        "SELECT count(*) FROM files WHERE deleted_at IS NULL AND drive_file_id IS NOT NULL AND drive_file_id != ''",
        [],
        |r| r.get(0),
    ).unwrap_or(0);
    Ok(count)
}

pub fn rename_file(conn: &rusqlite::Connection, file_id: &str, name: &str) -> Result<bool> {
    let clean_name = name.trim();
    if file_id.trim().is_empty() || clean_name.is_empty() {
        return Ok(false);
    }
    let rows = conn.execute(
        "UPDATE files SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND deleted_at IS NULL",
        params![clean_name, file_id.trim()],
    )?;
    Ok(rows > 0)
}

pub fn move_file(conn: &rusqlite::Connection, file_id: &str, folder_id: Option<&str>) -> Result<bool> {
    if file_id.trim().is_empty() {
        return Ok(false);
    }
    let clean_folder = folder_id.map(|s| s.trim()).filter(|s| !s.is_empty());
    if let Some(fid) = clean_folder {
        let folder_exists: Option<String> = conn
            .query_row(
                "SELECT id FROM file_folders WHERE id = ?1 AND deleted_at IS NULL",
                params![fid],
                |r| r.get(0),
            )
            .ok();
        if folder_exists.is_none() {
            return Ok(false);
        }
    }

    let rows = conn.execute(
        "UPDATE files SET folder_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND deleted_at IS NULL",
        params![clean_folder, file_id.trim()],
    )?;
    Ok(rows > 0)
}

pub fn duplicate_file(
    conn: &rusqlite::Connection,
    file_id: &str,
    folder_id: Option<&str>,
) -> Result<Option<String>> {
    if file_id.trim().is_empty() {
        return Ok(None);
    }

    let clean_folder = folder_id.map(|s| s.trim()).filter(|s| !s.is_empty());
    if let Some(fid) = clean_folder {
        let folder_exists: Option<String> = conn
            .query_row(
                "SELECT id FROM file_folders WHERE id = ?1 AND deleted_at IS NULL",
                params![fid],
                |r| r.get(0),
            )
            .ok();
        if folder_exists.is_none() {
            return Ok(None);
        }
    }

    let source_name: Option<String> = conn
        .query_row(
            "SELECT name FROM files WHERE id = ?1 AND deleted_at IS NULL",
            params![file_id.trim()],
            |r| r.get(0),
        )
        .ok();

    let name = match source_name {
        Some(n) => n,
        None => return Ok(None),
    };

    let copy_name = if let Some(idx) = name.rfind('.') {
        format!("{} (cópia){}", &name[..idx], &name[idx..])
    } else {
        format!("{} (cópia)", name)
    };

    let new_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO files (id, name, file_type, file_size, local_path, drive_file_id, folder_id, mime_type, created_at, updated_at) \
         SELECT ?1, ?2, file_type, file_size, local_path, drive_file_id, ?3, mime_type, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP \
         FROM files WHERE id = ?4 AND deleted_at IS NULL",
        params![new_id, copy_name, clean_folder, file_id.trim()],
    )?;

    Ok(Some(new_id))
}

pub fn delete_file(conn: &rusqlite::Connection, file_id: &str) -> Result<bool> {
    if file_id.trim().is_empty() {
        return Ok(false);
    }
    let rows = conn.execute(
        "UPDATE files SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![file_id.trim()],
    )?;
    Ok(rows > 0)
}

pub fn delete_files(conn: &rusqlite::Connection, file_ids: &[&str]) -> Result<i32> {
    let mut count = 0;
    for id in file_ids {
        if delete_file(conn, id)? {
            count += 1;
        }
    }
    Ok(count)
}

pub fn link_file_to_page(conn: &rusqlite::Connection, file_id: &str, page_id: &str) -> Result<bool> {
    if file_id.trim().is_empty() || page_id.trim().is_empty() {
        return Ok(false);
    }
    let rows = conn.execute(
        "INSERT OR IGNORE INTO file_page_links (file_id, page_id, created_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
        params![file_id.trim(), page_id.trim()],
    )?;
    Ok(rows > 0)
}

pub fn unlink_file_from_page(conn: &rusqlite::Connection, file_id: &str, page_id: &str) -> Result<bool> {
    if file_id.trim().is_empty() || page_id.trim().is_empty() {
        return Ok(false);
    }
    let rows = conn.execute(
        "DELETE FROM file_page_links WHERE file_id = ?1 AND page_id = ?2",
        params![file_id.trim(), page_id.trim()],
    )?;
    Ok(rows > 0)
}

pub fn get_file_linked_pages(conn: &rusqlite::Connection, file_id: &str) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT page_id FROM file_page_links WHERE file_id = ?1 ORDER BY created_at ASC",
    )?;
    let iter = stmt.query_map([file_id.trim()], |row| row.get(0))?;
    let mut list = Vec::new();
    for pid in iter.flatten() {
        list.push(pid);
    }
    Ok(list)
}

pub fn get_file(conn: &rusqlite::Connection, file_id: &str) -> Result<Option<FileRecord>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, file_type, file_size, local_path, drive_file_id, \
         CASE WHEN drive_file_id IS NOT NULL AND drive_file_id != '' THEN 1 ELSE 0 END AS has_drive_copy, \
         folder_id, mime_type, created_at, updated_at \
         FROM files WHERE id = ?1 AND deleted_at IS NULL",
    )?;
    let mut rows = stmt.query(params![file_id.trim()])?;
    if let Some(row) = rows.next()? {
        Ok(Some(FileRecord {
            id: row.get(0)?,
            name: row.get(1)?,
            file_type: row.get(2)?,
            file_size: row.get(3).unwrap_or(0),
            local_path: row.get(4)?,
            drive_file_id: row.get(5)?,
            has_drive_copy: row.get(6).unwrap_or(0),
            folder_id: row.get(7)?,
            mime_type: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn update_file_local_path(
    conn: &rusqlite::Connection,
    file_id: &str,
    local_path: &str,
) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE files SET local_path = ?1, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?2 AND deleted_at IS NULL",
        params![local_path.trim(), file_id.trim()],
    )?;
    Ok(rows > 0)
}
