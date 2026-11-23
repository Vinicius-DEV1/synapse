//! Library reader bookmarks and text highlights persistence.

use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use super::models::{Bookmark, Highlight};
use crate::error::Result;

/// Retrieves bookmarks for a given book, ordered by page number.
pub fn get_bookmarks(conn: &Connection, book_id: &str) -> Result<Vec<Bookmark>> {
    let sql = "SELECT id, book_id, page_number, label, created_at \
               FROM library_bookmarks WHERE book_id = ?1 AND deleted_at IS NULL \
               ORDER BY page_number ASC";
    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![book_id])?;

    let mut bookmarks = Vec::new();
    while let Some(row) = rows.next()? {
        bookmarks.push(Bookmark {
            id: row.get(0)?,
            book_id: row.get(1)?,
            page_number: row.get(2)?,
            label: row.get(3)?,
            created_at: row.get(4)?,
        });
    }

    Ok(bookmarks)
}

/// Adds a bookmark to a book page.
pub fn add_bookmark(
    conn: &Connection,
    book_id: &str,
    page_number: i32,
    label: Option<&str>,
) -> Result<Bookmark> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let default_label = format!("Página {}", page_number);
    let effective_label = label.unwrap_or(&default_label);

    conn.execute(
        "INSERT INTO library_bookmarks (id, book_id, page_number, label, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        params![id, book_id, page_number, effective_label, now],
    )?;

    Ok(Bookmark {
        id,
        book_id: book_id.to_string(),
        page_number,
        label: Some(effective_label.to_string()),
        created_at: Some(now),
    })
}

/// Updates the label of a bookmark.
pub fn update_bookmark(conn: &Connection, bookmark_id: &str, label: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_bookmarks SET label = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![label, now, bookmark_id],
    )?;
    Ok(rows > 0)
}

/// Soft-deletes a bookmark.
pub fn delete_bookmark(conn: &Connection, bookmark_id: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_bookmarks SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, bookmark_id],
    )?;
    Ok(rows > 0)
}

/// Retrieves highlights for a book, ordered by page number and timestamp.
pub fn get_highlights(conn: &Connection, book_id: &str) -> Result<Vec<Highlight>> {
    let sql = "SELECT id, book_id, page_number, text_content, color, rects, highlight_type, note, created_at \
               FROM library_highlights WHERE book_id = ?1 AND deleted_at IS NULL \
               ORDER BY page_number ASC, created_at ASC";
    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![book_id])?;

    let mut highlights = Vec::new();
    while let Some(row) = rows.next()? {
        highlights.push(Highlight {
            id: row.get(0)?,
            book_id: row.get(1)?,
            page_number: row.get(2)?,
            text_content: row.get(3)?,
            color: row.get(4)?,
            rects: row.get(5)?,
            highlight_type: row.get(6)?,
            note: row.get(7)?,
            created_at: row.get(8)?,
        });
    }

    Ok(highlights)
}

/// Adds a text highlight or note to a book page.
pub fn add_highlight(
    conn: &Connection,
    book_id: &str,
    page_number: i32,
    text_content: &str,
    color: Option<&str>,
    note: Option<&str>,
) -> Result<Highlight> {
    add_highlight_full(
        conn,
        book_id,
        page_number,
        text_content,
        color,
        None,
        None,
        note,
    )
}

pub fn add_highlight_full(
    conn: &Connection,
    book_id: &str,
    page_number: i32,
    text_content: &str,
    color: Option<&str>,
    rects: Option<&str>,
    highlight_type: Option<&str>,
    note: Option<&str>,
) -> Result<Highlight> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let effective_color = color.unwrap_or("#ffeb3b");

    conn.execute(
        "INSERT INTO library_highlights (id, book_id, page_number, text_content, color, rects, highlight_type, note, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
        params![id, book_id, page_number, text_content, effective_color, rects, highlight_type, note, now],
    )?;

    Ok(Highlight {
        id,
        book_id: book_id.to_string(),
        page_number,
        text_content: text_content.to_string(),
        color: Some(effective_color.to_string()),
        rects: rects.map(|s| s.to_string()),
        highlight_type: highlight_type.map(|s| s.to_string()),
        note: note.map(|s| s.to_string()),
        created_at: Some(now),
    })
}

/// Updates the color and optional note of a highlight.
pub fn update_highlight(
    conn: &Connection,
    highlight_id: &str,
    color: &str,
    note: Option<&str>,
) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_highlights SET color = ?1, note = ?2, updated_at = ?3 \
         WHERE id = ?4 AND deleted_at IS NULL",
        params![color, note, now, highlight_id],
    )?;
    Ok(rows > 0)
}

/// Updates highlight content, color, rects, highlight_type, or note.
pub fn update_highlight_full(
    conn: &Connection,
    highlight_id: &str,
    text_content: Option<&str>,
    color: Option<&str>,
    rects: Option<&str>,
    highlight_type: Option<&str>,
    note: Option<&str>,
) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_highlights SET text_content = COALESCE(?1, text_content), \
         color = COALESCE(?2, color), rects = COALESCE(?3, rects), \
         highlight_type = COALESCE(?4, highlight_type), note = COALESCE(?5, note), \
         updated_at = ?6 WHERE id = ?7 AND deleted_at IS NULL",
        params![
            text_content,
            color,
            rects,
            highlight_type,
            note,
            now,
            highlight_id
        ],
    )?;
    Ok(rows > 0)
}

/// Updates only the note on a highlight.
pub fn update_highlight_note(
    conn: &Connection,
    highlight_id: &str,
    note: Option<&str>,
) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_highlights SET note = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![note, now, highlight_id],
    )?;
    Ok(rows > 0)
}

/// Soft-deletes a highlight.
pub fn delete_highlight(conn: &Connection, highlight_id: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_highlights SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, highlight_id],
    )?;
    Ok(rows > 0)
}
