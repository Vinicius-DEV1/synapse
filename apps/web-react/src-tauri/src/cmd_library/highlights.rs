use rusqlite::params;
use tauri::State;
use crate::cmd_library::types::Highlight;
use crate::db::DbState;

/// Retrieves all active highlights for a specific book.
#[tauri::command]
pub fn library_get_highlights(
    book_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<Highlight>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, book_id, page_number, text_content, color, rects, highlight_type, note, created_at, updated_at, deleted_at FROM library_highlights WHERE book_id = ? AND deleted_at IS NULL",
        )
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([&book_id], |row| {
            Ok(Highlight {
                id: row.get(0)?,
                book_id: row.get(1)?,
                page_number: row.get(2)?,
                text_content: row.get(3)?,
                color: row.get(4)?,
                rects: row.get(5)?,
                highlight_type: row.get(6)?,
                note: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                deleted_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }
    Ok(items)
}

/// Creates a new text or area highlight for a book.
#[tauri::command]
pub fn library_create_highlight(
    highlight: Highlight,
    db_state: State<'_, DbState>,
) -> Result<Highlight, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let id = highlight
        .id
        .clone()
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    conn.execute(
        "INSERT INTO library_highlights (id, book_id, page_number, text_content, color, rects, highlight_type, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            id,
            highlight.book_id,
            highlight.page_number,
            highlight.text_content,
            highlight.color.as_deref().unwrap_or("yellow"),
            highlight.rects,
            highlight.highlight_type.as_deref().unwrap_or("text"),
            highlight.note
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut ret = highlight;
    ret.id = Some(id);
    Ok(ret)
}

/// Updates an existing highlight content, color, or notes.
#[tauri::command]
pub fn library_update_highlight(
    highlight: Highlight,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let count = conn
        .execute(
            "UPDATE library_highlights SET text_content = ?, color = ?, rects = ?, highlight_type = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            params![
                highlight.text_content,
                highlight.color,
                highlight.rects,
                highlight.highlight_type,
                highlight.note,
                highlight.id
            ],
        )
        .map_err(|e| e.to_string())?;

    Ok(count as i32)
}

/// Soft-deletes a highlight by ID.
#[tauri::command]
pub fn library_delete_highlight(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    conn.execute(
        "UPDATE library_highlights SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [&id],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}
