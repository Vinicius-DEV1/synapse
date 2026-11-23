use super::models::CultureItem;
use crate::error::Result;
use rusqlite::params;

pub fn get_culture_items(
    conn: &rusqlite::Connection,
    status_filter: Option<&str>,
) -> Result<Vec<CultureItem>> {
    let sql = match status_filter {
        Some(s) if !s.trim().is_empty() => {
            "SELECT id, title, type, synopsis, cover_image, access_link, progress, total_progress, \
             total_episodes, is_goal, goal_note, api_id, api_source, status, last_sync_at, volumes, \
             chapters, episodes_count, created_at, updated_at \
             FROM culture_items WHERE deleted_at IS NULL AND status = ? \
             ORDER BY updated_at DESC LIMIT 300"
        }
        _ => {
            "SELECT id, title, type, synopsis, cover_image, access_link, progress, total_progress, \
             total_episodes, is_goal, goal_note, api_id, api_source, status, last_sync_at, volumes, \
             chapters, episodes_count, created_at, updated_at \
             FROM culture_items WHERE deleted_at IS NULL \
             ORDER BY updated_at DESC LIMIT 300"
        }
    };

    let mut stmt = conn.prepare(sql)?;
    let map_row = |row: &rusqlite::Row| {
        let is_goal_int: i32 = row.get(9).unwrap_or(0);
        Ok(CultureItem {
            id: row.get(0)?,
            title: row.get(1)?,
            item_type: row.get(2)?,
            synopsis: row.get(3)?,
            cover_image: row.get(4)?,
            access_link: row.get(5)?,
            progress: row.get(6).unwrap_or(0),
            total_progress: row.get(7).unwrap_or(0),
            total_episodes: row.get(8).unwrap_or(0),
            is_goal: is_goal_int == 1,
            goal_note: row.get(10)?,
            api_id: row.get(11)?,
            api_source: row.get(12)?,
            status: row.get(13)?,
            last_sync_at: row.get(14)?,
            volumes: row.get(15)?,
            chapters: row.get(16)?,
            episodes_count: row.get(17)?,
            created_at: row.get(18)?,
            updated_at: row.get(19)?,
        })
    };

    let rows: Vec<CultureItem> = match status_filter {
        Some(s) if !s.trim().is_empty() => stmt
            .query_map([s.trim()], map_row)?
            .filter_map(std::result::Result::ok)
            .collect(),
        _ => stmt
            .query_map([], map_row)?
            .filter_map(std::result::Result::ok)
            .collect(),
    };

    Ok(rows)
}

pub fn create_culture_item(
    conn: &rusqlite::Connection,
    mut item: CultureItem,
) -> Result<CultureItem> {
    if item.id.trim().is_empty() {
        item.id = uuid::Uuid::new_v4().to_string();
    }
    if item.item_type.trim().is_empty() {
        item.item_type = "anime".to_string();
    }
    let status = item.status.clone().unwrap_or_else(|| "backlog".to_string());
    let total_eps = if item.total_episodes > 0 {
        item.total_episodes
    } else {
        item.total_progress
    };

    conn.execute(
        "INSERT INTO culture_items (id, title, type, synopsis, cover_image, access_link, \
         progress, total_progress, total_episodes, is_goal, goal_note, api_id, api_source, \
         status, last_sync_at, volumes, chapters, episodes_count, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        params![
            item.id,
            item.title.trim(),
            item.item_type.trim(),
            item.synopsis,
            item.cover_image,
            item.access_link,
            item.progress,
            total_eps,
            total_eps,
            if item.is_goal { 1 } else { 0 },
            item.goal_note,
            item.api_id,
            item.api_source,
            status,
            item.last_sync_at,
            item.volumes,
            item.chapters,
            item.episodes_count,
        ],
    )?;

    item.status = Some(status);
    item.total_episodes = total_eps;
    item.total_progress = total_eps;
    Ok(item)
}

pub fn update_culture_item(
    conn: &rusqlite::Connection,
    id: &str,
    item: &CultureItem,
) -> Result<bool> {
    let total_eps = if item.total_episodes > 0 {
        item.total_episodes
    } else {
        item.total_progress
    };

    let rows = conn.execute(
        "UPDATE culture_items SET title = ?1, type = ?2, synopsis = ?3, cover_image = ?4, \
         access_link = ?5, progress = ?6, total_progress = ?7, total_episodes = ?8, is_goal = ?9, \
         goal_note = ?10, api_id = ?11, api_source = ?12, status = ?13, last_sync_at = ?14, \
         volumes = ?15, chapters = ?16, episodes_count = ?17, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?18 AND deleted_at IS NULL",
        params![
            item.title.trim(),
            item.item_type.trim(),
            item.synopsis,
            item.cover_image,
            item.access_link,
            item.progress,
            total_eps,
            total_eps,
            if item.is_goal { 1 } else { 0 },
            item.goal_note,
            item.api_id,
            item.api_source,
            item.status,
            item.last_sync_at,
            item.volumes,
            item.chapters,
            item.episodes_count,
            id.trim(),
        ],
    )?;

    Ok(rows > 0)
}

pub fn increment_culture_progress(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE culture_items SET progress = progress + 1, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id.trim()],
    )?;
    Ok(rows > 0)
}

pub fn update_culture_progress(
    conn: &rusqlite::Connection,
    id: &str,
    progress: i32,
) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE culture_items SET progress = ?1, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?2 AND deleted_at IS NULL",
        params![progress, id.trim()],
    )?;
    Ok(rows > 0)
}

pub fn update_culture_status(conn: &rusqlite::Connection, id: &str, status: &str) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE culture_items SET status = ?1, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?2 AND deleted_at IS NULL",
        params![status.trim(), id.trim()],
    )?;
    Ok(rows > 0)
}

pub fn set_culture_goal(
    conn: &rusqlite::Connection,
    id: &str,
    is_goal: bool,
    goal_note: &str,
) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE culture_items SET is_goal = ?1, goal_note = ?2, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?3 AND deleted_at IS NULL",
        params![if is_goal { 1 } else { 0 }, goal_note.trim(), id.trim()],
    )?;
    Ok(rows > 0)
}

pub fn delete_culture_item(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE culture_items SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id.trim()],
    )?;
    if rows > 0 {
        let _ = conn.execute(
            "UPDATE culture_episodes SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
             WHERE item_id = ?1 AND deleted_at IS NULL",
            params![id.trim()],
        );
    }
    Ok(rows > 0)
}
