use tauri::State;
use serde::{Deserialize, Serialize};
use crate::db::DbState;
use rusqlite::params;

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
        
    let page_iter = stmt.query_map([], |row| {
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
    }).map_err(|e| e.to_string())?;
    
    let mut pages = Vec::new();
    for page in page_iter {
        if let Ok(p) = page {
            pages.push(p);
        }
    }
    
    Ok(pages)
}

#[tauri::command]
pub fn notes_get_page_content(id: String, db_state: State<'_, DbState>) -> Result<PageContent, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT content, encrypted_content FROM pages WHERE id = ?")
        .map_err(|e| e.to_string())?;
        
    let mut content = stmt.query_row([&id], |row| {
        Ok(PageContent {
            content: row.get::<_, Option<String>>(0)?.unwrap_or_default(),
            encrypted_content: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;
    
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

#[derive(Deserialize)]
pub struct CreatePagePayload {
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    pub title: Option<String>,
    pub icon: Option<String>,
}

#[tauri::command]
pub fn notes_create_page(page: CreatePagePayload, db_state: State<'_, DbState>) -> Result<PageMeta, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let id = uuid::Uuid::new_v4().to_string();
    let title = page.title.unwrap_or_else(|| "Nova Página".into());
    let icon = page.icon.unwrap_or_else(|| "📄".into());
    
    conn.execute(
        "INSERT INTO pages (id, parent_id, title, icon, sort_order) VALUES (?, ?, ?, ?, ?)",
        params![id, page.parent_id, title, icon, 0.0]
    ).map_err(|e| e.to_string())?;
    
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

#[derive(Deserialize)]
pub struct UpdatePagePayload {
    pub id: String,
    pub title: Option<String>,
    pub icon: Option<String>,
    pub content: Option<String>,
    #[serde(rename = "crdtState")]
    pub crdt_state: Option<String>,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
}

#[tauri::command]
pub fn notes_update_page(page: UpdatePagePayload, db_state: State<'_, DbState>) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut query = String::from("UPDATE pages SET updated_at = CURRENT_TIMESTAMP");
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
    
    if let Some(t) = page.title {
        query.push_str(", title = ?");
        params_vec.push(t.into());
    }
    if let Some(i) = page.icon {
        query.push_str(", icon = ?");
        params_vec.push(i.into());
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
        
        if let Some(enc) = encrypted {
            query.push_str(", content = '', encrypted_content = ?");
            params_vec.push(enc.into());
        } else {
            query.push_str(", content = ?, encrypted_content = NULL");
            params_vec.push(c.into());
        }
    }
    if let Some(crdt) = page.crdt_state {
        query.push_str(", crdt_state = ?");
        params_vec.push(crdt.into());
    }
    if let Some(pid) = page.parent_id {
        query.push_str(", parent_id = ?");
        params_vec.push(pid.into());
    }
    
    query.push_str(" WHERE id = ?");
    params_vec.push(page.id.into());
    
    let count = conn.execute(&query, rusqlite::params_from_iter(params_vec))
        .map_err(|e| e.to_string())?;
        
    Ok(count as i32)
}

#[tauri::command]
pub fn notes_delete_page(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute("UPDATE pages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
        
    Ok(true)
}

#[derive(Serialize)]
pub struct ImageCacheResult {
    pub data: Vec<u8>,
    #[serde(rename = "mimeType")]
    pub mime_type: String,
}

#[tauri::command]
pub fn image_cache_get(id: String, db_state: State<'_, DbState>) -> Result<Option<ImageCacheResult>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT data, mimeType FROM image_cache WHERE id = ?")
        .map_err(|e| e.to_string())?;
        
    let result = stmt.query_row([&id], |row| {
        Ok(ImageCacheResult {
            data: row.get(0)?,
            mime_type: row.get::<_, Option<String>>(1)?.unwrap_or_else(|| "image/png".into()),
        })
    });
    
    match result {
        Ok(res) => Ok(Some(res)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub fn image_cache_put(id: String, data: Vec<u8>, mime_type: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute(
        "INSERT OR REPLACE INTO image_cache (id, data, mimeType) VALUES (?, ?, ?)",
        params![id, data, mime_type]
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}
