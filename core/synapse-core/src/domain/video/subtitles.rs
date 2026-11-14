//! Video subtitle metadata and track management.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;

use crate::error::{Result, SynapseError};

/// Retrieves the subtitles JSON and legacy local subtitle path for a video.
pub fn get_video_subtitles(
    conn: &Connection,
    video_id: &str,
) -> Result<Option<(Option<String>, Option<String>)>> {
    let sql = "SELECT subtitles_json, local_subtitle_path FROM videos WHERE id = ?1 AND deleted_at IS NULL";
    let opt = conn
        .query_row(sql, params![video_id], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .optional()?;
    Ok(opt)
}

/// Updates the subtitles JSON and optional legacy local subtitle path.
pub fn update_video_subtitles(
    conn: &Connection,
    video_id: &str,
    subtitles_json: &str,
    local_subtitle_path: Option<&str>,
) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE videos SET subtitles_json = ?1, local_subtitle_path = ?2, updated_at = ?3 \
         WHERE id = ?4 AND deleted_at IS NULL",
        params![subtitles_json, local_subtitle_path, now, video_id],
    )?;
    Ok(rows > 0)
}

/// Renames a subtitle track inside subtitles_json.
pub fn rename_video_subtitle(
    conn: &Connection,
    video_id: &str,
    track_id: &str,
    label: &str,
) -> Result<bool> {
    let norm_video_id = video_id.trim();
    let norm_track_id = track_id.trim();
    let norm_label = label.trim();
    if norm_video_id.is_empty() || norm_track_id.is_empty() || norm_label.is_empty() || norm_label.len() > 120 {
        return Ok(false);
    }

    let sub_data = get_video_subtitles(conn, norm_video_id)?;
    let (subtitles_json_opt, local_path_opt) = match sub_data {
        Some(data) => data,
        None => return Ok(false),
    };

    let mut tracks: Vec<Value> = subtitles_json_opt
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();

    let mut found = false;
    for track in &mut tracks {
        if let Some(obj) = track.as_object_mut() {
            if obj.get("id").and_then(|v| v.as_str()) == Some(norm_track_id) {
                obj.insert("label".to_string(), Value::String(norm_label.to_string()));
                found = true;
                break;
            }
        }
    }

    if !found && norm_track_id == "legacy" {
        if let Some(ref legacy_path) = local_path_opt {
            if !legacy_path.is_empty() {
                tracks.push(serde_json::json!({
                    "id": "legacy",
                    "label": norm_label,
                    "local_path": legacy_path
                }));
                found = true;
            }
        }
    }

    if !found {
        return Ok(false);
    }

    let updated_json = serde_json::to_string(&tracks).map_err(|e| SynapseError::Internal(e.to_string()))?;
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE videos SET subtitles_json = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![updated_json, now, norm_video_id],
    )?;

    Ok(rows > 0)
}

/// Removes a subtitle track from subtitles_json, returning the local file path if one needs removal.
pub fn remove_video_subtitle(
    conn: &Connection,
    video_id: &str,
    track_id: &str,
) -> Result<Option<String>> {
    let norm_video_id = video_id.trim();
    let norm_track_id = track_id.trim();
    if norm_video_id.is_empty() || norm_track_id.is_empty() {
        return Ok(None);
    }

    let sub_data = get_video_subtitles(conn, norm_video_id)?;
    let (subtitles_json_opt, local_path_opt) = match sub_data {
        Some(data) => data,
        None => return Ok(None),
    };

    let mut tracks: Vec<Value> = subtitles_json_opt
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();

    let mut path_to_remove: Option<String> = None;
    let mut found = false;

    tracks.retain(|track| {
        if let Some(obj) = track.as_object() {
            if obj.get("id").and_then(|v| v.as_str()) == Some(norm_track_id) {
                path_to_remove = obj.get("local_path").and_then(|v| v.as_str()).map(|s| s.to_string());
                found = true;
                return false;
            }
        }
        true
    });

    let mut legacy_path = local_path_opt;
    let is_legacy = norm_track_id == "legacy";
    if is_legacy {
        if path_to_remove.is_none() {
            path_to_remove = legacy_path.clone();
        }
        legacy_path = None;
        found = true;
    }

    if !found {
        return Ok(None);
    }

    let updated_json = serde_json::to_string(&tracks).map_err(|e| SynapseError::Internal(e.to_string()))?;
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE videos SET subtitles_json = ?1, local_subtitle_path = ?2, updated_at = ?3 \
         WHERE id = ?4 AND deleted_at IS NULL",
        params![updated_json, legacy_path, now, norm_video_id],
    )?;

    Ok(path_to_remove)
}
