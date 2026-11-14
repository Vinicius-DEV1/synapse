//! Web link metadata caching and retrieval.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};

use super::models::LinkMetadata;
use crate::error::Result;

/// Retrieves cached metadata for an external web link.
pub fn get_link_metadata(conn: &Connection, url: &str) -> Result<Option<LinkMetadata>> {
    let sql = "SELECT url, title, channel, duration, is_playlist, playlist_count, upload_date, image_url \
               FROM link_metadata_cache WHERE url = ?1 AND deleted_at IS NULL LIMIT 1";

    let opt = conn
        .query_row(sql, params![url], |row| {
            let is_playlist_int: Option<i32> = row.get(4)?;
            Ok(LinkMetadata {
                url: row.get(0)?,
                title: row.get(1)?,
                channel: row.get(2)?,
                duration: row.get(3)?,
                is_playlist: is_playlist_int.map(|v| v != 0),
                playlist_count: row.get(5)?,
                upload_date: row.get(6)?,
                image_url: row.get(7)?,
            })
        })
        .optional()?;

    Ok(opt)
}

/// Saves or updates link metadata in the cache using UPSERT.
pub fn save_link_metadata(conn: &Connection, meta: &LinkMetadata) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let is_playlist_int = meta.is_playlist.map(|b| if b { 1 } else { 0 });

    let rows = conn.execute(
        "INSERT INTO link_metadata_cache \
         (url, title, channel, duration, is_playlist, playlist_count, upload_date, image_url, updated_at, deleted_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL) \
         ON CONFLICT(url) DO UPDATE SET \
            title = excluded.title, \
            channel = excluded.channel, \
            duration = excluded.duration, \
            is_playlist = excluded.is_playlist, \
            playlist_count = excluded.playlist_count, \
            upload_date = excluded.upload_date, \
            image_url = excluded.image_url, \
            updated_at = excluded.updated_at, \
            deleted_at = NULL",
        params![
            meta.url,
            meta.title,
            meta.channel,
            meta.duration,
            is_playlist_int,
            meta.playlist_count,
            meta.upload_date,
            meta.image_url,
            now,
        ],
    )?;

    Ok(rows > 0)
}

/// Soft-deletes a cached link metadata entry.
pub fn delete_link_metadata(conn: &Connection, url: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE link_metadata_cache SET deleted_at = ?1, updated_at = ?1 WHERE url = ?2 AND deleted_at IS NULL",
        params![now, url],
    )?;
    Ok(rows > 0)
}

/// Retrieves a stored link entity JSON from config by canonical URL.
pub fn get_link_entity(conn: &Connection, canonical_url: &str) -> Result<Option<String>> {
    let key1 = format!("link_entity:{}", canonical_url);
    let key2 = format!("linkEntity:{}", canonical_url);
    let sql = "SELECT data, value FROM config WHERE id = ?1 OR id = ?2 ORDER BY id ASC LIMIT 1";
    let opt = conn
        .query_row(sql, params![key1, key2], |row| {
            let data: Option<String> = row.get(0)?;
            let value: Option<String> = row.get(1)?;
            Ok(data.or(value).unwrap_or_default())
        })
        .optional()?;
    Ok(opt)
}

/// Upserts a link entity JSON into config by canonical URL.
pub fn save_link_entity(conn: &Connection, canonical_url: &str, entity_json: &str) -> Result<bool> {
    let key = format!("link_entity:{}", canonical_url);
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "INSERT INTO config (id, data, value, updated_at) VALUES (?1, ?2, ?2, ?3) \
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, value = excluded.value, updated_at = excluded.updated_at",
        params![key, entity_json, now],
    )?;
    Ok(rows > 0)
}
