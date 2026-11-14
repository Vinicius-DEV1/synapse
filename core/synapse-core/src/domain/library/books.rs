//! Library book catalog database queries and persistence.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::json;
use std::collections::HashMap;

use super::models::BookRecord;
use crate::error::Result;

/// Retrieves books matching an optional title/author filter with hydrated collections.
pub fn get_books(conn: &Connection, filter: Option<&str>) -> Result<Vec<BookRecord>> {
    let mut sql = String::from(
        "SELECT id, title, author, file_path, drive_file_id, cover_color, cover_image, \
         collections, total_pages, current_page, reading_status, last_read_page, \
         epub_locations, reading_preferences, language, last_read_at, original_name, \
         published_year, publisher, description, is_local, is_archived, archived_at, \
         created_at, updated_at, deleted_at \
         FROM library_books WHERE deleted_at IS NULL ",
    );

    let mut param_values: Vec<String> = Vec::new();
    if let Some(f) = filter {
        let trimmed = f.trim();
        if !trimmed.is_empty() {
            sql.push_str("AND (title LIKE ?1 OR author LIKE ?1) ");
            param_values.push(format!("%{}%", trimmed));
        }
    }

    sql.push_str("ORDER BY updated_at DESC");

    // Load active book collections map
    let mut collections_by_book: HashMap<String, Vec<serde_json::Value>> = HashMap::new();
    let rel_sql = "SELECT bc.book_id, c.id, c.name, c.color FROM library_book_collections bc \
                   INNER JOIN library_collections c ON c.id = bc.collection_id \
                   WHERE bc.deleted_at IS NULL AND c.deleted_at IS NULL ORDER BY bc.rowid ASC";
    if let Ok(mut rel_stmt) = conn.prepare(rel_sql) {
        if let Ok(mut rel_rows) = rel_stmt.query([]) {
            while let Ok(Some(row)) = rel_rows.next() {
                if let (Ok(book_id), Ok(id), Ok(name), Ok(color)) = (
                    row.get::<_, String>(0),
                    row.get::<_, String>(1),
                    row.get::<_, String>(2),
                    row.get::<_, String>(3),
                ) {
                    collections_by_book.entry(book_id).or_default().push(json!({
                        "id": id,
                        "name": name,
                        "color": color,
                    }));
                }
            }
        }
    }

    let mut stmt = conn.prepare(&sql)?;
    let mut rows = if param_values.is_empty() {
        stmt.query([])?
    } else {
        stmt.query(rusqlite::params_from_iter(param_values.iter()))?
    };

    let mut books = Vec::new();
    while let Some(row) = rows.next()? {
        let id: String = row.get(0)?;
        let collections = if let Some(cols) = collections_by_book.get(&id) {
            Some(serde_json::to_string(cols).unwrap_or_else(|_| "[]".to_string()))
        } else {
            row.get(7)?
        };

        books.push(BookRecord {
            id,
            title: row.get(1)?,
            author: row.get(2)?,
            file_path: row.get(3)?,
            drive_file_id: row.get(4)?,
            cover_color: row.get(5)?,
            cover_image: row.get(6)?,
            collections,
            total_pages: row.get(8)?,
            current_page: row.get(9)?,
            reading_status: row.get(10)?,
            last_read_page: row.get(11)?,
            epub_locations: row.get(12)?,
            reading_preferences: row.get(13)?,
            language: row.get(14)?,
            last_read_at: row.get(15)?,
            original_name: row.get(16)?,
            published_year: row.get(17)?,
            publisher: row.get(18)?,
            description: row.get(19)?,
            is_local: row.get(20)?,
            is_archived: row.get(21)?,
            archived_at: row.get(22)?,
            created_at: row.get(23)?,
            updated_at: row.get(24)?,
            deleted_at: row.get(25)?,
        });
    }

    Ok(books)
}

