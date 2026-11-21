use crate::cmd_library::types::Book;
use crate::db::{run_blocking, DbState};
use rusqlite::params;
use tauri::State;

/// Retrieves all active (non-deleted) books from the library.
#[tauri::command]
pub async fn library_get_books(db_state: State<'_, DbState>) -> Result<Vec<Book>, String> {
    let state = db_state.inner().clone();
    run_blocking(move || {
        let mut items = {
            let reader = state.acquire_reader()?;
            let mut stmt = reader
                .prepare(
                    "SELECT id, title, author, file_path, drive_file_id, cover_color, cover_image, total_pages, current_page, reading_status, last_read_page, epub_locations, created_at, updated_at, deleted_at, reading_preferences, is_local, original_name, publisher, published_year, language, description, is_archived, archived_at FROM library_books WHERE deleted_at IS NULL",
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
                        publisher: row.get(18).unwrap_or(None),
                        published_year: row.get(19).unwrap_or(None),
                        language: row.get(20).unwrap_or(None),
                        description: row.get(21).unwrap_or(None),
                        is_archived: row.get(22).unwrap_or(Some(false)),
                        archived_at: row.get(23).unwrap_or(None),
                    })
                })
                .map_err(|e| e.to_string())?;

            let mut list = Vec::new();
            for item in iter.flatten() {
                list.push(item);
            }
            list
        };

        // Self-healing: check disk outside any SQLite lock, then batch-update via writer only if needed.
        let needs_check = items.iter().any(|item| {
            item.file_path
                .as_ref()
                .map(|p| p.trim().is_empty())
                .unwrap_or(true)
                || item.is_local != Some(true)
        });

        if needs_check {
            let app_dir = crate::get_app_data_dir();
            let library_dir = app_dir.join("library");
            let existing_library_files: std::collections::HashSet<String> =
                std::fs::read_dir(&library_dir)
                    .ok()
                    .into_iter()
                    .flatten()
                    .filter_map(|entry| entry.ok().and_then(|e| e.file_name().into_string().ok()))
                    .collect();

            let mut heals: Vec<(String, String)> = Vec::new();
            for item in items.iter_mut() {
                let is_missing_path = item
                    .file_path
                    .as_ref()
                    .map(|p| p.trim().is_empty())
                    .unwrap_or(true);
                let is_not_local = item.is_local != Some(true);
                if is_missing_path || is_not_local {
                    let candidates = [
                        format!("{}.epub.enc", item.id),
                        format!("{}.pdf.enc", item.id),
                        format!("{}.enc", item.id),
                        format!("{}.epub", item.id),
                        format!("{}.pdf", item.id),
                    ];
                    for filename in candidates {
                        if existing_library_files.contains(&filename) {
                            let rel_path = format!("library/{}", filename);
                            heals.push((rel_path.clone(), item.id.clone()));
                            item.file_path = Some(rel_path);
                            item.is_local = Some(true);
                            break;
                        }
                    }
                }
            }

            if !heals.is_empty() {
                if let Ok(guard) = state.lock_conn() {
                    if let Some(conn) = guard.as_ref() {
                        for (rel_path, id) in heals {
                            let _ = conn.execute(
                                "UPDATE library_books SET file_path = ?, is_local = 1 WHERE id = ?",
                                params![rel_path, id],
                            );
                        }
                    }
                }
            }
        }

        Ok(items)
    })
    .await
}

/// Inserts a new book entry into the library.
#[tauri::command]
pub async fn library_add_book(book: Book, db_state: State<'_, DbState>) -> Result<Book, String> {
    db_state
        .write(move |conn| {
            let id = if book.id.is_empty() {
                uuid::Uuid::new_v4().to_string()
            } else {
                book.id.clone()
            };

            let is_local_val = book.is_local.unwrap_or(true);
            let is_archived_val = book.is_archived.unwrap_or(false);

            conn.execute(
                "INSERT INTO library_books (id, title, author, file_path, drive_file_id, cover_color, cover_image, total_pages, current_page, reading_status, last_read_page, epub_locations, reading_preferences, is_local, original_name, publisher, published_year, language, description, is_archived, archived_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![id, book.title, book.author, book.file_path, book.drive_file_id, book.cover_color, book.cover_image, book.total_pages, book.current_page, book.reading_status, book.last_read_page, book.epub_locations, book.reading_preferences, is_local_val, book.original_name, book.publisher, book.published_year, book.language, book.description, is_archived_val, book.archived_at]
            ).map_err(|e| e.to_string())?;

            let mut ret = book;
            ret.id = id;
            ret.is_local = Some(is_local_val);
            ret.is_archived = Some(is_archived_val);
            Ok(ret)
        })
        .await
}

