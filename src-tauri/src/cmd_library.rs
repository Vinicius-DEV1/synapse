use tauri::State;
use serde::{Deserialize, Serialize};
use crate::db::DbState;
use rusqlite::params;

#[derive(Serialize, Deserialize)]
pub struct Book {
    pub id: String,
    pub title: String,
    pub author: Option<String>,
    pub file_path: Option<String>,
    pub drive_file_id: Option<String>,
    pub cover_color: Option<String>,
    pub cover_image: Option<String>,
    pub total_pages: i32,
    pub current_page: i32,
    pub is_completed: i32,
    pub rating: i32,
    pub summary: Option<String>,
    pub is_paused: i32,
}

#[derive(Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
}

#[tauri::command]
pub fn library_get_books(db_state: State<'_, DbState>) -> Result<Vec<Book>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT id, title, author, file_path, drive_file_id, cover_color, cover_image, total_pages, current_page, is_completed, rating, summary, is_paused FROM library_books WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt.query_map([], |row| {
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
            is_completed: row.get(9)?,
            rating: row.get(10)?,
            summary: row.get(11)?,
            is_paused: row.get::<_, Option<i32>>(12)?.unwrap_or(0),
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i { items.push(item); }
    }
    Ok(items)
}

#[tauri::command]
pub fn library_add_book(book: Book, db_state: State<'_, DbState>) -> Result<Book, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let id = if book.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { book.id.clone() };
    
    conn.execute(
        "INSERT INTO library_books (id, title, author, file_path, drive_file_id, cover_color, cover_image, total_pages, current_page, is_completed, rating, summary, is_paused) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, book.title, book.author, book.file_path, book.drive_file_id, book.cover_color, book.cover_image, book.total_pages, book.current_page, book.is_completed, book.rating, book.summary, book.is_paused]
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
        "UPDATE library_books SET title = ?, author = ?, file_path = ?, drive_file_id = ?, cover_color = ?, cover_image = ?, total_pages = ?, current_page = ?, is_completed = ?, rating = ?, summary = ?, is_paused = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![book.title, book.author, book.file_path, book.drive_file_id, book.cover_color, book.cover_image, book.total_pages, book.current_page, book.is_completed, book.rating, book.summary, book.is_paused, book.id]
    ).map_err(|e| e.to_string())?;
        
    Ok(count as i32)
}

#[tauri::command]
pub fn library_delete_book(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute("UPDATE library_books SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
        
    Ok(true)
}

#[tauri::command]
pub fn library_get_collections(db_state: State<'_, DbState>) -> Result<Vec<Collection>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT id, name, color FROM library_collections WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt.query_map([], |row| {
        Ok(Collection {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i { items.push(item); }
    }
    Ok(items)
}

#[tauri::command]
pub fn library_add_collection(collection: Collection, db_state: State<'_, DbState>) -> Result<Collection, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let id = if collection.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { collection.id.clone() };
    
    conn.execute(
        "INSERT INTO library_collections (id, name, color) VALUES (?, ?, ?)",
        params![id, collection.name, collection.color]
    ).map_err(|e| e.to_string())?;
    
    let mut ret = collection;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn library_update_collection(collection: Collection, db_state: State<'_, DbState>) -> Result<i32, String> {
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
    
    conn.execute("UPDATE library_collections SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
        
    Ok(true)
}

#[tauri::command]
pub fn library_add_book_to_collection(book_id: String, collection_id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
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
pub fn library_remove_book_from_collection(book_id: String, collection_id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute(
        "DELETE FROM library_book_collections WHERE book_id = ? AND collection_id = ?",
        params![book_id, collection_id]
    ).map_err(|e| e.to_string())?;
    
    Ok(true)
}
