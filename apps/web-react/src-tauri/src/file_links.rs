use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
pub struct FilePageLink {
    pub id: String,
    pub file_id: String,
    pub page_id: String,
    pub link_type: String,
    pub widget_id: Option<String>,
    pub created_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[tauri::command]
pub async fn file_links_get_by_page(
    page_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<FilePageLink>, String> {
    db_state
        .read(move |conn| {
            let mut stmt = conn
                .prepare("SELECT id, file_id, page_id, link_type, widget_id, created_at, deleted_at FROM file_page_links WHERE page_id = ? AND deleted_at IS NULL")
                .map_err(|e| e.to_string())?;

            let iter = stmt
                .query_map([page_id], |row| {
                    Ok(FilePageLink {
                        id: row.get(0)?,
                        file_id: row.get(1)?,
                        page_id: row.get(2)?,
                        link_type: row.get(3)?,
                        widget_id: row.get(4)?,
                        created_at: row.get(5)?,
                        deleted_at: row.get(6)?,
                    })
                })
                .map_err(|e| e.to_string())?;

            let mut items = Vec::new();
            for item in iter.flatten() {
                items.push(item);
            }
            Ok(items)
        })
        .await
}

#[tauri::command]
pub async fn file_links_get_by_file(
    file_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<FilePageLink>, String> {
    db_state
        .read(move |conn| {
            let mut stmt = conn
                .prepare("SELECT id, file_id, page_id, link_type, widget_id, created_at, deleted_at FROM file_page_links WHERE file_id = ? AND deleted_at IS NULL")
                .map_err(|e| e.to_string())?;

            let iter = stmt
                .query_map([file_id], |row| {
                    Ok(FilePageLink {
                        id: row.get(0)?,
                        file_id: row.get(1)?,
                        page_id: row.get(2)?,
                        link_type: row.get(3)?,
                        widget_id: row.get(4)?,
                        created_at: row.get(5)?,
                        deleted_at: row.get(6)?,
                    })
                })
                .map_err(|e| e.to_string())?;

            let mut items = Vec::new();
            for item in iter.flatten() {
                items.push(item);
            }
            Ok(items)
        })
        .await
}

#[tauri::command]
pub async fn file_links_create(
    mut link: FilePageLink,
    db_state: State<'_, DbState>,
) -> Result<FilePageLink, String> {
    db_state
        .write(move |conn| {
            if link.id.is_empty() {
                link.id = Uuid::new_v4().to_string();
            }

            conn.execute(
                "INSERT INTO file_page_links (id, file_id, page_id, link_type, widget_id) VALUES (?, ?, ?, ?, ?)",
                params![link.id, link.file_id, link.page_id, link.link_type, link.widget_id],
            )
            .map_err(|e| e.to_string())?;

            Ok(link)
        })
        .await
}

#[tauri::command]
pub async fn file_links_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            let now = chrono::Utc::now().to_rfc3339();

            conn.execute(
                "UPDATE file_page_links SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2",
                [&now, &id],
            )
            .map_err(|e| e.to_string())?;

            Ok(true)
        })
        .await
}