/// Updates an existing book metadata and reading progress with safe field merging.
#[tauri::command]
pub async fn library_update_book(book: Book, db_state: State<'_, DbState>) -> Result<i32, String> {
    db_state
        .write(move |conn| {
            let existing: Option<Book> = conn
                .query_row(
                    "SELECT id, title, author, file_path, drive_file_id, cover_color, cover_image, total_pages, current_page, reading_status, last_read_page, epub_locations, created_at, updated_at, deleted_at, reading_preferences, is_local, original_name, publisher, published_year, language, description, is_archived, archived_at FROM library_books WHERE id = ?",
                    [&book.id],
                    |row| {
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
                            is_local: row.get(16)?,
                            original_name: row.get(17)?,
                            publisher: row.get(18)?,
                            published_year: row.get(19)?,
                            language: row.get(20)?,
                            description: row.get(21)?,
                            is_archived: row.get(22).unwrap_or(Some(false)),
                            archived_at: row.get(23).unwrap_or(None),
                        })
                    },
                )
                .ok();

            let final_title = if !book.title.trim().is_empty() {
                book.title
            } else {
                existing.as_ref().map(|e| e.title.clone()).unwrap_or_default()
            };
            let final_author = book
                .author
                .filter(|s| !s.trim().is_empty())
                .or_else(|| existing.as_ref().and_then(|e| e.author.clone()));
            let mut final_file_path = book
                .file_path
                .filter(|s| !s.trim().is_empty())
                .or_else(|| existing.as_ref().and_then(|e| e.file_path.clone()));
            let final_drive_file_id = book
                .drive_file_id
                .filter(|s| !s.trim().is_empty())
                .or_else(|| existing.as_ref().and_then(|e| e.drive_file_id.clone()));
            let final_cover_color = book
                .cover_color
                .or_else(|| existing.as_ref().and_then(|e| e.cover_color.clone()));
            let final_cover_image = book
                .cover_image
                .filter(|s| !s.trim().is_empty())
                .or_else(|| existing.as_ref().and_then(|e| e.cover_image.clone()));
            let final_total_pages = if book.total_pages > 0 {
                book.total_pages
            } else {
                existing.as_ref().map(|e| e.total_pages).unwrap_or(0)
            };
            let final_reading_status = book
                .reading_status
                .filter(|s| !s.trim().is_empty())
                .or_else(|| existing.as_ref().and_then(|e| e.reading_status.clone()));
            let is_reset_to_start = book.current_page == 0
                && (final_reading_status.as_deref() == Some("not_started")
                    || book.last_read_page.as_deref() == Some("0")
                    || book.last_read_page.as_deref() == Some(""));
            let final_current_page = if book.current_page > 0 || is_reset_to_start {
                book.current_page
            } else {
                existing.as_ref().map(|e| e.current_page).unwrap_or(0)
            };
            let final_last_read_page = book
                .last_read_page
                .or_else(|| existing.as_ref().and_then(|e| e.last_read_page.clone()));
            let final_epub_locations = book
                .epub_locations
                .or_else(|| existing.as_ref().and_then(|e| e.epub_locations.clone()));
            let final_reading_preferences = book
                .reading_preferences
                .or_else(|| existing.as_ref().and_then(|e| e.reading_preferences.clone()));
            let final_original_name = book
                .original_name
                .or_else(|| existing.as_ref().and_then(|e| e.original_name.clone()));
            let final_publisher = book
                .publisher
                .or_else(|| existing.as_ref().and_then(|e| e.publisher.clone()));
            let final_published_year = book
                .published_year
                .or_else(|| existing.as_ref().and_then(|e| e.published_year));
            let final_language = book
                .language
                .or_else(|| existing.as_ref().and_then(|e| e.language.clone()));
            let final_description = book
                .description
                .or_else(|| existing.as_ref().and_then(|e| e.description.clone()));
            let final_is_archived = book
                .is_archived
                .or_else(|| existing.as_ref().and_then(|e| e.is_archived));
            let final_archived_at = if final_is_archived == Some(false) {
                None
            } else {
                book.archived_at
                    .or_else(|| existing.as_ref().and_then(|e| e.archived_at.clone()))
            };

            let app_dir = crate::get_app_data_dir();
            if final_file_path
                .as_ref()
                .map(|p| p.trim().is_empty())
                .unwrap_or(true)
            {
                let candidates = [
                    format!("library/{}.epub.enc", book.id),
                    format!("library/{}.pdf.enc", book.id),
                    format!("library/{}.enc", book.id),
                    format!("library/{}.epub", book.id),
                    format!("library/{}.pdf", book.id),
                ];
                for candidate in candidates {
                    if app_dir.join(&candidate).exists() {
                        final_file_path = Some(candidate);
                        break;
                    }
                }
            }

            let is_local_val = book
                .is_local
                .or_else(|| existing.as_ref().and_then(|e| e.is_local))
                .unwrap_or_else(|| {
                    final_file_path
                        .as_ref()
                        .map(|p| !p.trim().is_empty())
                        .unwrap_or(false)
                });

            let now = chrono::Utc::now().to_rfc3339();
            let count = conn.execute(
                "UPDATE library_books SET title = ?, author = ?, file_path = ?, drive_file_id = ?, cover_color = ?, cover_image = ?, total_pages = ?, current_page = ?, reading_status = ?, last_read_page = ?, epub_locations = ?, reading_preferences = ?, is_local = ?, original_name = ?, publisher = ?, published_year = ?, language = ?, description = ?, is_archived = ?, archived_at = ?, updated_at = ? WHERE id = ?",
                params![final_title, final_author, final_file_path, final_drive_file_id, final_cover_color, final_cover_image, final_total_pages, final_current_page, final_reading_status, final_last_read_page, final_epub_locations, final_reading_preferences, is_local_val, final_original_name, final_publisher, final_published_year, final_language, final_description, final_is_archived, final_archived_at, now, book.id]
            ).map_err(|e| e.to_string())?;

            Ok(count as i32)
        })
        .await
}

