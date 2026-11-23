//! Video folders and collection management.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashSet;
use uuid::Uuid;

use super::models::VideoFolder;
use crate::error::{Result, SynapseError};

/// Retrieves the consolidated list of configured and video-referenced folders.
pub fn get_video_folders(conn: &Connection) -> Result<Vec<VideoFolder>> {
    let mut configured_folders: Vec<VideoFolder> = Vec::new();

    let row_opt: Option<String> = conn
        .query_row(
            "SELECT COALESCE(NULLIF(data, ''), value) FROM config WHERE id = 'videoFolders'",
            [],
            |r| r.get(0),
        )
        .optional()?;

    if let Some(serialized) = row_opt {
        configured_folders =
            serde_json::from_str::<Vec<VideoFolder>>(&serialized).map_err(|error| {
                SynapseError::Internal(format!("Invalid video folder configuration: {error}"))
            })?;
    }

    let mut folders: Vec<VideoFolder> = Vec::new();
    let mut seen_ids: HashSet<String> = HashSet::new();

    for folder in configured_folders {
        let id = folder.id.trim().to_string();
        let name = folder.name.trim().to_string();
        if !id.is_empty() && !name.is_empty() && !seen_ids.contains(&id) {
            seen_ids.insert(id.clone());
            folders.push(VideoFolder { id, name });
        }
    }

    let sql = "SELECT DISTINCT collection_id, collection_name FROM videos \
               WHERE deleted_at IS NULL AND collection_id IS NOT NULL AND collection_id != '' \
               AND collection_name IS NOT NULL AND collection_name != '' ORDER BY collection_name ASC";
    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query([])?;

    while let Some(row) = rows.next()? {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let id_trimmed = id.trim().to_string();
        let name_trimmed = name.trim().to_string();
        if !id_trimmed.is_empty() && !name_trimmed.is_empty() && !seen_ids.contains(&id_trimmed) {
            seen_ids.insert(id_trimmed.clone());
            folders.push(VideoFolder {
                id: id_trimmed,
                name: name_trimmed,
            });
        }
    }

    Ok(folders)
}

/// Persists the list of video folders to the config table.
pub fn save_video_folders(conn: &Connection, folders: &[VideoFolder]) -> Result<bool> {
    let json = serde_json::to_string(folders).map_err(|e| SynapseError::Internal(e.to_string()))?;
    let now = Utc::now().to_rfc3339();
    let sql = "INSERT INTO config (id, data, value, updated_at) VALUES ('videoFolders', ?1, ?1, ?2) \
               ON CONFLICT(id) DO UPDATE SET data = excluded.data, value = excluded.value, updated_at = excluded.updated_at";
    conn.execute(sql, params![json, now])?;
    Ok(true)
}

/// Creates a new video folder and links any legacy unassigned videos with matching collection_name.
pub fn create_video_folder(conn: &Connection, name: &str) -> Result<Option<VideoFolder>> {
    let normalized_name = name.trim();
    if normalized_name.is_empty() || normalized_name.eq_ignore_ascii_case("Todos") {
        return Ok(None);
    }

    let mut folders = get_video_folders(conn)?;
    let folder = VideoFolder {
        id: Uuid::new_v4().to_string(),
        name: normalized_name.to_string(),
    };
    folders.push(folder.clone());

    let transaction = conn.unchecked_transaction()?;
    let now = Utc::now().to_rfc3339();
    transaction.execute(
        "UPDATE videos SET collection_id = ?1, updated_at = ?2 \
         WHERE deleted_at IS NULL AND collection_id IS NULL AND collection_name = ?3",
        params![folder.id, now, normalized_name],
    )?;

    save_video_folders(&transaction, &folders)?;
    transaction.commit()?;
    Ok(Some(folder))
}

