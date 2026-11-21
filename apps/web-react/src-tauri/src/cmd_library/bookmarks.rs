use crate::cmd_library::types::Bookmark;
use crate::db::DbState;
use synapse_core::domain::library::reader as core_reader;
use tauri::State;

/// Retrieves all active bookmarks for a specific book.
#[tauri::command]
pub async fn library_get_bookmarks(
    book_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<Bookmark>, String> {
    db_state
        .read(move |conn| {
            let marks = core_reader::get_bookmarks(conn, &book_id)
                .map_err(|e| e.to_string())?
                .into_iter()
                .map(|b| Bookmark {
                    id: Some(b.id),
                    book_id: b.book_id,
                    page_number: b.page_number,
                    label: b.label,
                    created_at: b.created_at,
                    updated_at: None,
                    deleted_at: None,
                })
                .collect();
            Ok(marks)
        })
        .await
}

/// Creates a new bookmark at a specific page.
#[tauri::command]
pub async fn library_create_bookmark(
    bookmark: Bookmark,
    db_state: State<'_, DbState>,
) -> Result<Bookmark, String> {
    db_state
        .write(move |conn| {
            let created = core_reader::add_bookmark(
                conn,
                &bookmark.book_id,
                bookmark.page_number,
                bookmark.label.as_deref(),
            )
            .map_err(|e| e.to_string())?;

            Ok(Bookmark {
                id: Some(created.id),
                book_id: created.book_id,
                page_number: created.page_number,
                label: created.label,
                created_at: created.created_at,
                updated_at: None,
                deleted_at: None,
            })
        })
        .await
}

/// Updates the label of an existing bookmark.
#[tauri::command]
pub async fn library_update_bookmark(
    bookmark: Bookmark,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    db_state
        .write(move |conn| {
            let id = bookmark.id.ok_or("Bookmark id is required")?;
            let label = bookmark.label.unwrap_or_default();
            let ok = core_reader::update_bookmark(conn, &id, &label).map_err(|e| e.to_string())?;

            Ok(if ok { 1 } else { 0 })
        })
        .await
}

/// Soft-deletes a bookmark by ID.
#[tauri::command]
pub async fn library_delete_bookmark(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| core_reader::delete_bookmark(conn, &id).map_err(|e| e.to_string()))
        .await
}
