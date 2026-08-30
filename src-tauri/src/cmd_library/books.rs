use rusqlite::params;
use tauri::State;
use crate::cmd_library::types::Book;
use crate::db::DbState;

/// Retrieves all active (non-deleted) books from the library.
#[tauri::command]
pub fn library_get_books(db_state: State<'_, DbState>) -> Result<Vec<Book>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, author, file_path, drive_file_id, cover_color, cover_image, total_pages, current_page, reading_status, last_read_page, epub_locations, created_at, updated_at, deleted_at, reading_preferences, is_local, original_name FROM library_books WHERE deleted_at IS NULL",
        )
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
                is_local: row.get(16).unwrap_or(Some(true)),
                original_name: row.get(17).unwrap_or(None),
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

/// Inserts a new book entry into the library.
#[tauri::command]
pub fn library_add_book(book: Book, db_state: State<'_, DbState>) -> Result<Book, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let id = if book.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        book.id.clone()
    };

    let is_local_val = book.is_local.unwrap_or(true);

    conn.execute(
        "INSERT INTO library_books (id, title, author, file_path, drive_file_id, cover_color, cover_image, total_pages, current_page, reading_status, last_read_page, epub_locations, reading_preferences, is_local, original_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, book.title, book.author, book.file_path, book.drive_file_id, book.cover_color, book.cover_image, book.total_pages, book.current_page, book.reading_status, book.last_read_page, book.epub_locations, book.reading_preferences, is_local_val, book.original_name]
    ).map_err(|e| e.to_string())?;

    let mut ret = book;
    ret.id = id;
    ret.is_local = Some(is_local_val);
    Ok(ret)
}

/// Updates an existing book metadata and reading progress.
#[tauri::command]
pub fn library_update_book(book: Book, db_state: State<'_, DbState>) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let is_local_val = book.is_local.unwrap_or_else(|| {
        book.file_path.as_ref().map(|p| !p.trim().is_empty()).unwrap_or(false)
    });

    let count = conn.execute(
        "UPDATE library_books SET title = ?, author = ?, file_path = ?, drive_file_id = ?, cover_color = ?, cover_image = ?, total_pages = ?, current_page = ?, reading_status = ?, last_read_page = ?, epub_locations = ?, reading_preferences = ?, is_local = ?, original_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![book.title, book.author, book.file_path, book.drive_file_id, book.cover_color, book.cover_image, book.total_pages, book.current_page, book.reading_status, book.last_read_page, book.epub_locations, book.reading_preferences, is_local_val, book.original_name, book.id]
    ).map_err(|e| e.to_string())?;

    Ok(count as i32)
}

/// Soft-deletes a book by setting deleted_at timestamp.
#[tauri::command]
pub fn library_delete_book(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    conn.execute(
        "UPDATE library_books SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [&id],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}

/// Imports and encrypts an external book file (EPUB/PDF) using the library master key.
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

/// Reads the encrypted or raw book file directly from the app data storage.
#[tauri::command]
pub fn library_get_book_file(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<u8>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let file_path: Option<String> = conn
        .query_row(
            "SELECT file_path FROM library_books WHERE id = ?",
            [&id],
            |row| row.get(0),
        )
        .ok();

    let app_dir = crate::get_app_data_dir();
    let library_dir = app_dir.join("library");

    let mut candidate_paths = Vec::new();
    candidate_paths.push(library_dir.join(format!("{}.epub.enc", id)));
    candidate_paths.push(library_dir.join(format!("{}.pdf.enc", id)));
    candidate_paths.push(library_dir.join(format!("{}.enc", id)));
    candidate_paths.push(library_dir.join(format!("{}.epub", id)));
    candidate_paths.push(library_dir.join(format!("{}.pdf", id)));

    println!("[books.rs] library_get_book_file for {}: \n- file_path from DB: {:?}", id, file_path);

    if let Some(ref fp) = file_path {
        let clean = fp.replace("file://", "");
        let p = std::path::PathBuf::from(&clean);
        if p.is_absolute() {
            candidate_paths.push(p);
        } else {
            candidate_paths.push(app_dir.join(&clean));
            candidate_paths.push(library_dir.join(&clean));
        }
    }

    println!("[books.rs] candidate_paths: {:#?}", candidate_paths);

    for path in candidate_paths {
        println!("[books.rs] checking candidate: {:?}", path);
        if path.exists() && path.is_file() {
            println!("[books.rs] -> candidate EXISTS!");
            let is_enc1 = match std::fs::File::open(&path) {
                Ok(mut f) => {
                    use std::io::Read;
                    let mut buf = [0u8; 4];
                    f.read_exact(&mut buf).is_ok() && &buf == b"ENC1"
                }
                Err(_) => false,
            };

            if is_enc1 {
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

                let total_size = crate::crypto_stream::get_encrypted_file_size(&path)?;
                if total_size > 0 {
                    let decrypted = crate::crypto_stream::read_chunked_range(&path, &master_key, 0, total_size - 1)?;
                    return Ok(decrypted.data);
                }
            } else {
                if let Ok(bytes) = std::fs::read(&path) {
                    if !bytes.is_empty() {
                        return Ok(bytes);
                    }
                }
            }
        }
    }

    Err(format!("Book file for ID {} not found on disk", id))
}

/// Evicts a book's local cache file from disk.
#[tauri::command]
pub fn library_evict_book_local_cache(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let file_path: Option<String> = conn
        .query_row(
            "SELECT file_path FROM library_books WHERE id = ?",
            [&id],
            |row| row.get(0),
        )
        .ok();

    let app_dir = crate::get_app_data_dir();
    let library_dir = app_dir.join("library");

    println!("[books.rs] library_evict_book_local_cache for {} \n- app_dir: {:?}\n- library_dir: {:?}", id, app_dir, library_dir);

    // Remove exact files from library directory
    let _ = std::fs::remove_file(library_dir.join(format!("{}.epub.enc", id)));
    let _ = std::fs::remove_file(library_dir.join(format!("{}.pdf.enc", id)));
    let _ = std::fs::remove_file(library_dir.join(format!("{}.enc", id)));
    let _ = std::fs::remove_file(library_dir.join(format!("{}.epub", id)));
    let _ = std::fs::remove_file(library_dir.join(format!("{}.pdf", id)));
    let _ = std::fs::remove_file(library_dir.join(&id));

    println!("[books.rs] Default candidates deletion attempted.");

    if let Some(ref fp) = file_path {
        println!("[books.rs] Evicting file_path from DB: {}", fp);
        let clean = fp.replace("file://", "");
        let p = std::path::PathBuf::from(&clean);
        if p.is_absolute() {
            println!("[books.rs] Attempting absolute paths: {:?} and {}.enc", p, clean);
            let _ = std::fs::remove_file(&p);
            let _ = std::fs::remove_file(format!("{}.enc", clean));
        } else {
            println!("[books.rs] Attempting relative paths against app_dir and library_dir");
            let _ = std::fs::remove_file(app_dir.join(&clean));
            let _ = std::fs::remove_file(app_dir.join(format!("{}.enc", clean)));
            let _ = std::fs::remove_file(library_dir.join(&clean));
            let _ = std::fs::remove_file(library_dir.join(format!("{}.enc", clean)));
        }
    }

    println!("[books.rs] Updating library_books DB to set file_path = '', is_local = 0");
    let _ = conn.execute(
        "UPDATE library_books SET file_path = '', is_local = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [&id],
    );

    Ok(true)
}
