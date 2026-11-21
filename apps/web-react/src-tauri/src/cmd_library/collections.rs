use tauri::State;
use crate::cmd_library::types::Collection;
use crate::db::DbState;
use synapse_core::domain::library::collections as core_cols;

/// Retrieves all active library collections.
#[tauri::command]
pub fn library_get_collections(db_state: State<'_, DbState>) -> Result<Vec<Collection>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let items = core_cols::get_collections(conn)
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|c| Collection {
            id: c.id,
            name: c.name,
            color: Some(c.color),
        })
        .collect();
    Ok(items)
}

/// Adds a new collection and returns the persisted entity.
#[tauri::command]
pub fn library_add_collection(
    collection: Collection,
    db_state: State<'_, DbState>,
) -> Result<Collection, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let color = collection.color.as_deref().unwrap_or("#3b82f6");
    let created = core_cols::create_collection(conn, &collection.name, color)
        .map_err(|e| e.to_string())?
        .ok_or("Invalid collection name or color")?;

    Ok(Collection {
        id: created.id,
        name: created.name,
        color: Some(created.color),
    })
}

/// Creates a new collection (alternate endpoint).
#[tauri::command]
pub fn library_create_collection(
    collection: Collection,
    db_state: State<'_, DbState>,
) -> Result<Collection, String> {
    library_add_collection(collection, db_state)
}

/// Updates an existing collection name and color.
#[tauri::command]
pub fn library_update_collection(
    collection: Collection,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let color = collection.color.as_deref().unwrap_or("#3b82f6");
    let ok = core_cols::update_collection(conn, &collection.id, &collection.name, color)
        .map_err(|e| e.to_string())?;

    Ok(if ok { 1 } else { 0 })
}

/// Soft-deletes a collection by ID.
#[tauri::command]
pub fn library_delete_collection(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    core_cols::delete_collection(conn, &id).map_err(|e| e.to_string())
}

/// Adds a book into a collection association.
#[tauri::command]
pub fn library_add_book_to_collection(
    book_id: String,
    collection_id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    core_cols::add_book_to_collection(conn, &book_id, &collection_id).map_err(|e| e.to_string())
}

/// Removes a book from a collection association (soft delete).
#[tauri::command]
pub fn library_remove_book_from_collection(
    book_id: String,
    collection_id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    core_cols::remove_book_from_collection(conn, &book_id, &collection_id).map_err(|e| e.to_string())
}

/// Retrieves all collections associated with a given book ID.
#[tauri::command]
pub fn library_get_book_collections(
    book_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<Collection>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.name, c.color FROM library_collections c \
             INNER JOIN library_book_collections bc ON c.id = bc.collection_id \
             WHERE bc.book_id = ? AND bc.deleted_at IS NULL AND c.deleted_at IS NULL",
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
    for i in iter.flatten() {
        items.push(i);
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
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    core_cols::set_book_collections(conn, &book_id, &collection_ids).map_err(|e| e.to_string())
}

/// Retrieves all book-to-collection mappings in a single batch query.
#[tauri::command]
pub fn library_get_all_book_collections(
    db_state: State<'_, DbState>,
) -> Result<std::collections::HashMap<String, Vec<String>>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare("SELECT book_id, collection_id FROM library_book_collections WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            let book_id: String = row.get(0)?;
            let collection_id: String = row.get(1)?;
            Ok((book_id, collection_id))
        })
        .map_err(|e| e.to_string())?;

    let mut map: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    for i in iter.flatten() {
        map.entry(i.0).or_default().push(i.1);
    }
    Ok(map)
}
