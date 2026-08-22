use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize)]
pub struct DiagramMeta {
    pub id: String,
    pub title: String,
    pub icon: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct DiagramContent {
    pub content: String,
    pub encrypted_content: Option<String>,
}

#[tauri::command]
pub fn diagrams_get_all(db_state: State<'_, DbState>) -> Result<Vec<DiagramMeta>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, title, icon, created_at, updated_at, deleted_at FROM diagrams WHERE deleted_at IS NULL ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let diagram_iter = stmt
        .query_map([], |row| {
            Ok(DiagramMeta {
                id: row.get(0)?,
                title: row.get(1)?,
                icon: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                deleted_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut diagrams = Vec::new();
    for d in diagram_iter {
        if let Ok(d_ok) = d {
            diagrams.push(d_ok);
        }
    }

    Ok(diagrams)
}

#[tauri::command]
pub fn diagrams_get_content(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<DiagramContent, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn
        .prepare("SELECT content, encrypted_content FROM diagrams WHERE id = ?")
        .map_err(|e| e.to_string())?;

    let mut content = stmt
        .query_row([&id], |row| {
            Ok(DiagramContent {
                content: row.get::<_, Option<String>>(0)?.unwrap_or_default(),
                encrypted_content: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    // On-the-fly decryption (defaults to notes module key)
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
pub struct CreateDiagramPayload {
    pub title: Option<String>,
    pub icon: Option<String>,
}

#[tauri::command]
pub fn diagrams_create(
    payload: CreateDiagramPayload,
    db_state: State<'_, DbState>,
) -> Result<DiagramMeta, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = uuid::Uuid::new_v4().to_string();
    let title = payload.title.unwrap_or_else(|| "Novo Diagrama".into());
    let icon = payload.icon.unwrap_or_else(|| "🎨".into());
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO diagrams (id, title, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        params![id, title, icon, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(DiagramMeta {
        id,
        title,
        icon,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    })
}

#[derive(Deserialize)]
pub struct UpdateDiagramPayload {
    pub id: String,
    pub title: Option<String>,
    pub icon: Option<String>,
    pub content: Option<String>,
}

#[tauri::command]
pub fn diagrams_update(
    payload: UpdateDiagramPayload,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut query = String::from("UPDATE diagrams SET");
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
    let mut has_updates = false;

    if let Some(t) = payload.title {
        query.push_str(" title = ?");
        params_vec.push(t.into());
        has_updates = true;
    }
    if let Some(i) = payload.icon {
        if has_updates {
            query.push_str(",");
        }
        query.push_str(" icon = ?");
        params_vec.push(i.into());
        has_updates = true;
    }
    if let Some(c) = payload.content {
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
            params_vec.push(enc.into());
        } else {
            query.push_str(" content = ?, encrypted_content = NULL");
            params_vec.push(c.into());
        }
        has_updates = true;
    }

    if has_updates {
        query.push_str(", updated_at = CURRENT_TIMESTAMP");
    } else {
        return Ok(0);
    }

    query.push_str(" WHERE id = ?");
    params_vec.push(payload.id.into());

    let count = conn
        .execute(&query, rusqlite::params_from_iter(params_vec))
        .map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn diagrams_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("UPDATE diagrams SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}
