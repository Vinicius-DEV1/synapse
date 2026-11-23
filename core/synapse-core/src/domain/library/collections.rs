//! Library collections and book-collection relation management.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use std::collections::HashSet;
use uuid::Uuid;

use super::models::BookCollection;
use crate::error::Result;

fn is_valid_collection(name: &str, color: &str) -> bool {
    let name_trimmed = name.trim();
    if name_trimmed.is_empty() || name_trimmed.len() > 60 {
        return false;
    }
    let color_trimmed = color.trim();
    if color_trimmed.len() != 7 || !color_trimmed.starts_with('#') {
        return false;
    }
    color_trimmed[1..].chars().all(|c| c.is_ascii_hexdigit())
}

/// Retrieves all active library collections sorted by name.
pub fn get_collections(conn: &Connection) -> Result<Vec<BookCollection>> {
    let sql = "SELECT id, name, color, created_at, updated_at, deleted_at \
               FROM library_collections WHERE deleted_at IS NULL \
               ORDER BY name COLLATE NOCASE ASC";
    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query([])?;

    let mut collections = Vec::new();
    while let Some(row) = rows.next()? {
        collections.push(BookCollection {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            deleted_at: row.get(5)?,
        });
    }

    Ok(collections)
}

/// Creates a new book collection with name and hex color.
pub fn create_collection(
    conn: &Connection,
    name: &str,
    color: &str,
) -> Result<Option<BookCollection>> {
    let norm_name = name.trim();
    let norm_color = color.trim();
    if !is_valid_collection(norm_name, norm_color) {
        return Ok(None);
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO library_collections (id, name, color, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?4)",
        params![id, norm_name, norm_color, now],
    )?;

    Ok(Some(BookCollection {
        id,
        name: norm_name.to_string(),
        color: norm_color.to_string(),
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    }))
}

/// Updates an existing collection name and color.
pub fn update_collection(
    conn: &Connection,
    collection_id: &str,
    name: &str,
    color: &str,
) -> Result<bool> {
    let norm_id = collection_id.trim();
    let norm_name = name.trim();
    let norm_color = color.trim();
    if norm_id.is_empty() || !is_valid_collection(norm_name, norm_color) {
        return Ok(false);
    }

    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_collections SET name = ?1, color = ?2, updated_at = ?3 \
         WHERE id = ?4 AND deleted_at IS NULL",
        params![norm_name, norm_color, now, norm_id],
    )?;
    Ok(rows > 0)
}

/// Soft-deletes a library collection.
pub fn delete_collection(conn: &Connection, collection_id: &str) -> Result<bool> {
    let norm_id = collection_id.trim();
    if norm_id.is_empty() {
        return Ok(false);
    }
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_collections SET deleted_at = ?1, updated_at = ?1 \
         WHERE id = ?2 AND deleted_at IS NULL",
        params![now, norm_id],
    )?;
    Ok(rows > 0)
}

/// Replaces collection assignments for a given book.
pub fn set_book_collections(
    conn: &Connection,
    book_id: &str,
    collection_ids: &[String],
) -> Result<bool> {
    let transaction = conn.unchecked_transaction()?;
    let updated = set_book_collections_in_transaction(&transaction, book_id, collection_ids)?;
    if updated {
        transaction.commit()?;
    }
    Ok(updated)
}

pub fn set_book_collections_in_transaction(
    transaction: &Transaction<'_>,
    book_id: &str,
    collection_ids: &[String],
) -> Result<bool> {
    let norm_book_id = book_id.trim();
    if norm_book_id.is_empty() {
        return Ok(false);
    }

    let book_exists: Option<String> = transaction
        .query_row(
            "SELECT id FROM library_books WHERE id = ?1 AND deleted_at IS NULL",
            params![norm_book_id],
            |r| r.get(0),
        )
        .optional()?;

    if book_exists.is_none() {
        return Ok(false);
    }

    let active_cols = get_collections(transaction)?;
    let active_ids: HashSet<String> = active_cols.into_iter().map(|c| c.id).collect();

    let mut unique_ids = Vec::new();
    let mut seen = HashSet::new();
    for cid in collection_ids {
        if !active_ids.contains(cid) {
            return Ok(false);
        }
        if seen.insert(cid) {
            unique_ids.push(cid);
        }
    }

    let now = Utc::now().to_rfc3339();
    transaction.execute(
        "UPDATE library_book_collections SET deleted_at = ?1, updated_at = ?1 \
         WHERE book_id = ?2 AND deleted_at IS NULL",
        params![now, norm_book_id],
    )?;

    for cid in unique_ids {
        let rel_id = Uuid::new_v4().to_string();
        transaction.execute(
            "INSERT INTO library_book_collections (id, book_id, collection_id, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?4)",
            params![rel_id, norm_book_id, cid, now],
        )?;
    }

    Ok(true)
}

/// Adds a single book to a collection if not already assigned.
pub fn add_book_to_collection(
    conn: &Connection,
    book_id: &str,
    collection_id: &str,
) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rel_id = Uuid::new_v4().to_string();
    let rows = conn.execute(
        "INSERT INTO library_book_collections (id, book_id, collection_id, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?4)",
        params![rel_id, book_id.trim(), collection_id.trim(), now],
    )?;
    Ok(rows > 0)
}

/// Removes a book from a collection.
pub fn remove_book_from_collection(
    conn: &Connection,
    book_id: &str,
    collection_id: &str,
) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE library_book_collections SET deleted_at = ?1, updated_at = ?1 \
         WHERE book_id = ?2 AND collection_id = ?3 AND deleted_at IS NULL",
        params![now, book_id.trim(), collection_id.trim()],
    )?;
    Ok(rows > 0)
}
