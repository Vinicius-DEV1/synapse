use super::models::CultureEpisode;
use crate::error::Result;
use rusqlite::params;

pub fn get_culture_episodes(
    conn: &rusqlite::Connection,
    item_id: &str,
) -> Result<Vec<CultureEpisode>> {
    let mut stmt = conn.prepare(
        "SELECT id, item_id, episode_number, title, synopsis, is_watched, watched_at, \
         season_number, episode_in_season, aired_at, updated_at \
         FROM culture_episodes WHERE item_id = ?1 AND deleted_at IS NULL \
         ORDER BY episode_number ASC",
    )?;

    let iter = stmt.query_map([item_id.trim()], |row| {
        let is_watched_int: i32 = row.get(5).unwrap_or(0);
        Ok(CultureEpisode {
            id: row.get(0)?,
            item_id: row.get(1)?,
            episode_number: row.get(2)?,
            title: row.get(3)?,
            synopsis: row.get(4)?,
            is_watched: is_watched_int == 1,
            watched_at: row.get(6)?,
            season_number: row.get(7)?,
            episode_in_season: row.get(8)?,
            aired_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;

    let mut list = Vec::new();
    for ep in iter.flatten() {
        list.push(ep);
    }
    Ok(list)
}

pub fn add_culture_episode(
    conn: &rusqlite::Connection,
    item_id: &str,
    episode_number: i32,
    title: &str,
    synopsis: &str,
    season_number: i32,
    episode_in_season: i32,
    aired_at: Option<&str>,
) -> Result<bool> {
    let id = uuid::Uuid::new_v4().to_string();
    let ep_title = if title.trim().is_empty() {
        format!("Episódio {}", episode_number)
    } else {
        title.trim().to_string()
    };

    let rows = conn.execute(
        "INSERT INTO culture_episodes (id, item_id, episode_number, title, synopsis, is_watched, \
         season_number, episode_in_season, aired_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, CURRENT_TIMESTAMP)",
        params![
            id,
            item_id.trim(),
            episode_number,
            ep_title,
            synopsis.trim(),
            season_number.max(1),
            episode_in_season.max(1),
            aired_at.map(|s| s.trim()),
        ],
    )?;

    Ok(rows > 0)
}

pub fn toggle_episode_watched(
    conn: &rusqlite::Connection,
    episode_id: &str,
    item_id: &str,
) -> Result<bool> {
    let current_watched: Option<i32> = conn
        .query_row(
            "SELECT is_watched FROM culture_episodes WHERE id = ?1 AND deleted_at IS NULL",
            params![episode_id.trim()],
            |row| row.get(0),
        )
        .ok();

    let currently_watched = current_watched.unwrap_or(0) == 1;
    let new_watched = !currently_watched;

    let rows = if new_watched {
        conn.execute(
            "UPDATE culture_episodes SET is_watched = 1, watched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
             WHERE id = ?1 AND deleted_at IS NULL",
            params![episode_id.trim()],
        )?
    } else {
        conn.execute(
            "UPDATE culture_episodes SET is_watched = 0, watched_at = NULL, updated_at = CURRENT_TIMESTAMP \
             WHERE id = ?1 AND deleted_at IS NULL",
            params![episode_id.trim()],
        )?
    };

    if rows == 0 {
        return Ok(false);
    }

    let watched_count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM culture_episodes WHERE item_id = ?1 AND is_watched = 1 AND deleted_at IS NULL",
            params![item_id.trim()],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "UPDATE culture_items SET progress = ?1, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?2 AND deleted_at IS NULL",
        params![watched_count, item_id.trim()],
    )?;

    let item_meta: rusqlite::Result<(i32, Option<String>)> = conn.query_row(
        "SELECT total_episodes, status FROM culture_items WHERE id = ?1 AND deleted_at IS NULL",
        params![item_id.trim()],
        |row| Ok((row.get(0).unwrap_or(0), row.get(1)?)),
    );

    if let Ok((total_eps, status)) = item_meta {
        if total_eps > 0 && watched_count >= total_eps && status.as_deref() != Some("finished") {
            conn.execute(
                "UPDATE culture_items SET status = 'finished', updated_at = CURRENT_TIMESTAMP \
                 WHERE id = ?1 AND deleted_at IS NULL",
                params![item_id.trim()],
            )?;
        }
    }

    Ok(true)
}

pub fn bulk_create_episodes(
    conn: &rusqlite::Connection,
    item_id: &str,
    count: i32,
) -> Result<bool> {
    let existing_count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM culture_episodes WHERE item_id = ?1 AND deleted_at IS NULL",
            params![item_id.trim()],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if existing_count >= count {
        return Ok(true);
    }

    for i in (existing_count + 1)..=count {
        let id = uuid::Uuid::new_v4().to_string();
        let title = format!("Episódio {}", i);
        conn.execute(
            "INSERT INTO culture_episodes (id, item_id, episode_number, title, synopsis, is_watched, \
             season_number, episode_in_season, updated_at) \
             VALUES (?1, ?2, ?3, ?4, '', 0, 1, ?5, CURRENT_TIMESTAMP)",
            params![id, item_id.trim(), i, title, i],
        )?;
    }

    Ok(true)
}

pub fn save_episodes(
    conn: &rusqlite::Connection,
    item_id: &str,
    episodes: &[CultureEpisode],
) -> Result<bool> {
    conn.execute(
        "UPDATE culture_episodes SET deleted_at = CURRENT_TIMESTAMP WHERE item_id = ?1",
        params![item_id.trim()],
    )?;

    for ep in episodes {
        let id = if ep.id.trim().is_empty() {
            uuid::Uuid::new_v4().to_string()
        } else {
            ep.id.clone()
        };
        conn.execute(
            "INSERT INTO culture_episodes (id, item_id, episode_number, season_number, episode_in_season, \
             title, synopsis, is_watched, aired_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP) \
             ON CONFLICT(id) DO UPDATE SET \
                item_id = excluded.item_id, \
                episode_number = excluded.episode_number, \
                season_number = excluded.season_number, \
                episode_in_season = excluded.episode_in_season, \
                title = excluded.title, \
                synopsis = excluded.synopsis, \
                is_watched = excluded.is_watched, \
                aired_at = excluded.aired_at, \
                updated_at = CURRENT_TIMESTAMP, \
                deleted_at = NULL",
            params![
                id,
                item_id.trim(),
                ep.episode_number,
                ep.season_number,
                ep.episode_in_season,
                ep.title,
                ep.synopsis,
                if ep.is_watched { 1 } else { 0 },
                ep.aired_at,
            ],
        )?;
    }

    Ok(true)
}

pub fn delete_culture_episode(conn: &rusqlite::Connection, episode_id: &str) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE culture_episodes SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![episode_id.trim()],
    )?;
    Ok(rows > 0)
}
