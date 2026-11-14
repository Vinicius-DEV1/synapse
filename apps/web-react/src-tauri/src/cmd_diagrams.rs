use crate::db::DbState;
use serde::Deserialize;
use synapse_core::domain::diagrams::{DiagramMeta, DiagramRecord, DiagramsRepository};
use tauri::State;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct DiagramContent {
    pub content: String,
    pub encrypted_content: Option<String>,
}

#[tauri::command]
pub fn diagrams_get_all(db_state: State<'_, DbState>) -> Result<Vec<DiagramMeta>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    DiagramsRepository::get_diagrams_conn(conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn diagrams_get_content(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<DiagramContent, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let record = DiagramsRepository::get_diagram_conn(conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Diagram not found".to_string())?;

    let mut content = DiagramContent {
        content: record.content,
        encrypted_content: record.encrypted_content,
    };

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

    let record = DiagramRecord {
        id: id.clone(),
        title: title.clone(),
        icon: icon.clone(),
        content: "[]".to_string(),
        encrypted_content: None,
        created_at: Some(now.clone()),
        updated_at: Some(now.clone()),
        deleted_at: None,
    };

    DiagramsRepository::create_diagram_conn(conn, &record).map_err(|e| e.to_string())?;

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

    let existing = DiagramsRepository::get_diagram_conn(conn, &payload.id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Diagram not found".to_string())?;

    let title = payload.title.unwrap_or(existing.title);
    let icon = payload.icon.unwrap_or(existing.icon);

    let (content, encrypted_content) = if let Some(c) = payload.content {
        let mut enc = None;
        let keys_guard = db_state.keys.lock().unwrap();
        if let Some(keys) = keys_guard.as_ref() {
            if let Some(notes_key) = &keys.notes {
                if let Ok(encrypted) = crate::crypto::encrypt_content(notes_key, &c) {
                    enc = Some(encrypted);
                }
            }
        }
        if enc.is_some() {
            (String::new(), enc)
        } else {
            (c, None)
        }
    } else {
        (existing.content, existing.encrypted_content)
    };

    let ok = DiagramsRepository::save_diagram_conn(
        conn,
        &payload.id,
        &title,
        &content,
        encrypted_content.as_deref(),
        &icon,
    )
    .map_err(|e| e.to_string())?;

    Ok(if ok { 1 } else { 0 })
}

#[tauri::command]
pub fn diagrams_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    DiagramsRepository::delete_diagram_conn(conn, &id).map_err(|e| e.to_string())
}
