use rusqlite::params;
use tauri::State;
use crate::cmd_library::types::Collection;
use crate::db::DbState;

/// Retrieves all active library collections.
#[tauri::command]
pub fn library_get_collections(db_state: State<'_, DbState>) -> Result<Vec<Collection>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare("SELECT id, name, color FROM library_collections WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
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

/// Adds a new collection and returns the persisted entity.
#[tauri::command]
pub fn library_add_collection(
    collection: Collection,
    db_state: State<'_, DbState>,
) -> Result<Collection, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let id = if collection.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        collection.id.clone()
    };

    conn.execute(
        "INSERT INTO library_collections (id, name, color) VALUES (?, ?, ?)",
        params![id, collection.name, collection.color],
    )
    .map_err(|e| e.to_string())?;

    let mut ret = collection;
    ret.id = id;
    Ok(ret)
}

/// Creates a new collection (alternate endpoint).
#[tauri::command]
pub fn library_create_collection(
    collection: Collection,
    db_state: State<'_, DbState>,
) -> Result<Collection, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let id = if collection.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        collection.id.clone()
    };

    conn.execute(
        "INSERT INTO library_collections (id, name, color) VALUES (?, ?, ?)",
        params![id, collection.name, collection.color],
    )
    .map_err(|e| e.to_string())?;

    Ok(Collection {
        id,
        name: collection.name,
        color: collection.color,
    })
}

/// Updates an existing collection name and color.
#[tauri::command]
pub fn library_update_collection(
    collection: Collection,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let count = conn
        .execute(
            "UPDATE library_collections SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            params![collection.name, collection.color, collection.id],
        )
        .map_err(|e| e.to_string())?;

    Ok(count as i32)
}

/// Soft-deletes a collection by ID.
#[tauri::command]
pub fn library_delete_collection(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    conn.execute(
        "UPDATE library_collections SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [&id],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}

/// Adds a book into a collection association.
#[tauri::command]
pub fn library_add_book_to_collection(
    book_id: String,
    collection_id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT OR REPLACE INTO library_book_collections (id, book_id, collection_id) VALUES (?, ?, ?)",
        params![id, book_id, collection_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}

/// Removes a book from a collection association (soft delete).
#[tauri::command]
pub fn library_remove_book_from_collection(
    book_id: String,
    collection_id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    conn.execute(
        "UPDATE library_book_collections SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE book_id = ? AND collection_id = ?",
        params![book_id, collection_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}

/// Retrieves all collections associated with a given book ID.
#[tauri::command]
pub fn library_get_book_collections(
    book_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<Collection>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.name, c.color FROM library_collections c INNER JOIN library_book_collections bc ON c.id = bc.collection_id WHERE bc.book_id = ? AND bc.deleted_at IS NULL AND c.deleted_at IS NULL",
        )
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([&book_id], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
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

/// Replaces all collection associations for a given book ID.
#[tauri::command]
pub fn library_set_book_collections(
    book_id: String,
    collection_ids: Vec<String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    // Soft-delete existing associations
    conn.execute(
        "UPDATE library_book_collections SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE book_id = ? AND deleted_at IS NULL",
        [&book_id],
    )
    .map_err(|e| e.to_string())?;

    // Insert new associations
    for col_id in &collection_ids {
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT OR REPLACE INTO library_book_collections (id, book_id, collection_id, deleted_at) VALUES (?, ?, ?, NULL)",
            params![id, book_id, col_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(true)
}
