use crate::db::{run_blocking, DbState};
use rusqlite::params;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct PageHistoryEntry {
    pub id: String,
    pub page_id: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct ImageCacheResult {
    pub data: Vec<u8>,
    #[serde(rename = "mimeType")]
    pub mime_type: String,
}

#[tauri::command]
pub async fn notes_get_page_history(
    page_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<PageHistoryEntry>, String> {
    let notes_key = db_state.clone_keys()?.and_then(|k| k.notes);
    let state = db_state.inner().clone();

    run_blocking(move || {
        let raw_rows = {
            let reader = state.acquire_reader()?;
            let mut stmt = reader
                .prepare("SELECT id, page_id, content, created_at, encrypted_content FROM page_history WHERE page_id = ? ORDER BY created_at DESC")
                .map_err(|e| e.to_string())?;

            let history_iter = stmt
                .query_map([&page_id], |row| {
                    let id: String = row.get(0)?;
                    let pid: String = row.get(1)?;
                    let content: String = row.get(2)?;
                    let created_at: String = row.get(3)?;
                    let encrypted_content: Option<String> = row.get(4).unwrap_or(None);
                    Ok((id, pid, content, created_at, encrypted_content))
                })
                .map_err(|e| e.to_string())?;

            history_iter.flatten().collect::<Vec<_>>()
        };

        let mut history = Vec::with_capacity(raw_rows.len());
        for (id, pid, mut cont, created, enc_opt) in raw_rows {
            if let (Some(enc), Some(key)) = (enc_opt, &notes_key) {
                if let Ok(decrypted) = crate::crypto::decrypt_content(key, &enc) {
                    cont = decrypted;
                }
            }
            history.push(PageHistoryEntry {
                id,
                page_id: pid,
                content: cont,
                created_at: created,
            });
        }

        Ok(history)
    })
    .await
}

#[tauri::command]
pub async fn image_cache_get(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<ImageCacheResult>, String> {
    db_state
        .read(move |conn| {
            let mut stmt = conn
                .prepare("SELECT data, mimeType FROM image_cache WHERE id = ?")
                .map_err(|e| e.to_string())?;

            let result = stmt.query_row([&id], |row| {
                Ok(ImageCacheResult {
                    data: row.get(0)?,
                    mime_type: row
                        .get::<_, Option<String>>(1)?
                        .unwrap_or_else(|| "image/png".into()),
                })
            });

            match result {
                Ok(res) => Ok(Some(res)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(e.to_string()),
            }
        })
        .await
}

#[tauri::command]
pub async fn image_cache_put(
    id: String,
    data: Vec<u8>,
    mime_type: String,
    db_state: State<'_, DbState>,
) -> Result<(), String> {
    db_state
        .write(move |conn| {
            conn.execute(
                "INSERT OR REPLACE INTO image_cache (id, data, mimeType) VALUES (?, ?, ?)",
                params![id, data, mime_type],
            )
            .map_err(|e| e.to_string())?;

            Ok(())
        })
        .await
}

#[tauri::command]
pub async fn image_cache_delete(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            conn.execute("DELETE FROM image_cache WHERE id = ?", [&id])
                .map_err(|e| e.to_string())?;
            Ok(true)
        })
        .await
}

#[tauri::command]
pub async fn notes_cleanup_orphaned_images(db_state: State<'_, DbState>) -> Result<usize, String> {
    let notes_key = db_state.clone_keys()?.and_then(|k| k.notes);
    let state = db_state.inner().clone();

    run_blocking(move || {
        // Scan all references using a WAL reader connection so writes are never blocked during GC.
        let unreferenced_ids = {
            let reader = state.acquire_reader()?;

            let has_encrypted: bool = reader
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM pages WHERE encrypted_content IS NOT NULL AND encrypted_content != '')
                         OR EXISTS(SELECT 1 FROM page_history WHERE encrypted_content IS NOT NULL AND encrypted_content != '')",
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(true);

            // Never purge image_cache if encrypted pages exist and the notes key is locked.
            if has_encrypted && notes_key.is_none() {
                return Ok(0);
            }

            let mut stmt_imgs = reader
                .prepare("SELECT id FROM image_cache")
                .map_err(|e| e.to_string())?;
            let mut unreferenced: std::collections::HashSet<String> = stmt_imgs
                .query_map([], |row| row.get(0))
                .map_err(|e| e.to_string())?
                .flatten()
                .collect();

            if unreferenced.is_empty() {
                return Ok(0);
            }

            fn prune_referenced(unreferenced: &mut std::collections::HashSet<String>, text: &str) {
                if !text.is_empty() && !unreferenced.is_empty() {
                    unreferenced.retain(|img_id| !text.contains(img_id.as_str()));
                }
            }

            let mut stmt_pages = reader
                .prepare("SELECT content, encrypted_content FROM pages")
                .map_err(|e| e.to_string())?;
            let page_rows = stmt_pages
                .query_map([], |row| {
                    Ok((
                        row.get::<_, Option<String>>(0).unwrap_or(None),
                        row.get::<_, Option<String>>(1).unwrap_or(None),
                    ))
                })
                .map_err(|e| e.to_string())?;

            for r in page_rows.flatten() {
                if let Some(c) = r.0 {
                    prune_referenced(&mut unreferenced, &c);
                }
                if let (Some(enc), Some(key)) = (r.1, &notes_key) {
                    if !enc.is_empty() {
                        if let Ok(dec) = crate::crypto::decrypt_content(key, &enc) {
                            prune_referenced(&mut unreferenced, &dec);
                        } else {
                            // Abort cleanup if any encrypted page fails decryption to guarantee zero data loss.
                            return Ok(0);
                        }
                    }
                }
                if unreferenced.is_empty() {
                    return Ok(0);
                }
            }

            let mut stmt_hist = reader
                .prepare("SELECT content, encrypted_content FROM page_history")
                .map_err(|e| e.to_string())?;
            let hist_rows = stmt_hist
                .query_map([], |row| {
                    Ok((
                        row.get::<_, Option<String>>(0).unwrap_or(None),
                        row.get::<_, Option<String>>(1).unwrap_or(None),
                    ))
                })
                .map_err(|e| e.to_string())?;

            for r in hist_rows.flatten() {
                if let Some(c) = r.0 {
                    prune_referenced(&mut unreferenced, &c);
                }
                if let (Some(enc), Some(key)) = (r.1, &notes_key) {
                    if !enc.is_empty() {
                        if let Ok(dec) = crate::crypto::decrypt_content(key, &enc) {
                            prune_referenced(&mut unreferenced, &dec);
                        }
                    }
                }
                if unreferenced.is_empty() {
                    return Ok(0);
                }
            }

            unreferenced
        };

        if unreferenced_ids.is_empty() {
            return Ok(0);
        }

        let mut guard = state.lock_conn()?;
        let conn = guard.as_mut().ok_or("Banco não inicializado")?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let mut deleted_count = 0;
        for img_id in unreferenced_ids {
            deleted_count += tx
                .execute("DELETE FROM image_cache WHERE id = ?1", [&img_id])
                .map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())?;

        Ok(deleted_count)
    })
    .await
}
