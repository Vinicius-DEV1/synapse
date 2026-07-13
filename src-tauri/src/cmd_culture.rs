use tauri::State;
use serde::{Deserialize, Serialize};
use crate::db::DbState;
use rusqlite::params;

#[derive(Serialize, Deserialize)]
pub struct CultureItem {
    pub id: String,
    pub title: String,
    pub cover_image: Option<String>,
    pub status: String,
    pub rating: i32,
    pub current_episode: i32,
    pub total_episodes: i32,
    pub summary: Option<String>,
    pub user_score: f64,
    pub category: String,
}

#[derive(Serialize, Deserialize)]
pub struct CultureEpisode {
    pub id: String,
    pub item_id: String,
    pub episode_number: i32,
    pub title: String,
    pub watched: i32,
    pub watched_at: Option<String>,
}

#[tauri::command]
pub fn culture_get_items(db_state: State<'_, DbState>) -> Result<Vec<CultureItem>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT id, title, cover_image, status, rating, current_episode, total_episodes, summary, user_score, category FROM items WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt.query_map([], |row| {
        Ok(CultureItem {
            id: row.get(0)?,
            title: row.get(1)?,
            cover_image: row.get(2)?,
            status: row.get(3)?,
            rating: row.get(4)?,
            current_episode: row.get(5)?,
            total_episodes: row.get(6)?,
            summary: row.get(7)?,
            user_score: row.get(8)?,
            category: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i { items.push(item); }
    }
    Ok(items)
}

#[tauri::command]
pub fn culture_create_item(item: CultureItem, db_state: State<'_, DbState>) -> Result<CultureItem, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let id = if item.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { item.id.clone() };
    
    conn.execute(
        "INSERT INTO items (id, title, cover_image, status, rating, current_episode, total_episodes, summary, user_score, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, item.title, item.cover_image, item.status, item.rating, item.current_episode, item.total_episodes, item.summary, item.user_score, item.category]
    ).map_err(|e| e.to_string())?;
    
    let mut ret = item;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn culture_update_item(id: String, item: CultureItem, db_state: State<'_, DbState>) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let count = conn.execute(
        "UPDATE items SET title = ?, cover_image = ?, status = ?, rating = ?, current_episode = ?, total_episodes = ?, summary = ?, user_score = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![item.title, item.cover_image, item.status, item.rating, item.current_episode, item.total_episodes, item.summary, item.user_score, item.category, id]
    ).map_err(|e| e.to_string())?;
        
    Ok(count as i32)
}

#[tauri::command]
pub fn culture_delete_item(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute("UPDATE items SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
        
    Ok(true)
}

#[tauri::command]
pub fn culture_update_progress(id: String, progress: i32, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute(
        "UPDATE items SET current_episode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![progress, id]
    ).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn culture_get_episodes(item_id: String, db_state: State<'_, DbState>) -> Result<Vec<CultureEpisode>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT id, item_id, episode_number, title, watched, watched_at FROM episodes WHERE item_id = ? ORDER BY episode_number ASC")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt.query_map([&item_id], |row| {
        Ok(CultureEpisode {
            id: row.get(0)?,
            item_id: row.get(1)?,
            episode_number: row.get(2)?,
            title: row.get(3)?,
            watched: row.get(4)?,
            watched_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i { items.push(item); }
    }
    Ok(items)
}

#[tauri::command]
pub fn culture_save_episodes(item_id: String, episodes: Vec<CultureEpisode>, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute("DELETE FROM episodes WHERE item_id = ?", [&item_id]).map_err(|e| e.to_string())?;
    
    for ep in episodes {
        conn.execute(
            "INSERT INTO episodes (id, item_id, episode_number, title, watched, watched_at) VALUES (?, ?, ?, ?, ?, ?)",
            params![ep.id, item_id, ep.episode_number, ep.title, ep.watched, ep.watched_at]
        ).map_err(|e| e.to_string())?;
    }
    
    Ok(true)
}

#[tauri::command]
pub fn culture_toggle_episode_watched(episode_id: String, is_watched: bool, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let watched = if is_watched { 1 } else { 0 };
    let watched_at = if is_watched { Some(chrono::Utc::now().to_rfc3339()) } else { None };
    
    conn.execute(
        "UPDATE episodes SET watched = ?, watched_at = ? WHERE id = ?",
        params![watched, watched_at, episode_id]
    ).map_err(|e| e.to_string())?;
    Ok(true)
}
