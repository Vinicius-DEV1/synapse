//! Video catalog database queries and persistence.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::json;

use super::models::VideoRecord;
use crate::error::Result;

/// Retrieves video records matching an optional collection filter.
pub fn get_videos(conn: &Connection, collection_filter: Option<&str>) -> Result<Vec<VideoRecord>> {
    let mut sql = String::from(
        "SELECT id, title, original_name, duration, file_path, progress, is_local, \
         collection_id, collection_name, drive_file_id, drive_web_file_id, drive_subtitle_id, \
         local_subtitle_path, subtitles_json, audio_tracks_json, youtube_url, youtube_description, \
         created_at, updated_at, deleted_at \
         FROM videos WHERE deleted_at IS NULL ",
    );

    let mut param_values: Vec<String> = Vec::new();

    if let Some(filter) = collection_filter {
        let trimmed = filter.trim();
        if !trimmed.is_empty() && trimmed != "Todos" && trimmed != "__all__" {
            if let Some(legacy_name) = trimmed.strip_prefix("legacy:") {
                sql.push_str("AND collection_id IS NULL AND collection_name = ?1 ");
                param_values.push(legacy_name.to_string());
            } else {
                sql.push_str("AND (collection_id = ?1 OR (collection_id IS NULL AND collection_name = ?1)) ");
                param_values.push(trimmed.to_string());
            }
        }
    }

    sql.push_str("ORDER BY updated_at DESC");

    let mut stmt = conn.prepare(&sql)?;
    let mut rows = if param_values.is_empty() {
        stmt.query([])?
    } else {
        stmt.query(rusqlite::params_from_iter(param_values.iter()))?
    };

    let mut videos = Vec::new();
    while let Some(row) = rows.next()? {
        videos.push(VideoRecord {
            id: row.get(0)?,
            title: row.get(1)?,
            original_name: row.get(2)?,
            duration: row.get(3)?,
            file_path: row.get(4)?,
            progress: row.get(5)?,
            is_local: row.get(6)?,
            collection_id: row.get(7)?,
            collection_name: row.get(8)?,
            drive_file_id: row.get(9)?,
            drive_web_file_id: row.get(10)?,
            drive_subtitle_id: row.get(11)?,
            local_subtitle_path: row.get(12)?,
            subtitles_json: row.get(13)?,
            audio_tracks_json: row.get(14)?,
            youtube_url: row.get(15)?,
            youtube_description: row.get(16)?,
            created_at: row.get(17)?,
            updated_at: row.get(18)?,
            deleted_at: row.get(19)?,
        });
    }

    Ok(videos)
}

/// Retrieves a single video record by ID.
pub fn get_video(conn: &Connection, video_id: &str) -> Result<Option<VideoRecord>> {
    let sql = "SELECT id, title, original_name, duration, file_path, progress, is_local, \
               collection_id, collection_name, drive_file_id, drive_web_file_id, drive_subtitle_id, \
               local_subtitle_path, subtitles_json, audio_tracks_json, youtube_url, youtube_description, \
               created_at, updated_at, deleted_at \
               FROM videos WHERE id = ?1 AND deleted_at IS NULL";

    let opt = conn
        .query_row(sql, params![video_id], |row| {
            Ok(VideoRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                original_name: row.get(2)?,
                duration: row.get(3)?,
                file_path: row.get(4)?,
                progress: row.get(5)?,
                is_local: row.get(6)?,
                collection_id: row.get(7)?,
                collection_name: row.get(8)?,
                drive_file_id: row.get(9)?,
                drive_web_file_id: row.get(10)?,
                drive_subtitle_id: row.get(11)?,
                local_subtitle_path: row.get(12)?,
                subtitles_json: row.get(13)?,
                audio_tracks_json: row.get(14)?,
                youtube_url: row.get(15)?,
                youtube_description: row.get(16)?,
                created_at: row.get(17)?,
                updated_at: row.get(18)?,
                deleted_at: row.get(19)?,
            })
        })
        .optional()?;

    Ok(opt)
}

/// Retrieves distinct video collections (id and name).
pub fn get_video_collections(conn: &Connection) -> Result<Vec<serde_json::Value>> {
    let sql = "SELECT DISTINCT collection_id, collection_name FROM videos \
               WHERE deleted_at IS NULL AND collection_name IS NOT NULL AND collection_name != '' \
               ORDER BY collection_name ASC";
    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query([])?;

    let mut collections = Vec::new();
    while let Some(row) = rows.next()? {
        let collection_id: Option<String> = row.get(0)?;
        let collection_name: Option<String> = row.get(1)?;
        collections.push(json!({
            "collection_id": collection_id,
            "collection_name": collection_name,
        }));
    }

    Ok(collections)
}

/// Inserts a new video record into the catalog.
pub fn insert_video(conn: &Connection, video: &VideoRecord) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    let created_at = video.created_at.as_deref().unwrap_or(&now);
    let updated_at = video.updated_at.as_deref().unwrap_or(&now);

    conn.execute(
        "INSERT INTO videos (id, title, original_name, duration, file_path, progress, is_local, \
         collection_id, collection_name, drive_file_id, drive_web_file_id, drive_subtitle_id, \
         local_subtitle_path, subtitles_json, audio_tracks_json, youtube_url, youtube_description, \
         created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
        params![
            video.id,
            video.title,
            video.original_name,
            video.duration,
            video.file_path,
            video.progress.unwrap_or(0.0),
            video.is_local.unwrap_or(1),
            video.collection_id,
            video.collection_name,
            video.drive_file_id,
            video.drive_web_file_id,
            video.drive_subtitle_id,
            video.local_subtitle_path,
            video.subtitles_json,
            video.audio_tracks_json,
            video.youtube_url,
            video.youtube_description,
            created_at,
            updated_at,
        ],
    )?;

    Ok(())
}

/// Updates video playback progress timestamp.
pub fn update_video_progress(conn: &Connection, video_id: &str, progress: f64) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE videos SET progress = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![progress, now, video_id],
    )?;
    Ok(rows > 0)
}

/// Updates video total duration if not already set or invalid.
pub fn update_video_duration(conn: &Connection, video_id: &str, duration: f64) -> Result<bool> {
    if video_id.is_empty() || !duration.is_finite() || duration <= 0.0 {
        return Ok(false);
    }
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE videos SET duration = ?1, updated_at = ?2 \
         WHERE id = ?3 AND deleted_at IS NULL AND (duration IS NULL OR duration <= 0)",
        params![duration, now, video_id],
    )?;
    Ok(rows > 0)
}

/// Soft-deletes a video and its associated vocabulary words.
pub fn soft_delete_video(conn: &Connection, video_id: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE videos SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, video_id],
    )?;

    if rows > 0 {
        let _ = conn.execute(
            "UPDATE video_words SET deleted_at = ?1, updated_at = ?1 WHERE video_id = ?2 AND deleted_at IS NULL",
            params![now, video_id],
        );
        Ok(true)
    } else {
        Ok(false)
    }
}
