use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize)]
pub struct CultureItem {
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub synopsis: Option<String>,
    pub cover_image: Option<String>,
    pub access_link: Option<String>,
    pub progress: i32,
    pub total_progress: i32,
    pub is_goal: bool,
    pub goal_note: Option<String>,
    pub api_id: Option<String>,
    pub api_source: Option<String>,
    pub status: Option<String>,
    pub last_sync_at: Option<String>,
    pub volumes: Option<i32>,
    pub chapters: Option<i32>,
    pub episodes_count: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct CultureEpisode {
    pub id: String,
    pub item_id: String,
    pub episode_number: i32,
    pub season_number: Option<i32>,
    pub episode_in_season: Option<i32>,
    pub title: String,
    pub synopsis: Option<String>,
    pub is_watched: bool,
    pub aired_at: Option<String>,
    pub updated_at: Option<String>,
}

#[tauri::command]
pub fn culture_get_items(db_state: State<'_, DbState>) -> Result<Vec<CultureItem>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, title, type, synopsis, cover_image, access_link, progress, total_progress, is_goal, goal_note, api_id, api_source, status, last_sync_at, volumes, chapters, episodes_count, created_at, updated_at FROM culture_items WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            let is_goal_int: i32 = row.get(8).unwrap_or(0);
            Ok(CultureItem {
                id: row.get(0)?,
                title: row.get(1)?,
                item_type: row.get(2)?,
                synopsis: row.get(3)?,
                cover_image: row.get(4)?,
                access_link: row.get(5)?,
                progress: row.get(6).unwrap_or(0),
                total_progress: row.get(7).unwrap_or(0),
                is_goal: is_goal_int == 1,
                goal_note: row.get(9)?,
                api_id: row.get(10)?,
                api_source: row.get(11)?,
                status: row.get(12)?,
                last_sync_at: row.get(13)?,
                volumes: row.get(14)?,
                chapters: row.get(15)?,
                episodes_count: row.get(16)?,
                created_at: row.get(17)?,
                updated_at: row.get(18)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }
    Ok(items)
}

#[tauri::command]
pub fn culture_create_item(
    item: CultureItem,
    db_state: State<'_, DbState>,
) -> Result<CultureItem, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = if item.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        item.id.clone()
    };
    let is_goal_int = if item.is_goal { 1 } else { 0 };

    conn.execute(
        "INSERT INTO culture_items (id, title, type, synopsis, cover_image, access_link, progress, total_progress, is_goal, goal_note, api_id, api_source, status, last_sync_at, volumes, chapters, episodes_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, item.title, item.item_type, item.synopsis, item.cover_image, item.access_link, item.progress, item.total_progress, is_goal_int, item.goal_note, item.api_id, item.api_source, item.status, item.last_sync_at, item.volumes, item.chapters, item.episodes_count]
    ).map_err(|e| e.to_string())?;

    let mut ret = item;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn culture_update_item(
    id: String,
    item: CultureItem,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let is_goal_int = if item.is_goal { 1 } else { 0 };

    let count = conn.execute(
        "UPDATE culture_items SET title = ?, type = ?, synopsis = ?, cover_image = ?, access_link = ?, progress = ?, total_progress = ?, is_goal = ?, goal_note = ?, api_id = ?, api_source = ?, status = ?, last_sync_at = ?, volumes = ?, chapters = ?, episodes_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![item.title, item.item_type, item.synopsis, item.cover_image, item.access_link, item.progress, item.total_progress, is_goal_int, item.goal_note, item.api_id, item.api_source, item.status, item.last_sync_at, item.volumes, item.chapters, item.episodes_count, id]
    ).map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn culture_delete_item(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("UPDATE culture_items SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub fn culture_update_progress(
    id: String,
    progress: i32,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute(
        "UPDATE culture_items SET progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![progress, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn culture_get_episodes(
    item_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<CultureEpisode>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, item_id, episode_number, season_number, episode_in_season, title, synopsis, is_watched, aired_at, updated_at FROM culture_episodes WHERE item_id = ? ORDER BY episode_number ASC")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([&item_id], |row| {
            let is_watched_int: i32 = row.get(7).unwrap_or(0);
            Ok(CultureEpisode {
                id: row.get(0)?,
                item_id: row.get(1)?,
                episode_number: row.get(2)?,
                season_number: row.get(3)?,
                episode_in_season: row.get(4)?,
                title: row.get(5)?,
                synopsis: row.get(6)?,
                is_watched: is_watched_int == 1,
                aired_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }
    Ok(items)
}

#[tauri::command]
pub fn culture_save_episodes(
    item_id: String,
    episodes: Vec<CultureEpisode>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute(
        "UPDATE culture_episodes SET deleted_at = CURRENT_TIMESTAMP WHERE item_id = ?",
        [&item_id],
    )
    .map_err(|e| e.to_string())?;

    for ep in episodes {
        let is_watched_int = if ep.is_watched { 1 } else { 0 };
        conn.execute(
            "INSERT INTO culture_episodes (id, item_id, episode_number, season_number, episode_in_season, title, synopsis, is_watched, aired_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                item_id = excluded.item_id,
                episode_number = excluded.episode_number,
                season_number = excluded.season_number,
                episode_in_season = excluded.episode_in_season,
                title = excluded.title,
                synopsis = excluded.synopsis,
                is_watched = excluded.is_watched,
                aired_at = excluded.aired_at,
                updated_at = excluded.updated_at,
                deleted_at = NULL",
            params![ep.id, item_id, ep.episode_number, ep.season_number, ep.episode_in_season, ep.title, ep.synopsis, is_watched_int, ep.aired_at, ep.updated_at]
        ).map_err(|e| e.to_string())?;
    }

    Ok(true)
}

#[tauri::command]
pub fn culture_toggle_episode_watched(
    episode_id: String,
    is_watched: bool,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let watched = if is_watched { 1 } else { 0 };

    conn.execute(
        "UPDATE culture_episodes SET is_watched = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![watched, episode_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(true)
}
