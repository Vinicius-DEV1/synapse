use crate::cmd_library::types::Highlight;
use crate::db::DbState;
use synapse_core::domain::library::reader as core_reader;
use tauri::State;

/// Retrieves all active highlights for a specific book.
#[tauri::command]
pub async fn library_get_highlights(
    book_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<Highlight>, String> {
    db_state
        .read(move |conn| {
            let list = core_reader::get_highlights(conn, &book_id)
                .map_err(|e| e.to_string())?
                .into_iter()
                .map(|h| Highlight {
                    id: Some(h.id),
                    book_id: h.book_id,
                    page_number: h.page_number,
                    text_content: Some(h.text_content),
                    color: h.color,
                    rects: h.rects,
                    highlight_type: h.highlight_type,
                    note: h.note,
                    created_at: h.created_at,
                    updated_at: None,
                    deleted_at: None,
                })
                .collect();
            Ok(list)
        })
        .await
}

/// Creates a new text or area highlight for a book.
#[tauri::command]
pub async fn library_create_highlight(
    highlight: Highlight,
    db_state: State<'_, DbState>,
) -> Result<Highlight, String> {
    db_state
        .write(move |conn| {
            let text = highlight.text_content.unwrap_or_default();
            let created = core_reader::add_highlight_full(
                conn,
                &highlight.book_id,
                highlight.page_number,
                &text,
                highlight.color.as_deref(),
                highlight.rects.as_deref(),
                highlight.highlight_type.as_deref(),
                highlight.note.as_deref(),
            )
            .map_err(|e| e.to_string())?;

            Ok(Highlight {
                id: Some(created.id),
                book_id: created.book_id,
                page_number: created.page_number,
                text_content: Some(created.text_content),
                color: created.color,
                rects: created.rects,
                highlight_type: created.highlight_type,
                note: created.note,
                created_at: created.created_at,
                updated_at: None,
                deleted_at: None,
            })
        })
        .await
}

/// Updates an existing highlight content, color, or notes.
#[tauri::command]
pub async fn library_update_highlight(
    highlight: Highlight,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    db_state
        .write(move |conn| {
            let id = highlight.id.ok_or("Highlight id required")?;
            let ok = core_reader::update_highlight_full(
                conn,
                &id,
                highlight.text_content.as_deref(),
                highlight.color.as_deref(),
                highlight.rects.as_deref(),
                highlight.highlight_type.as_deref(),
                highlight.note.as_deref(),
            )
            .map_err(|e| e.to_string())?;

            Ok(if ok { 1 } else { 0 })
        })
        .await
}

/// Updates only the note on an existing highlight.
#[tauri::command]
#[allow(dead_code)]
pub async fn library_update_highlight_note(
    id: String,
    note: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            core_reader::update_highlight_note(conn, &id, Some(&note)).map_err(|e| e.to_string())
        })
        .await
}

/// Soft-deletes a highlight by ID.
#[tauri::command]
pub async fn library_delete_highlight(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| core_reader::delete_highlight(conn, &id).map_err(|e| e.to_string()))
        .await
}
