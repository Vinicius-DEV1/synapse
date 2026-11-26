use crate::error::Result;
use rusqlite::{params, OptionalExtension};

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

pub fn move_file(
    conn: &rusqlite::Connection,
    file_id: &str,
    folder_id: Option<&str>,
) -> Result<bool> {
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
            .optional()?;
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
            .optional()?;
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
        .optional()?;

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
    let transaction = conn.unchecked_transaction()?;
    let mut count = 0;
    for id in file_ids {
        if delete_file(&transaction, id)? {
            count += 1;
        }
    }
    transaction.commit()?;
    Ok(count)
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

pub fn replace_file_content_reference(
    conn: &rusqlite::Connection,
    file_id: &str,
    local_path: &str,
    file_size: i64,
) -> Result<bool> {
    let clean_id = file_id.trim();
    let clean_path = local_path.trim();
    if clean_id.is_empty() || clean_path.is_empty() || file_size < 0 {
        return Ok(false);
    }
    let rows = conn.execute(
        "UPDATE files SET local_path = ?1, file_size = ?2, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?3 AND deleted_at IS NULL",
        params![clean_path, file_size, clean_id],
    )?;
    Ok(rows > 0)
}

pub fn create_file(
    conn: &rusqlite::Connection,
    id: &str,
    name: &str,
    file_type: &str,
    file_size: i64,
    local_path: &str,
    folder_id: Option<&str>,
    mime_type: Option<&str>,
) -> Result<bool> {
    let clean_id = id.trim();
    let clean_name = name.trim();
    let clean_type = file_type.trim();
    let clean_path = local_path.trim();
    if clean_id.is_empty()
        || clean_name.is_empty()
        || clean_type.is_empty()
        || clean_path.is_empty()
        || file_size < 0
    {
        return Ok(false);
    }
    let now = chrono::Utc::now().to_rfc3339();
    let clean_folder = folder_id.map(|s| s.trim()).filter(|s| !s.is_empty());
    let clean_mime = mime_type.map(|s| s.trim()).filter(|s| !s.is_empty());
    if let Some(folder_id) = clean_folder {
        let folder_exists: Option<String> = conn
            .query_row(
                "SELECT id FROM file_folders WHERE id = ?1 AND deleted_at IS NULL",
                params![folder_id],
                |row| row.get(0),
            )
            .optional()?;
        if folder_exists.is_none() {
            return Ok(false);
        }
    }
    let rows = conn.execute(
        "INSERT INTO files (id, name, file_type, file_size, local_path, drive_file_id, folder_id, mime_type, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7, ?8, ?8)",
        params![clean_id, clean_name, clean_type, file_size, clean_path, clean_folder, clean_mime, now],
    )?;
    Ok(rows == 1)
}

pub fn upsert_file_record(
    conn: &rusqlite::Connection,
    id: &str,
    name: &str,
    file_type: &str,
    file_size: i64,
    enc_path: Option<&str>,
    enc_drive: Option<&str>,
    folder_id: Option<&str>,
    mime_type: Option<&str>,
    created_at: Option<&str>,
    updated_at: &str,
) -> Result<()> {
    conn.execute(
        "INSERT INTO files (id, name, file_type, file_size, local_path, drive_file_id, folder_id, mime_type, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) \
         ON CONFLICT(id) DO UPDATE SET \
            name = excluded.name, \
            file_type = excluded.file_type, \
            file_size = excluded.file_size, \
            local_path = excluded.local_path, \
            drive_file_id = excluded.drive_file_id, \
            folder_id = excluded.folder_id, \
            mime_type = excluded.mime_type, \
            deleted_at = NULL, \
            updated_at = excluded.updated_at",
        params![id, name, file_type, file_size, enc_path, enc_drive, folder_id, mime_type, created_at, updated_at],
    )?;
    Ok(())
}

pub fn update_file_record(
    conn: &rusqlite::Connection,
    id: &str,
    name: &str,
    file_type: &str,
    file_size: i64,
    enc_path: Option<&str>,
    enc_drive: Option<&str>,
    folder_id: Option<&str>,
    mime_type: Option<&str>,
    updated_at: &str,
) -> Result<i32> {
    let count = conn.execute(
        "UPDATE files SET name = ?1, file_type = ?2, file_size = ?3, local_path = ?4, \
         drive_file_id = ?5, folder_id = ?6, mime_type = ?7, updated_at = ?8 WHERE id = ?9",
        params![name, file_type, file_size, enc_path, enc_drive, folder_id, mime_type, updated_at, id],
    )?;
    Ok(count as i32)
}

pub fn delete_file_with_annotations(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE files SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    let _ = conn.execute(
        "UPDATE library_highlights SET deleted_at = ?1, updated_at = ?1 WHERE book_id = ?2",
        params![now, id],
    );
    let _ = conn.execute(
        "UPDATE library_bookmarks SET deleted_at = ?1, updated_at = ?1 WHERE book_id = ?2",
        params![now, id],
    );
    Ok(true)
}

pub fn move_file_raw(
    conn: &rusqlite::Connection,
    id: &str,
    folder_id: Option<&str>,
) -> Result<bool> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE files SET folder_id = ?1, updated_at = ?2 WHERE id = ?3",
        params![folder_id, now, id],
    )?;
    Ok(true)
}
