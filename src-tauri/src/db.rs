use rusqlite::Connection;
use std::sync::Mutex;
use std::path::PathBuf;

pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
    pub keys: Mutex<Option<crate::cmd_auth::UnlockedKeys>>,
}

pub fn init_db(db_path: PathBuf) -> Result<Connection, String> {
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open DB: {}", e))?;
        
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         
         CREATE TABLE IF NOT EXISTS keychain (id TEXT PRIMARY KEY, auth_hash TEXT NOT NULL, library_key_enc TEXT, finance_key_enc TEXT, notes_key_enc TEXT, culture_key_enc TEXT, anki_key_enc TEXT, focus_key_enc TEXT);
         CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         
         CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, title TEXT NOT NULL, original_name TEXT NOT NULL, duration REAL, file_path TEXT);
         CREATE TABLE IF NOT EXISTS lofis (id TEXT PRIMARY KEY, title TEXT NOT NULL, original_name TEXT NOT NULL, duration REAL, file_path TEXT);
         CREATE TABLE IF NOT EXISTS video_words (id TEXT PRIMARY KEY, video_id TEXT NOT NULL, word TEXT NOT NULL, context TEXT, timestamp REAL);
         CREATE TABLE IF NOT EXISTS calendar_events (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, start_date TEXT, end_date TEXT);
         
         CREATE TABLE IF NOT EXISTS library_books (id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT DEFAULT 'Desconhecido', file_path TEXT, drive_file_id TEXT);
         CREATE TABLE IF NOT EXISTS library_collections (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT DEFAULT '#4F46E5', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS library_book_collections (id TEXT UNIQUE, book_id TEXT NOT NULL, collection_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS library_highlights (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, page_number INTEGER NOT NULL, text_content TEXT DEFAULT '', color TEXT DEFAULT 'yellow');
         CREATE TABLE IF NOT EXISTS library_bookmarks (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, page_number INTEGER NOT NULL, label TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS library_ocr_cache (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, page_number INTEGER NOT NULL, text_content TEXT DEFAULT '', word_boxes TEXT DEFAULT '[]');
         CREATE TABLE IF NOT EXISTS library_reading_sessions (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, started_at DATETIME NOT NULL, ended_at DATETIME DEFAULT NULL, pages_read INTEGER DEFAULT 0);
         
         CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, description TEXT NOT NULL, amount REAL NOT NULL, type TEXT NOT NULL, category TEXT NOT NULL, date TEXT NOT NULL, status TEXT DEFAULT 'completed', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS wishlist (id TEXT PRIMARY KEY, title TEXT NOT NULL, price REAL NOT NULL, priority TEXT DEFAULT 'medium', category TEXT DEFAULT 'Geral', expected_date TEXT, estimated_cost REAL NOT NULL DEFAULT 0.0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         
         CREATE TABLE IF NOT EXISTS pages (id TEXT PRIMARY KEY, parent_id TEXT, title TEXT NOT NULL, content TEXT DEFAULT '', icon TEXT DEFAULT 'file', sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS image_cache (id TEXT PRIMARY KEY, data BLOB NOT NULL, mimeType TEXT DEFAULT 'image/png');
         CREATE TABLE IF NOT EXISTS page_history (id TEXT PRIMARY KEY, page_id TEXT NOT NULL, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         
         CREATE TABLE IF NOT EXISTS culture_items (id TEXT PRIMARY KEY, title TEXT NOT NULL, type TEXT NOT NULL, synopsis TEXT, cover_image TEXT, status TEXT DEFAULT 'backlog', progress INTEGER DEFAULT 0, total_episodes INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, myanimelist_id INTEGER, anilist_id INTEGER);
         CREATE TABLE IF NOT EXISTS culture_episodes (id TEXT PRIMARY KEY, item_id TEXT NOT NULL, episode_number INTEGER, title TEXT, synopsis TEXT, is_watched BOOLEAN DEFAULT 0, watched_at DATETIME);
         
         CREATE TABLE IF NOT EXISTS anki_decks (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, color TEXT DEFAULT '#4F46E5', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS anki_cards (id TEXT PRIMARY KEY, deck_id TEXT NOT NULL, front TEXT NOT NULL, back TEXT NOT NULL, extra_note TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS anki_srs_state (card_id TEXT PRIMARY KEY, due_date DATETIME NOT NULL, stability REAL NOT NULL, difficulty REAL NOT NULL, elapsed_days INTEGER DEFAULT 0, reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0, state TEXT DEFAULT 'new', last_review DATETIME);
         CREATE TABLE IF NOT EXISTS anki_reviews (id TEXT PRIMARY KEY, card_id TEXT NOT NULL, rating INTEGER NOT NULL, duration INTEGER DEFAULT 0, review_time DATETIME DEFAULT CURRENT_TIMESTAMP);
         
         CREATE TABLE IF NOT EXISTS focus_sessions (id TEXT PRIMARY KEY, start_time DATETIME NOT NULL, end_time DATETIME NOT NULL, duration INTEGER NOT NULL, task_name TEXT, category TEXT);
         CREATE TABLE IF NOT EXISTS alarms (id INTEGER PRIMARY KEY AUTOINCREMENT, time TEXT NOT NULL, label TEXT, is_active BOOLEAN DEFAULT 1, days TEXT);
         "
    ).map_err(|e| format!("Failed to set PRAGMAs and schemas: {}", e))?;
    
    Ok(conn)
}