/// Retrieves a single book by ID.
pub fn get_book(conn: &Connection, book_id: &str) -> Result<Option<BookRecord>> {
    let sql = "SELECT id, title, author, file_path, drive_file_id, cover_color, cover_image, \
               collections, total_pages, current_page, reading_status, last_read_page, \
               epub_locations, reading_preferences, language, last_read_at, original_name, \
               published_year, publisher, description, is_local, is_archived, archived_at, \
               created_at, updated_at, deleted_at \
               FROM library_books WHERE id = ?1 AND deleted_at IS NULL";

    let opt = conn
        .query_row(sql, params![book_id], |row| {
            Ok(BookRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                author: row.get(2)?,
                file_path: row.get(3)?,
                drive_file_id: row.get(4)?,
                cover_color: row.get(5)?,
                cover_image: row.get(6)?,
                collections: row.get(7)?,
                total_pages: row.get(8)?,
                current_page: row.get(9)?,
                reading_status: row.get(10)?,
                last_read_page: row.get(11)?,
                epub_locations: row.get(12)?,
                reading_preferences: row.get(13)?,
                language: row.get(14)?,
                last_read_at: row.get(15)?,
                original_name: row.get(16)?,
                published_year: row.get(17)?,
                publisher: row.get(18)?,
                description: row.get(19)?,
                is_local: row.get(20)?,
                is_archived: row.get(21)?,
                archived_at: row.get(22)?,
                created_at: row.get(23)?,
                updated_at: row.get(24)?,
                deleted_at: row.get(25)?,
            })
        })
        .optional()?;

    Ok(opt)
}

/// Inserts a new book record.
pub fn insert_book(conn: &Connection, book: &BookRecord) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    let created_at = book.created_at.as_deref().unwrap_or(&now);
    let updated_at = book.updated_at.as_deref().unwrap_or(&now);

    conn.execute(
        "INSERT INTO library_books (id, title, author, file_path, drive_file_id, cover_color, \
         cover_image, collections, total_pages, current_page, reading_status, last_read_page, \
         epub_locations, reading_preferences, language, last_read_at, original_name, \
         published_year, publisher, description, is_local, is_archived, archived_at, \
         created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, \
                 ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25)",
        params![
            book.id,
            book.title,
            book.author.as_deref().unwrap_or("Desconhecido"),
            book.file_path,
            book.drive_file_id,
            book.cover_color,
            book.cover_image,
            book.collections.as_deref().unwrap_or("[]"),
            book.total_pages.unwrap_or(0),
            book.current_page.unwrap_or(0),
            book.reading_status.as_deref().unwrap_or("unread"),
            book.last_read_page,
            book.epub_locations,
            book.reading_preferences,
            book.language,
            book.last_read_at,
            book.original_name,
            book.published_year,
            book.publisher,
            book.description,
            book.is_local.unwrap_or(true),
            book.is_archived.unwrap_or(false),
            book.archived_at,
            created_at,
            updated_at,
        ],
    )?;

    Ok(())
}

/// Updates reading progress of a book.
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

/// Updates only the reading status of a book.
pub fn update_book_status(conn: &Connection, book_id: &str, status: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_books SET reading_status = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![status, now, book_id],
    )?;
    Ok(rows > 0)
}

/// Sets whether a book is archived.
pub fn set_book_archived(conn: &Connection, book_id: &str, archived: bool) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let archive_timestamp = if archived { Some(now.clone()) } else { None };
    let rows = conn.execute(
        "UPDATE library_books SET is_archived = ?1, archived_at = ?2, updated_at = ?3 WHERE id = ?4 AND deleted_at IS NULL",
        params![if archived { 1 } else { 0 }, archive_timestamp, now, book_id],
    )?;
    Ok(rows > 0)
}

/// Updates book details and metadata.
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
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_books SET title = ?1, author = ?2, description = ?3, \
         published_year = ?4, publisher = ?5, language = ?6, updated_at = ?7 \
         WHERE id = ?8 AND deleted_at IS NULL",
        params![title, author, description, published_year, publisher, language, now, book_id],
    )?;
    Ok(rows > 0)
}

/// Updates book cover image and color.
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

/// Soft-deletes a book, its highlights, and bookmarks.
pub fn soft_delete_book(conn: &Connection, book_id: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_books SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, book_id],
    )?;

    if rows > 0 {
        let _ = conn.execute(
            "UPDATE library_highlights SET deleted_at = ?1 WHERE book_id = ?2 AND deleted_at IS NULL",
            params![now, book_id],
        );
        let _ = conn.execute(
            "UPDATE library_bookmarks SET deleted_at = ?1 WHERE book_id = ?2 AND deleted_at IS NULL",
            params![now, book_id],
        );
        Ok(true)
    } else {
        Ok(false)
    }
}
