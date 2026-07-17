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
         
         CREATE TABLE IF NOT EXISTS keychain (id TEXT PRIMARY KEY, auth_hash TEXT NOT NULL, library_key_enc TEXT, finance_key_enc TEXT, notes_key_enc TEXT, culture_key_enc TEXT, anki_key_enc TEXT, focus_key_enc TEXT, files_key_enc TEXT, vault_key_enc TEXT);
         CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         
         CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, title TEXT NOT NULL, original_name TEXT NOT NULL, duration REAL, file_path TEXT);
         CREATE TABLE IF NOT EXISTS lofis (id TEXT PRIMARY KEY, title TEXT NOT NULL, original_name TEXT NOT NULL, duration REAL, file_path TEXT);
         CREATE TABLE IF NOT EXISTS video_words (id TEXT PRIMARY KEY, video_id TEXT NOT NULL, word TEXT NOT NULL, context TEXT, timestamp REAL);
         CREATE TABLE IF NOT EXISTS calendar_events (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, start_date TEXT, end_date TEXT);
         
         CREATE TABLE IF NOT EXISTS library_books (id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT DEFAULT 'Desconhecido', file_path TEXT, drive_file_id TEXT);
         CREATE TABLE IF NOT EXISTS library_collections (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT DEFAULT '#4F46E5', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS library_book_collections (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, collection_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
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
         CREATE TABLE IF NOT EXISTS anki_srs_state (id TEXT PRIMARY KEY, due_date DATETIME NOT NULL, stability REAL NOT NULL, difficulty REAL NOT NULL, elapsed_days INTEGER DEFAULT 0, reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0, state TEXT DEFAULT 'new', last_review DATETIME);
         CREATE TABLE IF NOT EXISTS anki_reviews (id TEXT PRIMARY KEY, card_id TEXT NOT NULL, rating INTEGER NOT NULL, duration INTEGER DEFAULT 0, review_time DATETIME DEFAULT CURRENT_TIMESTAMP);
         
         CREATE TABLE IF NOT EXISTS focus_sessions (id TEXT PRIMARY KEY, tag TEXT NOT NULL, description TEXT NOT NULL, target_time_minutes INTEGER NOT NULL, status TEXT NOT NULL, justification TEXT, summary TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS alarms (id TEXT PRIMARY KEY, time TEXT NOT NULL, label TEXT, sound TEXT DEFAULT 'bell', enabled BOOLEAN DEFAULT 1, days TEXT);
         
         CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT NOT NULL, file_type TEXT NOT NULL, file_size INTEGER DEFAULT 0, local_path TEXT, drive_file_id TEXT, folder_id TEXT, mime_type TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS file_folders (id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT, color TEXT DEFAULT '#6366f1', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS file_page_links (id TEXT PRIMARY KEY, file_id TEXT NOT NULL, page_id TEXT NOT NULL, link_type TEXT DEFAULT 'upload', widget_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS vault_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, color TEXT, position INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT);
         CREATE TABLE IF NOT EXISTS vault_items (id TEXT PRIMARY KEY, group_id TEXT, label TEXT NOT NULL, username TEXT, email TEXT, password TEXT, url TEXT, notes TEXT, custom_fields TEXT, is_favorite INTEGER DEFAULT 0, password_changed_at TEXT, password_strength INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT);
         CREATE TABLE IF NOT EXISTS vault_password_history (id TEXT PRIMARY KEY, item_id TEXT NOT NULL, password TEXT NOT NULL, changed_at TEXT NOT NULL, deleted_at TEXT);
         
         CREATE TABLE IF NOT EXISTS tutor_sessions (id TEXT PRIMARY KEY, title TEXT NOT NULL, started_at DATETIME NOT NULL, ended_at DATETIME, custom_prompt TEXT, deleted_at DATETIME);
         CREATE TABLE IF NOT EXISTS tutor_messages (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, role TEXT NOT NULL, text_content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS tutor_memories (id TEXT PRIMARY KEY, category TEXT NOT NULL, fact TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         "
    ).map_err(|e| format!("Failed to set PRAGMAs and schemas: {}", e))?;
    
    // Migrations for existing databases
    let _ = conn.execute("ALTER TABLE keychain ADD COLUMN files_key_enc TEXT", []);
    let _ = conn.execute("ALTER TABLE keychain ADD COLUMN vault_key_enc TEXT", []);
    
    let _ = conn.execute("ALTER TABLE pages ADD COLUMN crdt_state TEXT", []);
    let _ = conn.execute("ALTER TABLE pages ADD COLUMN encrypted_content TEXT", []);
    let _ = conn.execute("ALTER TABLE pages ADD COLUMN is_pinned INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE pages ADD COLUMN pinned_order REAL DEFAULT 0.0", []);
    let _ = conn.execute("ALTER TABLE pages ADD COLUMN is_locked INTEGER DEFAULT 0", []);
    
    let _ = conn.execute("ALTER TABLE tutor_sessions ADD COLUMN custom_prompt TEXT", []);
    
    // Drop old focus_sessions if it has the old schema (text id)
    let _ = conn.execute("DROP TABLE IF EXISTS sessions", []);
    let _ = conn.execute("ALTER TABLE keychain ADD COLUMN vault_key_enc TEXT", []);
    
    // Auto-migrate tables to have sync columns
    let tables_with_sync = vec![
        "videos", "lofis", "video_words", "calendar_events", "culture_items", "culture_episodes",
        "anki_decks", "anki_cards", "anki_srs_state", "anki_reviews", "focus_sessions", "alarms",
        "page_history", "tutor_sessions", "tutor_messages", "tutor_memories", "library_books", "library_highlights",
        "library_bookmarks", "library_collections", "library_book_collections", "library_reading_sessions",
        "transactions", "wishlist", "pages", "vault_password_history", "file_page_links"
    ];
    for t in tables_with_sync {
        let _ = conn.execute(&format!("ALTER TABLE {} ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", t), []);
        let _ = conn.execute(&format!("ALTER TABLE {} ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", t), []);
        let _ = conn.execute(&format!("ALTER TABLE {} ADD COLUMN deleted_at DATETIME DEFAULT NULL", t), []);
    }
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN drive_file_id TEXT", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN is_local INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE lofis ADD COLUMN drive_file_id TEXT", []);
    let _ = conn.execute("ALTER TABLE lofis ADD COLUMN is_local INTEGER DEFAULT 0", []);

    let _ = conn.execute("CREATE TABLE IF NOT EXISTS focus_sessions (id TEXT PRIMARY KEY, tag TEXT NOT NULL, description TEXT NOT NULL, target_time_minutes INTEGER NOT NULL, status TEXT NOT NULL, justification TEXT, summary TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)", []);

    let _ = conn.execute("CREATE TABLE IF NOT EXISTS alarms (id TEXT PRIMARY KEY, time TEXT NOT NULL, label TEXT, sound TEXT DEFAULT 'bell', enabled BOOLEAN DEFAULT 1, days TEXT)", []);
    
    // Migrations for culture module
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN access_link TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN total_progress INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN is_goal INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN goal_note TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN api_id TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN api_source TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN last_sync_at TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN volumes INTEGER", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN chapters INTEGER", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN episodes_count INTEGER", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN deleted_at DATETIME DEFAULT NULL", []);

    let _ = conn.execute("ALTER TABLE culture_episodes ADD COLUMN season_number INTEGER", []);
    let _ = conn.execute("ALTER TABLE culture_episodes ADD COLUMN episode_in_season INTEGER", []);
    let _ = conn.execute("ALTER TABLE culture_episodes ADD COLUMN aired_at TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_episodes ADD COLUMN updated_at TEXT", []);
    
    Ok(conn)
}
