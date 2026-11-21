use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use synapse_core::domain::notes::models::PageRecord;
use synapse_core::domain::notes::pages;
use synapse_core::domain::notes::NotesRepository;
use tauri::State;

fn get_page_history_cache() -> &'static Mutex<HashMap<String, i64>> {
    static CACHE: OnceLock<Mutex<HashMap<String, i64>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn should_record_page_history(conn: &rusqlite::Connection, page_id: &str) -> bool {
    let now_epoch = chrono::Utc::now().timestamp();
    let mut cache = get_page_history_cache().lock().unwrap();
    let is_cooldown_active = cache
        .get(page_id)
        .map(|&last_time| now_epoch - last_time < 60)
        .unwrap_or(false);

    if is_cooldown_active {
        return false;
    }

    let should_db: bool = conn
        .query_row(
            "SELECT (strftime('%s', 'now') - strftime('%s', MAX(created_at))) > 60 FROM page_history WHERE page_id = ?",
            params![page_id],
            |row| row.get::<_, Option<bool>>(0)
        )
        .unwrap_or(None)
        .unwrap_or(true);

    if should_db {
        cache.insert(page_id.to_string(), now_epoch);
    }
    should_db
}

#[derive(Serialize, Deserialize)]
pub struct PageMeta {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub icon: String,
    pub sort_order: f64,
    pub crdt_state: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
    pub is_locked: i32,
    pub is_pinned: i32,
    pub pinned_order: f64,
    pub cover_image: Option<String>,
    pub description: Option<String>,
}

fn map_record_to_meta(r: PageRecord) -> PageMeta {
    PageMeta {
        id: r.id,
        parent_id: r.parent_id,
        title: r.title,
        icon: r.icon,
        sort_order: r.sort_order as f64,
        crdt_state: r.crdt_state,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at,
        is_locked: r.is_locked,
        is_pinned: r.is_pinned,
        pinned_order: r.pinned_order,
        cover_image: r.cover_image,
        description: r.description,
    }
}

#[derive(Serialize, Deserialize)]
pub struct PageContent {
    pub content: String,
    pub encrypted_content: Option<String>,
}

#[tauri::command]
pub fn notes_get_all_pages(db_state: State<'_, DbState>) -> Result<Vec<PageMeta>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let records = NotesRepository::get_pages_conn(conn, None)
        .map_err(|e| e.to_string())?;

    Ok(records.into_iter().map(map_record_to_meta).collect())
}

#[tauri::command]
pub fn notes_get_page_content(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<PageContent, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let page_opt = NotesRepository::get_page_conn(conn, &id)
        .map_err(|e| e.to_string())?;

    let mut content = match page_opt {
        Some(p) => PageContent {
            content: p.content,
            encrypted_content: p.encrypted_content,
        },
        None => return Err("Page not found".to_string()),
    };

    // Descriptografar on-the-fly
    if let Some(enc) = &content.encrypted_content {
        let keys_guard = db_state.keys.lock().unwrap();
        if let Some(keys) = keys_guard.as_ref() {
            if let Some(notes_key) = &keys.notes {
                if let Ok(decrypted) = crate::crypto::decrypt_content(notes_key, enc) {
                    content.content = decrypted;
                }
            }
        }
    }

    Ok(content)
}

#[derive(Deserialize, Default)]
#[serde(default)]
pub struct CreatePagePayload {
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    pub title: Option<String>,
    pub icon: Option<String>,
}

#[tauri::command]
pub fn notes_create_page(
    page: CreatePagePayload,
    db_state: State<'_, DbState>,
) -> Result<PageMeta, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let title = page.title.unwrap_or_else(|| "Nova Página".into());
    let icon = page.icon.unwrap_or_else(|| "📄".into());

    let record = pages::create_page(conn, page.parent_id.as_deref(), &title, Some(&icon))
        .map_err(|e| e.to_string())?;

    Ok(map_record_to_meta(record))
}

fn deserialize_optional_nullable<'de, D>(deserializer: D) -> Result<Option<Option<String>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(Some(Option::<String>::deserialize(deserializer)?))
}