/// Renames a video folder and updates associated video records.
pub fn rename_video_folder(conn: &Connection, folder_id: &str, name: &str) -> Result<bool> {
    let normalized_id = folder_id.trim();
    let normalized_name = name.trim();
    if normalized_id.is_empty()
        || normalized_name.is_empty()
        || normalized_name.eq_ignore_ascii_case("Todos")
    {
        return Ok(false);
    }

    let mut folders = get_video_folders(conn)?;
    let mut previous_name = String::new();
    let mut found = false;

    for folder in &mut folders {
        if folder.id == normalized_id {
            previous_name = folder.name.clone();
            folder.name = normalized_name.to_string();
            found = true;
            break;
        }
    }

    if !found {
        return Ok(false);
    }
    if previous_name == normalized_name {
        return Ok(true);
    }
    if folders.iter().any(|folder| {
        folder.id != normalized_id && folder.name == normalized_name
    }) {
        return Ok(false);
    }

    let transaction = conn.unchecked_transaction()?;
    let now = Utc::now().to_rfc3339();
    transaction.execute(
        "UPDATE videos SET collection_id = ?1, collection_name = ?2, updated_at = ?3 \
         WHERE deleted_at IS NULL AND collection_id IS NULL AND collection_name = ?4",
        params![normalized_id, normalized_name, now, previous_name],
    )?;
    transaction.execute(
        "UPDATE videos SET collection_name = ?1, updated_at = ?2 \
         WHERE deleted_at IS NULL AND collection_id = ?3",
        params![normalized_name, now, normalized_id],
    )?;

    save_video_folders(&transaction, &folders)?;
    transaction.commit()?;
    Ok(true)
}

/// Deletes a video folder and unlinks videos associated with it.
pub fn delete_video_folder(conn: &Connection, folder_id: &str) -> Result<bool> {
    let normalized_id = folder_id.trim();
    if normalized_id.is_empty() {
        return Ok(false);
    }

    let mut folders = get_video_folders(conn)?;
    let initial_len = folders.len();
    folders.retain(|f| f.id != normalized_id);

    if folders.len() == initial_len {
        return Ok(false);
    }

    let transaction = conn.unchecked_transaction()?;
    let now = Utc::now().to_rfc3339();
    transaction.execute(
        "UPDATE videos SET collection_id = NULL, collection_name = NULL, updated_at = ?1 \
         WHERE collection_id = ?2 AND deleted_at IS NULL",
        params![now, normalized_id],
    )?;

    save_video_folders(&transaction, &folders)?;
    transaction.commit()?;
    Ok(true)
}

/// Moves a video to a designated folder (or removes it if folder_id is None).
pub fn move_video_to_folder(
    conn: &Connection,
    video_id: &str,
    folder_id: Option<&str>,
) -> Result<bool> {
    let normalized_video_id = video_id.trim();
    if normalized_video_id.is_empty() {
        return Ok(false);
    }

    let exists: Option<String> = conn
        .query_row(
            "SELECT id FROM videos WHERE id = ?1 AND deleted_at IS NULL",
            params![normalized_video_id],
            |r| r.get(0),
        )
        .optional()?;

    if exists.is_none() {
        return Ok(false);
    }

    let now = Utc::now().to_rfc3339();
    let norm_fid = folder_id.map(|s| s.trim()).filter(|s| !s.is_empty());

    if let Some(fid) = norm_fid {
        let folders = get_video_folders(conn)?;
        let folder_name = folders.iter().find(|f| f.id == fid).map(|f| f.name.clone());
        if let Some(name) = folder_name {
            let rows = conn.execute(
                "UPDATE videos SET collection_id = ?1, collection_name = ?2, updated_at = ?3 \
                 WHERE id = ?4 AND deleted_at IS NULL",
                params![fid, name, now, normalized_video_id],
            )?;
            Ok(rows > 0)
        } else {
            Ok(false)
        }
    } else {
        let rows = conn.execute(
            "UPDATE videos SET collection_id = NULL, collection_name = NULL, updated_at = ?1 \
             WHERE id = ?2 AND deleted_at IS NULL",
            params![now, normalized_video_id],
        )?;
        Ok(rows > 0)
    }
}
