use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

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

    let mut stmt = conn.prepare("SELECT id, parent_id, title, icon, sort_order, crdt_state, created_at, updated_at, deleted_at, is_locked, is_pinned, pinned_order FROM pages WHERE deleted_at IS NULL")
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
                is_pinned: row.get(10)?,
                pinned_order: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut pages = Vec::new();
    for page in page_iter {
        if let Ok(p) = page {
            pages.push(p);
        }
    }

    Ok(pages)
}

#[tauri::command]
pub fn notes_get_page_content(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<PageContent, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn
        .prepare("SELECT content, encrypted_content FROM pages WHERE id = ?")
        .map_err(|e| e.to_string())?;

    let mut content = stmt
        .query_row([&id], |row| {
            Ok(PageContent {
                content: row.get::<_, Option<String>>(0)?.unwrap_or_default(),
                encrypted_content: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

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

    let id = uuid::Uuid::new_v4().to_string();
    let title = page.title.unwrap_or_else(|| "Nova Página".into());
    let icon = page.icon.unwrap_or_else(|| "📄".into());

    conn.execute(
        "INSERT INTO pages (id, parent_id, title, icon, sort_order) VALUES (?, ?, ?, ?, ?)",
        params![id, page.parent_id, title, icon, 0.0],
    )
    .map_err(|e| e.to_string())?;

    Ok(PageMeta {
        id,
        parent_id: page.parent_id,
        title,
        icon,
        sort_order: 0.0,
        crdt_state: None,
        created_at: Some(chrono::Utc::now().to_rfc3339()),
        updated_at: Some(chrono::Utc::now().to_rfc3339()),
        deleted_at: None,
        is_locked: 0,
        is_pinned: 0,
        pinned_order: 0.0,
    })
}

#[derive(Deserialize, Default)]
#[serde(default)]
pub struct UpdatePagePayload {
    pub id: String,
    pub title: Option<String>,
    pub icon: Option<String>,
    pub content: Option<String>,
    pub crdt_state: Option<String>,
    pub parent_id: Option<serde_json::Value>,
    pub is_pinned: Option<i32>,
    pub pinned_order: Option<f64>,
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

            // Record history entry only if > 60s elapsed since last revision (prevents SQLite database bloating on 2s autosave)
            let should_insert_history: bool = conn
                .query_row(
                    "SELECT (strftime('%s', 'now') - strftime('%s', MAX(created_at))) > 60 FROM page_history WHERE page_id = ?",
                    params![page.id],
                    |row| row.get::<_, Option<bool>>(0)
                )
                .unwrap_or(None)
                .unwrap_or(true);

            if should_insert_history {
                let hist_id = uuid::Uuid::new_v4().to_string();
                let _ = conn.execute(
                    "INSERT INTO page_history (id, page_id, content, encrypted_content) VALUES (?, ?, '', ?)",
                    params![hist_id, page.id, enc]
                );
            }
        } else {
            query.push_str(" content = ?, encrypted_content = NULL");
            params_vec.push(c.clone().into());

            let should_insert_history: bool = conn
                .query_row(
                    "SELECT (strftime('%s', 'now') - strftime('%s', MAX(created_at))) > 60 FROM page_history WHERE page_id = ?",
                    params![page.id],
                    |row| row.get::<_, Option<bool>>(0)
                )
                .unwrap_or(None)
                .unwrap_or(true);

            if should_insert_history {
                let hist_id = uuid::Uuid::new_v4().to_string();
                let _ = conn.execute(
                    "INSERT INTO page_history (id, page_id, content, encrypted_content) VALUES (?, ?, ?, NULL)",
                    params![hist_id, page.id, c]
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
    if let Some(pid_val) = page.parent_id {
        if has_updates {
            query.push_str(",");
        }
        query.push_str(" parent_id = ?");
        if pid_val.is_null() {
            params_vec.push(rusqlite::types::Value::Null);
        } else if let Some(s) = pid_val.as_str() {
            if s.is_empty() {
                params_vec.push(rusqlite::types::Value::Null);
            } else {
                params_vec.push(s.to_string().into());
            }
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

    // Update updated_at timestamp only when actual content changes occur
    if has_updates {
        query.push_str(", updated_at = CURRENT_TIMESTAMP");
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

    conn.execute("UPDATE pages SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub fn notes_get_deleted_pages(db_state: State<'_, DbState>) -> Result<Vec<PageMeta>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, parent_id, title, icon, sort_order, crdt_state, created_at, updated_at, deleted_at, is_locked, is_pinned, pinned_order FROM pages WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
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
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute(
        "UPDATE pages SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [&id],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}
