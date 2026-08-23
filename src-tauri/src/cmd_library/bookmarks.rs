use rusqlite::params;
use tauri::State;
use crate::cmd_library::types::Bookmark;
use crate::db::DbState;

/// Retrieves all active bookmarks for a specific book.
#[tauri::command]
pub fn library_get_bookmarks(
    book_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<Bookmark>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, book_id, page_number, label, created_at, updated_at, deleted_at FROM library_bookmarks WHERE book_id = ? AND deleted_at IS NULL",
        )
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([&book_id], |row| {
            Ok(Bookmark {
                id: row.get(0)?,
                book_id: row.get(1)?,
                page_number: row.get(2)?,
                label: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                deleted_at: row.get(6)?,
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

/// Creates a new bookmark at a specific page.
#[tauri::command]
pub fn library_create_bookmark(
    bookmark: Bookmark,
    db_state: State<'_, DbState>,
) -> Result<Bookmark, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let id = bookmark
        .id
        .clone()
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    conn.execute(
        "INSERT INTO library_bookmarks (id, book_id, page_number, label) VALUES (?, ?, ?, ?)",
        params![id, bookmark.book_id, bookmark.page_number, bookmark.label],
    )
    .map_err(|e| e.to_string())?;

    let mut ret = bookmark;
    ret.id = Some(id);
    Ok(ret)
}

/// Updates the label of an existing bookmark.
#[tauri::command]
pub fn library_update_bookmark(
    bookmark: Bookmark,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let count = conn
        .execute(
            "UPDATE library_bookmarks SET label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            params![bookmark.label, bookmark.id],
        )
        .map_err(|e| e.to_string())?;

    Ok(count as i32)
}

/// Soft-deletes a bookmark by ID.
#[tauri::command]
pub fn library_delete_bookmark(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    conn.execute(
        "UPDATE library_bookmarks SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [&id],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}
