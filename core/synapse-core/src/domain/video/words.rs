//! Video vocabulary words persistence.

use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use super::models::VideoWord;
use crate::error::Result;

/// Retrieves vocabulary words linked to a video, ordered by timestamp.
pub fn get_video_words(conn: &Connection, video_id: &str) -> Result<Vec<VideoWord>> {
    let sql = "SELECT id, video_id, word, context, timestamp, created_at, updated_at, deleted_at \
               FROM video_words WHERE video_id = ?1 AND deleted_at IS NULL \
               ORDER BY timestamp ASC";
    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![video_id])?;

    let mut words = Vec::new();
    while let Some(row) = rows.next()? {
        words.push(VideoWord {
            id: row.get(0)?,
            video_id: row.get(1)?,
            word: row.get(2)?,
            context: row.get(3)?,
            timestamp: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            deleted_at: row.get(7)?,
        });
    }

    Ok(words)
}

/// Adds a vocabulary word to a video.
pub fn add_video_word(
    conn: &Connection,
    video_id: &str,
    word: &str,
    context: Option<&str>,
    timestamp: f64,
) -> Result<VideoWord> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO video_words (id, video_id, word, context, timestamp, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![id, video_id, word, context, timestamp, now],
    )?;

    Ok(VideoWord {
        id,
        video_id: video_id.to_string(),
        word: word.to_string(),
        context: context.map(|s| s.to_string()),
        timestamp,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    })
}

/// Soft-deletes a vocabulary word by ID.
pub fn delete_video_word(conn: &Connection, word_id: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE video_words SET deleted_at = ?1 WHERE id = ?2",
        params![now, word_id],
    )?;
    Ok(rows > 0)
}