#[derive(Deserialize, Default)]
#[serde(default)]
pub struct UpdatePagePayload {
    pub id: String,
    pub title: Option<String>,
    pub icon: Option<String>,
    pub content: Option<String>,
    pub encrypted_content: Option<String>,
    pub crdt_state: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_nullable")]
    pub parent_id: Option<Option<String>>,
    pub is_pinned: Option<i32>,
    pub pinned_order: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_nullable")]
    pub cover_image: Option<Option<String>>,
    pub description: Option<String>,
    pub is_locked: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_nullable")]
    pub password_salt: Option<Option<String>>,
}

#[derive(Deserialize)]
pub struct PageOrderUpdate {
    pub id: String,
    pub sort_order: f64,
}

#[tauri::command]
pub fn notes_update_page(
    page: UpdatePagePayload,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut query = String::from("UPDATE pages SET");
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
    let mut has_updates = false;

    if let Some(t) = page.title {
        query.push_str(" title = ?");
        params_vec.push(t.into());
        has_updates = true;
    }
    if let Some(i) = page.icon {
        if has_updates {
            query.push_str(",");
        }
        query.push_str(" icon = ?");
        params_vec.push(i.into());
        has_updates = true;
    }
    if let Some(c) = page.content {
        let mut encrypted = None;

        {
            let keys_guard = db_state.keys.lock().unwrap();
            if let Some(keys) = keys_guard.as_ref() {
                if let Some(notes_key) = &keys.notes {
                    if let Ok(enc) = crate::crypto::encrypt_content(notes_key, &c) {
                        encrypted = Some(enc);
                    }
                }
            }
        }

        if has_updates {
            query.push_str(",");
        }
        if let Some(enc) = encrypted {
            query.push_str(" content = '', encrypted_content = ?");
            params_vec.push(enc.clone().into());

            if should_record_page_history(conn, &page.id) {
                let hist_id = uuid::Uuid::new_v4().to_string();
                let now_utc = chrono::Utc::now().to_rfc3339();
                let _ = conn.execute(
                    "INSERT INTO page_history (id, page_id, content, encrypted_content, created_at) VALUES (?, ?, '', ?, ?)",
                    params![hist_id, page.id, enc, now_utc]
                );
            }
        } else {
            query.push_str(" content = ?, encrypted_content = NULL");
            params_vec.push(c.clone().into());

            if should_record_page_history(conn, &page.id) {
                let hist_id = uuid::Uuid::new_v4().to_string();
                let now_utc = chrono::Utc::now().to_rfc3339();
                let _ = conn.execute(
                    "INSERT INTO page_history (id, page_id, content, encrypted_content, created_at) VALUES (?, ?, ?, NULL, ?)",
                    params![hist_id, page.id, c, now_utc]
                );
            }
        }
        has_updates = true;
    }
    if let Some(crdt) = page.crdt_state {
        if has_updates {
            query.push_str(",");
        }
        query.push_str(" crdt_state = ?");
        params_vec.push(crdt.into());
        has_updates = true;
    }
    if let Some(pid_opt) = page.parent_id {
        if has_updates {
            query.push_str(",");
        }
        query.push_str(" parent_id = ?");
        match pid_opt {
            Some(s) if !s.trim().is_empty() => params_vec.push(s.into()),
            _ => params_vec.push(rusqlite::types::Value::Null),
        }
        has_updates = true;
    }
    if let Some(pinned) = page.is_pinned {
        if has_updates {
            query.push_str(",");
        }
        query.push_str(" is_pinned = ?");
        params_vec.push(pinned.into());
        has_updates = true;
    }
    if let Some(order) = page.pinned_order {
        if has_updates {
            query.push_str(",");
        }
        query.push_str(" pinned_order = ?");
        params_vec.push(order.into());
        has_updates = true;
    }
    if let Some(cover_opt) = page.cover_image {
        if has_updates {
            query.push_str(",");
        }
        query.push_str(" cover_image = ?");
        match cover_opt {
            Some(s) if !s.is_empty() => params_vec.push(s.into()),
            _ => params_vec.push(rusqlite::types::Value::Null),
        }
        has_updates = true;
    }
    if let Some(desc) = page.description {
        if has_updates {
            query.push_str(",");
        }
        query.push_str(" description = ?");
        params_vec.push(desc.into());
        has_updates = true;
    }
    if let Some(locked) = page.is_locked {
        if has_updates {
            query.push_str(",");
        }
        query.push_str(" is_locked = ?");
        params_vec.push(locked.into());
        has_updates = true;
    }
    if let Some(salt_opt) = page.password_salt {
        if has_updates {
            query.push_str(",");
        }
        query.push_str(" password_salt = ?");
        match salt_opt {
            Some(s) if !s.is_empty() => params_vec.push(s.into()),
            _ => params_vec.push(rusqlite::types::Value::Null),
        }
        has_updates = true;
    }
    if let Some(enc_explicit) = page.encrypted_content {
        if has_updates {
            query.push_str(",");
        }
        query.push_str(" encrypted_content = ?");
        if enc_explicit.is_empty() {
            params_vec.push(rusqlite::types::Value::Null);
        } else {
            params_vec.push(enc_explicit.into());
        }
        has_updates = true;
    }

    // Update updated_at timestamp only when actual content changes occur
    if has_updates {
        let now = chrono::Utc::now().to_rfc3339();
        query.push_str(", updated_at = ?");
        params_vec.push(now.into());
    } else {
        // No-op if content is unchanged
        return Ok(0);
    }

    query.push_str(" WHERE id = ?");
    params_vec.push(page.id.into());

    let count = conn
        .execute(&query, rusqlite::params_from_iter(params_vec))
        .map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn notes_delete_page(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    pages::soft_delete_page_subtree(conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn notes_delete_pages(ids: Vec<String>, db_state: State<'_, DbState>) -> Result<bool, String> {
    if ids.is_empty() {
        return Ok(true);
    }
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let now = chrono::Utc::now().to_rfc3339();
    let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let query_pages = format!(
        "UPDATE pages SET deleted_at = ?, updated_at = ? WHERE id IN ({})",
        placeholders
    );
    let mut params_pages: Vec<rusqlite::types::Value> = vec![now.clone().into(), now.clone().into()];
    for id in &ids {
        params_pages.push(id.clone().into());
    }
    conn.execute(&query_pages, rusqlite::params_from_iter(params_pages))
        .map_err(|e| e.to_string())?;

    // Soft-delete linked calendar events in single atomic query
    let query_events = format!(
        "UPDATE calendar_events SET deleted_at = ?, updated_at = ? WHERE page_id IN ({})",
        placeholders
    );
    let mut params_events: Vec<rusqlite::types::Value> = vec![now.clone().into(), now.into()];
    for id in &ids {
        params_events.push(id.clone().into());
    }
    let _ = conn.execute(&query_events, rusqlite::params_from_iter(params_events));

    Ok(true)
}

#[tauri::command]
pub fn notes_get_deleted_pages(db_state: State<'_, DbState>) -> Result<Vec<PageMeta>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, parent_id, title, icon, sort_order, crdt_state, created_at, updated_at, deleted_at, is_locked, is_pinned, pinned_order, cover_image, description FROM pages WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
        .map_err(|e| e.to_string())?;

    let page_iter = stmt
        .query_map([], |row| {
            Ok(PageMeta {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                title: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                crdt_state: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                deleted_at: row.get(8)?,
                is_locked: row.get(9)?,
                is_pinned: row.get(10).unwrap_or(0),
                pinned_order: row.get(11).unwrap_or(0.0),
                cover_image: row.get(12)?,
                description: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut pages = Vec::new();
    for page in page_iter {
        pages.push(page.map_err(|e| e.to_string())?);
    }

    Ok(pages)
}

#[tauri::command]
pub fn notes_restore_page(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    pages::restore_page(conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn notes_reorder_pages(
    updates: Vec<PageOrderUpdate>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    if updates.is_empty() {
        return Ok(true);
    }
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let now = chrono::Utc::now().to_rfc3339();

    for u in updates {
        conn.execute(
            "UPDATE pages SET sort_order = ?1, updated_at = ?2 WHERE id = ?3",
            params![u.sort_order, now, u.id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(true)
}