/// Soft-deletes a book by setting deleted_at timestamp.
#[tauri::command]
pub async fn library_delete_book(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            synapse_core::domain::library::books::soft_delete_book(conn, &id)
                .map_err(|e| e.to_string())
        })
        .await
}

/// Imports and encrypts an external book file (EPUB/PDF) using the library master key off the main thread.
#[tauri::command]
pub async fn library_import_and_encrypt_book(
    source_path: String,
    dest_path: String,
    db_state: State<'_, DbState>,
    _app_handle: tauri::AppHandle,
) -> Result<bool, String> {
    let master_key = {
        let keys_guard = db_state.lock_keys()?;
        if let Some(keys) = keys_guard.as_ref() {
            if let Some(ref k) = keys.library {
                k.clone()
            } else {
                return Err("Library key not found".into());
            }
        } else {
            return Err("Keys not unlocked".into());
        }
    };

    let app_dir = crate::get_app_data_dir();
    let dest_full_path = app_dir.join(&dest_path);

    run_blocking(move || {
        if let Some(parent) = dest_full_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        crate::crypto_stream::encrypt_file_chunked(&source_path, &dest_full_path, &master_key)?;
        Ok(true)
    })
    .await
}

/// Reads the encrypted or raw book file directly from the app data storage off the main thread.
#[tauri::command]
pub async fn library_get_book_file(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<u8>, String> {
    let library_key = db_state.clone_keys()?.and_then(|k| k.library);
    let state = db_state.inner().clone();
    let app_dir = crate::get_app_data_dir();
    let library_dir = app_dir.join("library");

    run_blocking(move || {
        let file_path: Option<String> = {
            let reader = state.acquire_reader()?;
            reader
                .query_row(
                    "SELECT file_path FROM library_books WHERE id = ?",
                    [&id],
                    |row| row.get(0),
                )
                .ok()
        };

        let mut candidate_paths = Vec::with_capacity(8);
        candidate_paths.push(library_dir.join(format!("{}.epub.enc", id)));
        candidate_paths.push(library_dir.join(format!("{}.pdf.enc", id)));
        candidate_paths.push(library_dir.join(format!("{}.enc", id)));
        candidate_paths.push(library_dir.join(format!("{}.epub", id)));
        candidate_paths.push(library_dir.join(format!("{}.pdf", id)));

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

        for path in candidate_paths {
            if path.exists() && path.is_file() {
                let is_enc1 = match std::fs::File::open(&path) {
                    Ok(mut f) => {
                        use std::io::Read;
                        let mut buf = [0u8; 4];
                        f.read_exact(&mut buf).is_ok() && &buf == b"ENC1"
                    }
                    Err(_) => false,
                };

                if is_enc1 {
                    let master_key = library_key
                        .as_ref()
                        .ok_or_else(|| "Library key not unlocked".to_string())?;
                    let total_size = crate::crypto_stream::get_encrypted_file_size(&path)?;
                    if total_size > 0 {
                        let decrypted = crate::crypto_stream::read_chunked_range(
                            &path,
                            master_key,
                            0,
                            total_size - 1,
                        )?;
                        return Ok(decrypted.data);
                    }
                } else if let Ok(bytes) = std::fs::read(&path) {
                    if !bytes.is_empty() {
                        return Ok(bytes);
                    }
                }
            }
        }

        Err(format!("Book file for ID {} not found on disk", id))
    })
    .await
}

/// Evicts a book's local cache file from disk.
#[tauri::command]
pub async fn library_evict_book_local_cache(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let state = db_state.inner().clone();
    run_blocking(move || {
        let file_path: Option<String> = {
            let reader = state.acquire_reader()?;
            reader
                .query_row(
                    "SELECT file_path FROM library_books WHERE id = ?",
                    [&id],
                    |row| row.get(0),
                )
                .ok()
        };

        let app_dir = crate::get_app_data_dir();
        let library_dir = app_dir.join("library");

        let _ = std::fs::remove_file(library_dir.join(format!("{}.epub.enc", id)));
        let _ = std::fs::remove_file(library_dir.join(format!("{}.pdf.enc", id)));
        let _ = std::fs::remove_file(library_dir.join(format!("{}.enc", id)));
        let _ = std::fs::remove_file(library_dir.join(format!("{}.epub", id)));
        let _ = std::fs::remove_file(library_dir.join(format!("{}.pdf", id)));
        let _ = std::fs::remove_file(library_dir.join(&id));

        if let Some(ref fp) = file_path {
            let clean = fp.replace("file://", "");
            let p = std::path::PathBuf::from(&clean);
            if p.is_absolute() {
                let _ = std::fs::remove_file(&p);
                let _ = std::fs::remove_file(format!("{}.enc", clean));
            } else {
                let _ = std::fs::remove_file(app_dir.join(&clean));
                let _ = std::fs::remove_file(app_dir.join(format!("{}.enc", clean)));
                let _ = std::fs::remove_file(library_dir.join(&clean));
                let _ = std::fs::remove_file(library_dir.join(format!("{}.enc", clean)));
            }
        }

        let guard = state.lock_conn()?;
        let conn = guard.as_ref().ok_or("Database not initialized")?;
        let now = chrono::Utc::now().to_rfc3339();
        let _ = conn.execute(
            "UPDATE library_books SET file_path = '', is_local = 0, updated_at = ?1 WHERE id = ?2",
            [&now, &id],
        );

        Ok(true)
    })
    .await
}

/// Retrieves a single active book by its ID.
#[tauri::command]
pub async fn library_get_book(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<Book>, String> {
    let state = db_state.inner().clone();
    run_blocking(move || {
        let book = {
            let reader = state.acquire_reader()?;
            let mut stmt = reader
                .prepare(
                    "SELECT id, title, author, file_path, drive_file_id, cover_color, cover_image, total_pages, current_page, reading_status, last_read_page, epub_locations, created_at, updated_at, deleted_at, reading_preferences, is_local, original_name, publisher, published_year, language, description, is_archived, archived_at FROM library_books WHERE id = ? AND deleted_at IS NULL",
                )
                .map_err(|e| e.to_string())?;

            stmt.query_row([&id], |row| {
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
                    publisher: row.get(18).unwrap_or(None),
                    published_year: row.get(19).unwrap_or(None),
                    language: row.get(20).unwrap_or(None),
                    description: row.get(21).unwrap_or(None),
                    is_archived: row.get(22).unwrap_or(Some(false)),
                    archived_at: row.get(23).unwrap_or(None),
                })
            })
        };

        match book {
            Ok(mut b) => {
                let is_missing_path = b
                    .file_path
                    .as_ref()
                    .map(|p| p.trim().is_empty())
                    .unwrap_or(true);
                let is_not_local = b.is_local != Some(true);
                if is_missing_path || is_not_local {
                    let app_dir = crate::get_app_data_dir();
                    let candidates = [
                        format!("library/{}.epub.enc", b.id),
                        format!("library/{}.pdf.enc", b.id),
                        format!("library/{}.enc", b.id),
                        format!("library/{}.epub", b.id),
                        format!("library/{}.pdf", b.id),
                    ];
                    for candidate in candidates {
                        if app_dir.join(&candidate).exists() {
                            if let Ok(guard) = state.lock_conn() {
                                if let Some(conn) = guard.as_ref() {
                                    let _ = conn.execute(
                                        "UPDATE library_books SET file_path = ?, is_local = 1 WHERE id = ?",
                                        params![candidate, b.id],
                                    );
                                }
                            }
                            b.file_path = Some(candidate);
                            b.is_local = Some(true);
                            break;
                        }
                    }
                }
                Ok(Some(b))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    })
    .await
}
