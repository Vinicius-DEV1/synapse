use crate::db::DbState;
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
pub fn notes_get_page_history(
    page_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<PageHistoryEntry>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn
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

    let mut history = Vec::new();
    let keys_guard = db_state.keys.lock().unwrap();
    let notes_key = keys_guard.as_ref().and_then(|k| k.notes.clone());

    for row_res in history_iter {
        if let Ok((id, pid, mut cont, created, enc_opt)) = row_res {
            if let Some(enc) = enc_opt {
                if let Some(key) = &notes_key {
                    if let Ok(decrypted) = crate::crypto::decrypt_content(key, &enc) {
                        cont = decrypted;
                    }
                }
            }
            history.push(PageHistoryEntry {
                id,
                page_id: pid,
                content: cont,
                created_at: created,
            });
        }
    }

    Ok(history)
}

#[tauri::command]
pub fn image_cache_get(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<ImageCacheResult>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

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
}

#[tauri::command]
pub fn image_cache_put(
    id: String,
    data: Vec<u8>,
    mime_type: String,
    db_state: State<'_, DbState>,
) -> Result<(), String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute(
        "INSERT OR REPLACE INTO image_cache (id, data, mimeType) VALUES (?, ?, ?)",
        params![id, data, mime_type],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
