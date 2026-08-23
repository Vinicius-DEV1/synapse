use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

fn deserialize_i32_flexible<'de, D>(deserializer: D) -> Result<i32, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum IntOrString {
        Int(i32),
        Float(f64),
        String(String),
    }

    match Option::<IntOrString>::deserialize(deserializer)? {
        Some(IntOrString::Int(i)) => Ok(i),
        Some(IntOrString::Float(f)) => Ok(f as i32),
        Some(IntOrString::String(s)) => Ok(s.parse::<i32>().unwrap_or(0)),
        None => Ok(0),
    }
}

fn deserialize_option_string_flexible<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrIntOrFloat {
        String(String),
        Int(i64),
        Float(f64),
    }

    match Option::<StringOrIntOrFloat>::deserialize(deserializer)? {
        Some(StringOrIntOrFloat::String(s)) => Ok(Some(s)),
        Some(StringOrIntOrFloat::Int(i)) => Ok(Some(i.to_string())),
        Some(StringOrIntOrFloat::Float(f)) => Ok(Some((f as i64).to_string())),
        None => Ok(None),
    }
}

#[derive(Serialize, Deserialize)]
pub struct Book {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub file_path: Option<String>,
    #[serde(default)]
    pub drive_file_id: Option<String>,
    #[serde(default)]
    pub cover_color: Option<String>,
    #[serde(default)]
    pub cover_image: Option<String>,
    #[serde(default, deserialize_with = "deserialize_i32_flexible")]
    pub total_pages: i32,
    #[serde(default, deserialize_with = "deserialize_i32_flexible")]
    pub current_page: i32,
    #[serde(default)]
    pub reading_status: Option<String>,
    #[serde(default, deserialize_with = "deserialize_option_string_flexible")]
    pub last_read_page: Option<String>,
    #[serde(default)]
    pub epub_locations: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub deleted_at: Option<String>,
    #[serde(default)]
    pub reading_preferences: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct Collection {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub color: Option<String>,
}

#[tauri::command]
pub fn library_get_books(db_state: State<'_, DbState>) -> Result<Vec<Book>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, title, author, file_path, drive_file_id, cover_color, cover_image, total_pages, current_page, reading_status, last_read_page, epub_locations, created_at, updated_at, deleted_at, reading_preferences FROM library_books WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(Book {
                id: row.get(0)?,
                title: row.get(1)?,
                author: row.get(2)?,
                file_path: row.get(3)?,
                drive_file_id: row.get(4)?,
                cover_color: row.get(5)?,
                cover_image: row.get(6)?,
                total_pages: row.get(7)?,
                current_page: row.get(8)?,
                reading_status: row.get(9)?,
                last_read_page: row.get(10)?,
                epub_locations: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
                deleted_at: row.get(14)?,
                reading_preferences: row.get(15)?,
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

#[tauri::command]
pub fn library_add_book(book: Book, db_state: State<'_, DbState>) -> Result<Book, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = if book.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        book.id.clone()
    };

    conn.execute(
        "INSERT INTO library_books (id, title, author, file_path, drive_file_id, cover_color, cover_image, total_pages, current_page, reading_status, last_read_page, epub_locations, reading_preferences) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, book.title, book.author, book.file_path, book.drive_file_id, book.cover_color, book.cover_image, book.total_pages, book.current_page, book.reading_status, book.last_read_page, book.epub_locations, book.reading_preferences]
    ).map_err(|e| e.to_string())?;

    let mut ret = book;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn library_update_book(book: Book, db_state: State<'_, DbState>) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let count = conn.execute(
        "UPDATE library_books SET title = ?, author = ?, file_path = ?, drive_file_id = ?, cover_color = ?, cover_image = ?, total_pages = ?, current_page = ?, reading_status = ?, last_read_page = ?, epub_locations = ?, reading_preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![book.title, book.author, book.file_path, book.drive_file_id, book.cover_color, book.cover_image, book.total_pages, book.current_page, book.reading_status, book.last_read_page, book.epub_locations, book.reading_preferences, book.id]
    ).map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn library_delete_book(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("UPDATE library_books SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub fn library_get_collections(db_state: State<'_, DbState>) -> Result<Vec<Collection>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

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

#[tauri::command]
pub fn library_add_collection(
    collection: Collection,
    db_state: State<'_, DbState>,
) -> Result<Collection, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

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

#[tauri::command]
pub fn library_import_and_encrypt_book(
    source_path: String,
    dest_path: String,
    db_state: State<'_, DbState>,
    _app_handle: tauri::AppHandle,
) -> Result<bool, String> {
    let keys_guard = db_state.keys.lock().unwrap();
    let master_key = if let Some(keys) = keys_guard.as_ref() {
        if let Some(ref k) = keys.library {
            k.clone()
        } else {
            return Err("Library key not found".into());
        }
    } else {
        return Err("Keys not unlocked".into());
    };

    let app_dir = crate::get_app_data_dir();
    let dest_full_path = app_dir.join(&dest_path);

    if let Some(parent) = dest_full_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    crate::crypto_stream::encrypt_file_chunked(&source_path, &dest_full_path, &master_key)?;

    Ok(true)
}

#[tauri::command]
pub fn library_update_collection(
    collection: Collection,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let count = conn.execute(
        "UPDATE library_collections SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![collection.name, collection.color, collection.id]
    ).map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn library_delete_collection(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("UPDATE library_collections SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub fn library_add_book_to_collection(
    book_id: String,
    collection_id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT OR REPLACE INTO library_book_collections (id, book_id, collection_id) VALUES (?, ?, ?)",
        params![id, book_id, collection_id]
    ).map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub fn library_remove_book_from_collection(
    book_id: String,
    collection_id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute(
        "UPDATE library_book_collections SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE book_id = ? AND collection_id = ?",
        params![book_id, collection_id]
    ).map_err(|e| e.to_string())?;

    Ok(true)
}

// --- HIGHLIGHTS ---

#[derive(Serialize, Deserialize)]
pub struct Highlight {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub book_id: String,
    #[serde(default)]
    pub page_number: i32,
    #[serde(default)]
    pub text_content: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub rects: Option<String>,
    #[serde(default)]
    pub highlight_type: Option<String>,
    #[serde(default)]
    pub note: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub deleted_at: Option<String>,
}

#[tauri::command]
pub fn library_get_highlights(
    book_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<Highlight>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, book_id, page_number, text_content, color, rects, highlight_type, note, created_at, updated_at, deleted_at FROM library_highlights WHERE book_id = ? AND deleted_at IS NULL")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([&book_id], |row| {
            Ok(Highlight {
                id: row.get(0)?,
                book_id: row.get(1)?,
                page_number: row.get(2)?,
                text_content: row.get(3)?,
                color: row.get(4)?,
                rects: row.get(5)?,
                highlight_type: row.get(6)?,
                note: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                deleted_at: row.get(10)?,
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

#[tauri::command]
pub fn library_create_highlight(
    highlight: Highlight,
    db_state: State<'_, DbState>,
) -> Result<Highlight, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = highlight
        .id
        .clone()
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    conn.execute(
        "INSERT INTO library_highlights (id, book_id, page_number, text_content, color, rects, highlight_type, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, highlight.book_id, highlight.page_number, highlight.text_content, highlight.color.as_deref().unwrap_or("yellow"), highlight.rects, highlight.highlight_type.as_deref().unwrap_or("text"), highlight.note]
    ).map_err(|e| e.to_string())?;

    let mut ret = highlight;
    ret.id = Some(id);
    Ok(ret)
}

#[tauri::command]
pub fn library_update_highlight(
    highlight: Highlight,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let count = conn.execute(
        "UPDATE library_highlights SET text_content = ?, color = ?, rects = ?, highlight_type = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![highlight.text_content, highlight.color, highlight.rects, highlight.highlight_type, highlight.note, highlight.id]
    ).map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn library_delete_highlight(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("UPDATE library_highlights SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

// --- BOOKMARKS ---

#[derive(Serialize, Deserialize)]
pub struct Bookmark {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub book_id: String,
    #[serde(default)]
    pub page_number: i32,
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub deleted_at: Option<String>,
}

#[tauri::command]
pub fn library_get_bookmarks(
    book_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<Bookmark>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, book_id, page_number, label, created_at, updated_at, deleted_at FROM library_bookmarks WHERE book_id = ? AND deleted_at IS NULL")
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

#[tauri::command]
pub fn library_create_bookmark(
    bookmark: Bookmark,
    db_state: State<'_, DbState>,
) -> Result<Bookmark, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

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

#[tauri::command]
pub fn library_update_bookmark(
    bookmark: Bookmark,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let count = conn
        .execute(
            "UPDATE library_bookmarks SET label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            params![bookmark.label, bookmark.id],
        )
        .map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn library_delete_bookmark(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("UPDATE library_bookmarks SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

// --- BOOK COLLECTIONS (getBookCollections / setBookCollections) ---

#[tauri::command]
pub fn library_get_book_collections(
    book_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<Collection>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.color FROM library_collections c INNER JOIN library_book_collections bc ON c.id = bc.collection_id WHERE bc.book_id = ? AND bc.deleted_at IS NULL AND c.deleted_at IS NULL"
    ).map_err(|e| e.to_string())?;

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

#[tauri::command]
pub fn library_set_book_collections(
    book_id: String,
    collection_ids: Vec<String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    // Soft-delete existing associations
    conn.execute(
        "UPDATE library_book_collections SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE book_id = ? AND deleted_at IS NULL",
        [&book_id]
    ).map_err(|e| e.to_string())?;

    // Insert new ones
    for col_id in &collection_ids {
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT OR REPLACE INTO library_book_collections (id, book_id, collection_id, deleted_at) VALUES (?, ?, ?, NULL)",
            params![id, book_id, col_id]
        ).map_err(|e| e.to_string())?;
    }

    Ok(true)
}

// --- COLLECTION CREATE ---

#[tauri::command]
pub fn library_create_collection(
    collection: Collection,
    db_state: State<'_, DbState>,
) -> Result<Collection, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

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
