use crate::db::{run_blocking, DbState};
use serde::Deserialize;
use synapse_core::domain::diagrams::{DiagramMeta, DiagramRecord, DiagramsRepository};
use tauri::State;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct DiagramContent {
    pub content: String,
    pub encrypted_content: Option<String>,
}

#[tauri::command]
pub async fn diagrams_get_all(db_state: State<'_, DbState>) -> Result<Vec<DiagramMeta>, String> {
    db_state
        .read(|conn| DiagramsRepository::get_diagrams_conn(conn).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn diagrams_get_content(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<DiagramContent, String> {
    let notes_key = db_state
        .clone_keys()?
        .and_then(|keys| keys.notes);
    let state = db_state.inner().clone();

    run_blocking(move || {
        let record = {
            let reader = state.acquire_reader()?;
            DiagramsRepository::get_diagram_conn(&reader, &id)
                .map_err(|e| e.to_string())?
                .ok_or_else(|| "Diagram not found".to_string())?
        };

        let mut content = DiagramContent {
            content: record.content,
            encrypted_content: record.encrypted_content,
        };

        // Decrypt after releasing reader connection
        if let (Some(enc), Some(key)) = (&content.encrypted_content, &notes_key) {
            if let Ok(decrypted) = crate::crypto::decrypt_content(key, enc) {
                content.content = decrypted;
            }
        }

        Ok(content)
    })
    .await
}

#[derive(Deserialize)]
pub struct CreateDiagramPayload {
    pub title: Option<String>,
    pub icon: Option<String>,
}

#[tauri::command]
pub async fn diagrams_create(
    payload: CreateDiagramPayload,
    db_state: State<'_, DbState>,
) -> Result<DiagramMeta, String> {
    db_state
        .write(move |conn| {
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
        })
        .await
}

#[derive(Deserialize)]
pub struct UpdateDiagramPayload {
    pub id: String,
    pub title: Option<String>,
    pub icon: Option<String>,
    pub content: Option<String>,
}

#[tauri::command]
pub async fn diagrams_update(
    payload: UpdateDiagramPayload,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let notes_key = if payload.content.is_some() {
        db_state.clone_keys()?.and_then(|keys| keys.notes)
    } else {
        None
    };
    let state = db_state.inner().clone();

    run_blocking(move || {
        // Encrypt content before acquiring SQLite writer mutex
        let pre_encrypted = match (&payload.content, &notes_key) {
            (Some(c), Some(key)) => crate::crypto::encrypt_content(key, c).ok(),
            _ => None,
        };

        let guard = state.lock_conn()?;
        let conn = guard.as_ref().ok_or("Banco não inicializado")?;

        let existing = DiagramsRepository::get_diagram_conn(conn, &payload.id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Diagram not found".to_string())?;

        let title = payload.title.unwrap_or(existing.title);
        let icon = payload.icon.unwrap_or(existing.icon);

        let (content, encrypted_content) = if let Some(c) = payload.content {
            if let Some(enc) = pre_encrypted {
                (String::new(), Some(enc))
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
    })
    .await
}

#[tauri::command]
pub async fn diagrams_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    db_state
        .write(move |conn| DiagramsRepository::delete_diagram_conn(conn, &id).map_err(|e| e.to_string()))
        .await
}
