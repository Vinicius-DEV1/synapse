use super::models::TrashItem;
use crate::error::Result;
use rusqlite::params;

fn resolve_table(item_type: &str) -> Option<&'static str> {
    match item_type {
        "page" => Some("pages"),
        "anki_deck" => Some("anki_decks"),
        "anki_card" => Some("anki_cards"),
        "book" => Some("library_books"),
        "vault" => Some("vault_items"),
        "finance" => Some("transactions"),
        "wishlist" => Some("wishlist"),
        "calendar" => Some("calendar_events"),
        "file" => Some("files"),
        "culture" => Some("culture_items"),
        "habit" => Some("habits"),
        "lofi" => Some("lofis"),
        _ => None,
    }
}

pub fn get_trash_items(conn: &rusqlite::Connection) -> Result<Vec<TrashItem>> {
    let query = "
        SELECT id, title, deleted_at, 'page' as item_type FROM pages WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, name as title, deleted_at, 'anki_deck' as item_type FROM anki_decks WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, front as title, deleted_at, 'anki_card' as item_type FROM anki_cards WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, title as title, deleted_at, 'book' as item_type FROM library_books WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, label as title, deleted_at, 'vault' as item_type FROM vault_items WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, description as title, deleted_at, 'finance' as item_type FROM transactions WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, title as title, deleted_at, 'wishlist' as item_type FROM wishlist WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, title as title, deleted_at, 'calendar' as item_type FROM calendar_events WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, name as title, deleted_at, 'file' as item_type FROM files WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, title as title, deleted_at, 'culture' as item_type FROM culture_items WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, title as title, deleted_at, 'habit' as item_type FROM habits WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, title as title, deleted_at, 'lofi' as item_type FROM lofis WHERE deleted_at IS NOT NULL
        ORDER BY deleted_at DESC LIMIT 150
    ";

    let mut stmt = conn.prepare(query)?;
    let iter = stmt.query_map([], |row| {
        Ok(TrashItem {
            id: row.get(0)?,
            title: row.get(1)?,
            deleted_at: row.get(2)?,
            item_type: row.get(3)?,
        })
    })?;

    let mut list = Vec::new();
    for item in iter.flatten() {
        list.push(item);
    }
    Ok(list)
}

pub fn restore_trash_item(conn: &rusqlite::Connection, id: &str, item_type: &str) -> Result<bool> {
    if id.trim().is_empty() || item_type.trim().is_empty() {
        return Ok(false);
    }
    let table = match resolve_table(item_type) {
        Some(t) => t,
        None => return Ok(false),
    };

    let sql = format!(
        "UPDATE {} SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
        table
    );
    let rows = conn.execute(&sql, params![id.trim()])?;

    if item_type == "file" {
        let _ = conn.execute("UPDATE library_highlights SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE book_id = ?1", params![id.trim()]);
        let _ = conn.execute("UPDATE library_bookmarks SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE book_id = ?1", params![id.trim()]);
    } else if item_type == "vault" {
        let _ = conn.execute("UPDATE vault_items SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE group_id = ?1", params![id.trim()]);
    } else if item_type == "anki_deck" {
        let _ = conn.execute("UPDATE anki_cards SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE deck_id = ?1", params![id.trim()]);
    }

    Ok(rows > 0)
}

pub fn delete_trash_item_permanently(conn: &rusqlite::Connection, id: &str, item_type: &str) -> Result<bool> {
    if id.trim().is_empty() || item_type.trim().is_empty() {
        return Ok(false);
    }
    let table = match resolve_table(item_type) {
        Some(t) => t,
        None => return Ok(false),
    };

    let sql = format!("DELETE FROM {} WHERE id = ?1", table);
    let rows = conn.execute(&sql, params![id.trim()])?;

    if item_type == "file" {
        let _ = conn.execute("DELETE FROM library_highlights WHERE book_id = ?1", params![id.trim()]);
        let _ = conn.execute("DELETE FROM library_bookmarks WHERE book_id = ?1", params![id.trim()]);
        let _ = conn.execute("DELETE FROM library_reading_sessions WHERE book_id = ?1", params![id.trim()]);
        let _ = conn.execute("DELETE FROM library_ocr_cache WHERE book_id = ?1", params![id.trim()]);
    } else if item_type == "vault" {
        let _ = conn.execute("DELETE FROM vault_items WHERE group_id = ?1", params![id.trim()]);
    } else if item_type == "anki_deck" {
        let _ = conn.execute("DELETE FROM anki_cards WHERE deck_id = ?1", params![id.trim()]);
    }

    Ok(rows > 0)
}

pub fn empty_trash(conn: &rusqlite::Connection) -> Result<bool> {
    let tables = [
        "pages",
        "anki_decks",
        "anki_cards",
        "library_books",
        "vault_items",
        "vault_groups",
        "transactions",
        "wishlist",
        "calendar_events",
        "culture_items",
        "habits",
        "lofis",
        "files",
        "file_folders",
        "focus_sessions",
        "notifications",
    ];

    for tbl in tables {
        let sql = format!("DELETE FROM {} WHERE deleted_at IS NOT NULL", tbl);
        let _ = conn.execute(&sql, []);
    }

    Ok(true)
}
