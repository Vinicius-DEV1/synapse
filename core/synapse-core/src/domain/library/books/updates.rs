use chrono::Utc;
use rusqlite::{params, Connection};

use crate::error::Result;

pub fn update_book_progress(
    conn: &Connection,
    book_id: &str,
    current_page: i32,
    total_pages: i32,
    reading_status: Option<&str>,
) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let status = reading_status.unwrap_or_else(|| {
        if current_page >= total_pages && total_pages > 0 {
            "finished"
        } else if current_page > 0 {
            "reading"
        } else {
            "unread"
        }
    });

    let rows = conn.execute(
        "UPDATE library_books SET current_page = ?1, total_pages = ?2, reading_status = ?3, \
         last_read_at = ?4, updated_at = ?4 WHERE id = ?5 AND deleted_at IS NULL",
        params![current_page, total_pages, status, now, book_id],
    )?;
    Ok(rows > 0)
}

pub fn update_book_status(conn: &Connection, book_id: &str, status: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_books SET reading_status = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![status, now, book_id],
    )?;
    Ok(rows > 0)
}

pub fn set_book_archived(conn: &Connection, book_id: &str, archived: bool) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let archive_timestamp = if archived { Some(now.clone()) } else { None };
    let rows = conn.execute(
        "UPDATE library_books SET is_archived = ?1, archived_at = ?2, updated_at = ?3 WHERE id = ?4 AND deleted_at IS NULL",
        params![if archived { 1 } else { 0 }, archive_timestamp, now, book_id],
    )?;
    Ok(rows > 0)
}

pub fn update_book_metadata(
    conn: &Connection,
    book_id: &str,
    title: &str,
    author: &str,
    description: Option<&str>,
    published_year: Option<i32>,
    publisher: Option<&str>,
    language: Option<&str>,
) -> Result<bool> {
    let book_id = book_id.trim();
    let title = title.trim();
    let author = author.trim();
    if book_id.is_empty() || title.is_empty() {
        return Ok(false);
    }
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_books SET title = ?1, author = ?2, description = ?3, \
         published_year = ?4, publisher = ?5, language = ?6, updated_at = ?7 \
         WHERE id = ?8 AND deleted_at IS NULL",
        params![
            title,
            author,
            description,
            published_year,
            publisher,
            language,
            now,
            book_id
        ],
    )?;
    Ok(rows > 0)
}

pub fn update_book_cover(
    conn: &Connection,
    book_id: &str,
    cover_image: Option<&str>,
    cover_color: Option<&str>,
) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_books SET cover_image = ?1, cover_color = ?2, updated_at = ?3 \
         WHERE id = ?4 AND deleted_at IS NULL",
        params![cover_image, cover_color, now, book_id],
    )?;
    Ok(rows > 0)
}

pub fn soft_delete_book(conn: &Connection, book_id: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let transaction = conn.unchecked_transaction()?;
    let rows = transaction.execute(
        "UPDATE library_books SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, book_id],
    )?;

    if rows == 0 {
        transaction.commit()?;
        return Ok(false);
    }
    transaction.execute(
        "UPDATE library_highlights SET deleted_at = ?1 WHERE book_id = ?2 AND deleted_at IS NULL",
        params![now, book_id],
    )?;
    transaction.execute(
        "UPDATE library_bookmarks SET deleted_at = ?1 WHERE book_id = ?2 AND deleted_at IS NULL",
        params![now, book_id],
    )?;
    transaction.commit()?;
    Ok(true)
}
