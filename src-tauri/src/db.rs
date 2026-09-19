use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
    pub keys: Mutex<Option<crate::cmd_auth::UnlockedKeys>>,
}

pub fn init_db(db_path: PathBuf) -> Result<Connection, String> {
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;
         
         CREATE TABLE IF NOT EXISTS keychain (id TEXT PRIMARY KEY, auth_hash TEXT NOT NULL, library_key_enc TEXT, finance_key_enc TEXT, notes_key_enc TEXT, culture_key_enc TEXT, anki_key_enc TEXT, focus_key_enc TEXT, files_key_enc TEXT, vault_key_enc TEXT, calendar_key_enc TEXT, practice_key_enc TEXT, core_key_enc TEXT);
         CREATE TABLE IF NOT EXISTS config (id TEXT PRIMARY KEY, data TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, value TEXT);
         
         CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, title TEXT NOT NULL, original_name TEXT NOT NULL, duration REAL, file_path TEXT, progress REAL DEFAULT 0.0, last_watched_at DATETIME, drive_file_id TEXT, drive_web_file_id TEXT, drive_subtitle_id TEXT, local_subtitle_path TEXT, subtitles_json TEXT, audio_tracks_json TEXT, is_local INTEGER DEFAULT 1, collection_id TEXT, collection_name TEXT, youtube_url TEXT, youtube_description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS lofis (id TEXT PRIMARY KEY, title TEXT NOT NULL, original_name TEXT NOT NULL, duration REAL, file_path TEXT);
         CREATE TABLE IF NOT EXISTS video_words (id TEXT PRIMARY KEY, video_id TEXT NOT NULL, word TEXT NOT NULL, context TEXT, timestamp REAL);
         CREATE TABLE IF NOT EXISTS calendar_events (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, start_date TEXT, end_date TEXT, type TEXT DEFAULT 'event', type_ TEXT DEFAULT 'event', status TEXT DEFAULT 'pending', color TEXT DEFAULT '#3b82f6', deleted_at DATETIME DEFAULT NULL, page_id TEXT, reminders TEXT DEFAULT '[]', notified_reminders TEXT DEFAULT '[]', recurrence_rule TEXT, reminder_minutes INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         
         CREATE TABLE IF NOT EXISTS library_books (id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT DEFAULT 'Desconhecido', file_path TEXT, drive_file_id TEXT, cover_color TEXT, cover_image TEXT, collections TEXT DEFAULT '[]', total_pages INTEGER DEFAULT 0, current_page INTEGER DEFAULT 0, reading_status TEXT DEFAULT 'unread', last_read_page TEXT, epub_locations TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME, reading_preferences TEXT, language TEXT, last_read_at DATETIME, original_name TEXT, published_year INTEGER, publisher TEXT, is_local BOOLEAN DEFAULT 1);
         CREATE TABLE IF NOT EXISTS library_collections (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT DEFAULT '#4F46E5', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS library_book_collections (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, collection_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS library_highlights (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, page_number INTEGER NOT NULL, text_content TEXT DEFAULT '', color TEXT DEFAULT 'yellow', rects TEXT, highlight_type TEXT, note TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS library_bookmarks (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, page_number INTEGER NOT NULL, label TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS library_ocr_cache (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, page_number INTEGER NOT NULL, text_content TEXT DEFAULT '', word_boxes TEXT DEFAULT '[]');
         CREATE TABLE IF NOT EXISTS library_reading_sessions (id TEXT PRIMARY KEY, book_id TEXT NOT NULL, started_at DATETIME NOT NULL, ended_at DATETIME DEFAULT NULL, pages_read INTEGER DEFAULT 0, start_page INTEGER DEFAULT 0, end_page INTEGER DEFAULT 0);
         
         CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, description TEXT NOT NULL, amount REAL NOT NULL, expected_amount REAL, type TEXT NOT NULL, category TEXT NOT NULL, date TEXT NOT NULL, status TEXT DEFAULT 'completed', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL, is_paid INTEGER DEFAULT 1, is_recurring INTEGER DEFAULT 0, recurrence_period TEXT, recurrence_end_date TEXT, paid_amount REAL, due_date TEXT, account_id TEXT, destination_account_id TEXT, linked_loan_id TEXT);
         CREATE TABLE IF NOT EXISTS wishlist (id TEXT PRIMARY KEY, title TEXT NOT NULL, price REAL NOT NULL, priority TEXT DEFAULT 'medium', category TEXT DEFAULT 'Geral', expected_date TEXT, estimated_cost REAL NOT NULL DEFAULT 0.0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL, description TEXT, link TEXT, updated_at DATETIME);
         CREATE TABLE IF NOT EXISTS finance_accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT DEFAULT '#10b981', icon TEXT DEFAULT 'wallet', initial_balance REAL DEFAULT 0.0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         
         CREATE TABLE IF NOT EXISTS pages (id TEXT PRIMARY KEY, parent_id TEXT, title TEXT NOT NULL, content TEXT DEFAULT '', icon TEXT DEFAULT 'file', sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL, cover_image TEXT, description TEXT, password_salt TEXT, crdt_state TEXT, encrypted_content TEXT, is_pinned INTEGER DEFAULT 0, pinned_order REAL DEFAULT 0.0, is_locked INTEGER DEFAULT 0);
         CREATE TABLE IF NOT EXISTS image_cache (id TEXT PRIMARY KEY, data BLOB NOT NULL, mimeType TEXT DEFAULT 'image/png');
         CREATE TABLE IF NOT EXISTS page_history (id TEXT PRIMARY KEY, page_id TEXT NOT NULL, content TEXT NOT NULL, encrypted_content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         
         CREATE TABLE IF NOT EXISTS culture_items (id TEXT PRIMARY KEY, title TEXT NOT NULL, type TEXT NOT NULL, synopsis TEXT, cover_image TEXT, status TEXT DEFAULT 'backlog', progress INTEGER DEFAULT 0, total_episodes INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, myanimelist_id INTEGER, anilist_id INTEGER, access_link TEXT, total_progress INTEGER DEFAULT 0, is_goal BOOLEAN DEFAULT 0, goal_note TEXT, api_id TEXT, api_source TEXT, last_sync_at DATETIME, volumes INTEGER, chapters INTEGER, episodes_count INTEGER);
         CREATE TABLE IF NOT EXISTS culture_episodes (id TEXT PRIMARY KEY, item_id TEXT NOT NULL, episode_number INTEGER, title TEXT, synopsis TEXT, is_watched BOOLEAN DEFAULT 0, watched_at DATETIME, season_number INTEGER, episode_in_season INTEGER, aired_at DATETIME, updated_at DATETIME);
         
         CREATE TABLE IF NOT EXISTS anki_decks (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, parent_id TEXT, color TEXT DEFAULT '#4F46E5', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS anki_cards (id TEXT PRIMARY KEY, deck_id TEXT NOT NULL, front TEXT NOT NULL, back TEXT NOT NULL, extra_note TEXT, tags TEXT DEFAULT '[]', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, card_type TEXT, validation_mode TEXT, media_url TEXT, source_module TEXT, source_id TEXT, updated_at DATETIME, deleted_at DATETIME);
         CREATE TABLE IF NOT EXISTS anki_srs_state (id TEXT PRIMARY KEY, due_date DATETIME NOT NULL, stability REAL NOT NULL, difficulty REAL NOT NULL, elapsed_days INTEGER DEFAULT 0, reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0, state TEXT DEFAULT 'new', last_review DATETIME, scheduled_days INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS anki_reviews (id TEXT PRIMARY KEY, card_id TEXT NOT NULL, rating INTEGER NOT NULL, duration INTEGER DEFAULT 0, review_time DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS anki_notes (id TEXT PRIMARY KEY, deck_id TEXT NOT NULL, front TEXT NOT NULL, back TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS anki_deck_settings (id TEXT PRIMARY KEY, deck_id TEXT NOT NULL, new_limit INTEGER DEFAULT 20, review_limit INTEGER DEFAULT 100, learning_steps TEXT, relearning_steps TEXT, fsrs_weights TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         
         CREATE TABLE IF NOT EXISTS focus_sessions (id TEXT PRIMARY KEY, tag TEXT NOT NULL, description TEXT NOT NULL, target_time_minutes INTEGER NOT NULL, status TEXT NOT NULL, justification TEXT, summary TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS alarms (id TEXT PRIMARY KEY, time TEXT NOT NULL, label TEXT, sound TEXT DEFAULT 'bell', enabled BOOLEAN DEFAULT 1, days TEXT);
         CREATE TABLE IF NOT EXISTS activity_logs (id TEXT PRIMARY KEY, module TEXT NOT NULL, item_id TEXT NOT NULL, item_title TEXT NOT NULL, date TEXT NOT NULL, duration_seconds INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         
         CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT NOT NULL, file_type TEXT NOT NULL, file_size INTEGER DEFAULT 0, local_path TEXT, drive_file_id TEXT, folder_id TEXT, mime_type TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS file_folders (id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT, color TEXT DEFAULT '#6366f1', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS file_page_links (id TEXT PRIMARY KEY, file_id TEXT NOT NULL, page_id TEXT NOT NULL, link_type TEXT DEFAULT 'upload', widget_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS vault_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, color TEXT, position INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT);
         CREATE TABLE IF NOT EXISTS vault_items (id TEXT PRIMARY KEY, group_id TEXT, label TEXT NOT NULL, username TEXT, email TEXT, password TEXT, url TEXT, notes TEXT, custom_fields TEXT, is_favorite INTEGER DEFAULT 0, password_changed_at TEXT, password_strength INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, position INTEGER DEFAULT 0);
         CREATE TABLE IF NOT EXISTS vault_password_history (id TEXT PRIMARY KEY, item_id TEXT NOT NULL, password TEXT NOT NULL, changed_at TEXT NOT NULL, deleted_at TEXT);
         
         CREATE TABLE IF NOT EXISTS tutor_sessions (id TEXT PRIMARY KEY, title TEXT NOT NULL, started_at DATETIME NOT NULL, ended_at DATETIME, custom_prompt TEXT, deleted_at DATETIME);
         CREATE TABLE IF NOT EXISTS tutor_messages (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, role TEXT NOT NULL, text_content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS tutor_memories (id TEXT PRIMARY KEY, category TEXT NOT NULL, fact TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
         CREATE TABLE IF NOT EXISTS youtube_watched (id TEXT PRIMARY KEY, video_id TEXT NOT NULL, title TEXT, channel_name TEXT);
         CREATE TABLE IF NOT EXISTS diagrams (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT DEFAULT '', encrypted_content TEXT, icon TEXT DEFAULT '🎨', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL);
         CREATE TABLE IF NOT EXISTS notifications (
             id TEXT PRIMARY KEY,
             title TEXT NOT NULL,
             message TEXT NOT NULL,
             type TEXT NOT NULL,
             target_page_id TEXT,
             event_id TEXT,
             scheduled_for TEXT,
             fired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             is_read BOOLEAN DEFAULT 0,
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             deleted_at DATETIME DEFAULT NULL
         );
         
         CREATE TABLE IF NOT EXISTS quiz_batteries (
             id TEXT PRIMARY KEY,
             page_id TEXT,
             title TEXT NOT NULL,
             description TEXT,
             layout TEXT DEFAULT 'sequential',
             tags TEXT DEFAULT '[]',
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             deleted_at DATETIME DEFAULT NULL
         );
         CREATE TABLE IF NOT EXISTS quiz_questions (
             id TEXT PRIMARY KEY,
             battery_id TEXT NOT NULL,
             type TEXT DEFAULT 'multiple_choice',
             question TEXT NOT NULL,
             options TEXT DEFAULT '[]',
             correct_index INTEGER DEFAULT 0,
             expected_answer TEXT,
             explanation TEXT,
             tags TEXT DEFAULT '[]',
             sort_order INTEGER DEFAULT 0,
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             deleted_at DATETIME DEFAULT NULL
         );
         CREATE TABLE IF NOT EXISTS quiz_attempts (
             id TEXT PRIMARY KEY,
             question_id TEXT NOT NULL,
             battery_id TEXT NOT NULL,
             type TEXT DEFAULT 'multiple_choice',
             selected_index INTEGER,
             user_typed_answer TEXT,
             is_correct BOOLEAN,
             ai_feedback TEXT,
             duration_ms INTEGER DEFAULT 0,
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP
         );
         CREATE TABLE IF NOT EXISTS quiz_page_links (
             id TEXT PRIMARY KEY,
             battery_id TEXT NOT NULL,
             page_id TEXT NOT NULL,
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             deleted_at DATETIME DEFAULT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_quiz_batteries_page ON quiz_batteries(page_id);
         CREATE INDEX IF NOT EXISTS idx_quiz_batteries_deleted ON quiz_batteries(deleted_at);
         CREATE INDEX IF NOT EXISTS idx_quiz_questions_battery ON quiz_questions(battery_id, sort_order);
         CREATE INDEX IF NOT EXISTS idx_quiz_attempts_question ON quiz_attempts(question_id);
         CREATE INDEX IF NOT EXISTS idx_quiz_attempts_battery ON quiz_attempts(battery_id);
         CREATE INDEX IF NOT EXISTS idx_quiz_page_links_battery ON quiz_page_links(battery_id);
         CREATE INDEX IF NOT EXISTS idx_quiz_page_links_page ON quiz_page_links(page_id);
         
         CREATE TABLE IF NOT EXISTS youtube_summaries (
             id TEXT PRIMARY KEY,
             video_id TEXT UNIQUE NOT NULL,
             title TEXT,
             channel_name TEXT,
             summary TEXT NOT NULL,
             raw_transcript TEXT,
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
         );
         CREATE INDEX IF NOT EXISTS idx_youtube_summaries_video_id ON youtube_summaries(video_id);
         CREATE TABLE IF NOT EXISTS link_metadata_cache (
             url TEXT PRIMARY KEY,
             title TEXT,
             channel TEXT,
             duration REAL,
             is_playlist INTEGER DEFAULT 0,
             playlist_count INTEGER,
             upload_date TEXT,
             image_url TEXT,
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             deleted_at DATETIME DEFAULT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_link_metadata_cache_updated ON link_metadata_cache(updated_at);
         "
    ).map_err(|e| format!("Failed to set PRAGMAs and schemas: {}", e))?;

    // Migrations for existing databases
    let _ = conn.execute(
        "CREATE TABLE IF NOT EXISTS youtube_summaries (
            id TEXT PRIMARY KEY,
            video_id TEXT UNIQUE NOT NULL,
            title TEXT,
            channel_name TEXT,
            summary TEXT NOT NULL,
            raw_transcript TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    );
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_youtube_summaries_video_id ON youtube_summaries(video_id)", []);
    let _ = conn.execute(
        "CREATE TABLE IF NOT EXISTS link_metadata_cache (
            url TEXT PRIMARY KEY,
            title TEXT,
            channel TEXT,
            duration REAL,
            is_playlist INTEGER DEFAULT 0,
            playlist_count INTEGER,
            upload_date TEXT,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME DEFAULT NULL
        )",
        [],
    );
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_link_metadata_cache_updated ON link_metadata_cache(updated_at)", []);
    let _ = conn.execute("ALTER TABLE keychain ADD COLUMN files_key_enc TEXT", []);
    let _ = conn.execute("ALTER TABLE keychain ADD COLUMN vault_key_enc TEXT", []);
    let _ = conn.execute("ALTER TABLE keychain ADD COLUMN calendar_key_enc TEXT", []);
    let _ = conn.execute("ALTER TABLE keychain ADD COLUMN practice_key_enc TEXT", []);
    let _ = conn.execute("ALTER TABLE keychain ADD COLUMN core_key_enc TEXT", []);

    let _ = conn.execute("ALTER TABLE pages ADD COLUMN crdt_state TEXT", []);
    let _ = conn.execute("ALTER TABLE pages ADD COLUMN encrypted_content TEXT", []);
    let _ = conn.execute("ALTER TABLE calendar_events ADD COLUMN page_id TEXT", []);

    // Dynamic column migrations for legacy schemas updated via web/sync
    let _ = conn.execute("ALTER TABLE config ADD COLUMN created_at DATETIME", []);
    let _ = conn.execute("ALTER TABLE config ADD COLUMN value TEXT", []);
    let _ = conn.execute("ALTER TABLE config ADD COLUMN data TEXT", []);

    let _ = conn.execute("ALTER TABLE pages ADD COLUMN cover_image TEXT", []);
    let _ = conn.execute("ALTER TABLE pages ADD COLUMN description TEXT", []);
    let _ = conn.execute("ALTER TABLE pages ADD COLUMN password_salt TEXT", []);

    let _ = conn.execute("ALTER TABLE wishlist ADD COLUMN description TEXT", []);
    let _ = conn.execute("ALTER TABLE wishlist ADD COLUMN link TEXT", []);

    let _ = conn.execute("ALTER TABLE library_books ADD COLUMN cover_color TEXT", []);
    let _ = conn.execute("ALTER TABLE library_books ADD COLUMN cover_image TEXT", []);
    let _ = conn.execute("ALTER TABLE library_books ADD COLUMN language TEXT", []);
    let _ = conn.execute("ALTER TABLE library_books ADD COLUMN is_local BOOLEAN DEFAULT 1", []);

    let _ = conn.execute("ALTER TABLE videos ADD COLUMN drive_file_id TEXT", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN drive_web_file_id TEXT", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN drive_subtitle_id TEXT", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN local_subtitle_path TEXT", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN subtitles_json TEXT", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN audio_tracks_json TEXT", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN collection_id TEXT", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN collection_name TEXT", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN youtube_url TEXT", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN youtube_description TEXT", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN created_at DATETIME", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN updated_at DATETIME", []);

    // Dynamic table migrations for new subsystems
    let _ = conn.execute("ALTER TABLE transactions ADD COLUMN paid_amount REAL", []);
    let _ = conn.execute("ALTER TABLE transactions ADD COLUMN due_date TEXT", []);
    let _ = conn.execute("ALTER TABLE wishlist ADD COLUMN updated_at DATETIME", []);
    let _ = conn.execute("ALTER TABLE library_books ADD COLUMN publisher TEXT", []);

    let _ = conn.execute("ALTER TABLE library_highlights ADD COLUMN rects TEXT", []);
    let _ = conn.execute("ALTER TABLE library_highlights ADD COLUMN note TEXT", []);

    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN access_link TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN goal_note TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN api_id TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN api_source TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN volumes INTEGER", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN chapters INTEGER", []);

    let _ = conn.execute("ALTER TABLE anki_cards ADD COLUMN card_type TEXT", []);
    let _ = conn.execute("ALTER TABLE anki_cards ADD COLUMN validation_mode TEXT", []);
    let _ = conn.execute("ALTER TABLE anki_cards ADD COLUMN media_url TEXT", []);
    let _ = conn.execute("ALTER TABLE anki_cards ADD COLUMN source_module TEXT", []);
    let _ = conn.execute("ALTER TABLE anki_cards ADD COLUMN source_id TEXT", []);
    let _ = conn.execute("ALTER TABLE anki_cards ADD COLUMN updated_at DATETIME", []);
    let _ = conn.execute("ALTER TABLE anki_cards ADD COLUMN deleted_at DATETIME", []);

    // Drop old focus_sessions if it has the old schema (text id)
    let _ = conn.execute("DROP TABLE IF EXISTS sessions", []);
    let _ = conn.execute("ALTER TABLE keychain ADD COLUMN vault_key_enc TEXT", []);

    // Auto-migrate tables to have sync columns
    let tables_with_sync = vec![
        "videos",
        "lofis",
        "video_words",
        "calendar_events",
        "culture_items",
        "culture_episodes",
        "anki_decks",
        "anki_notes",
        "anki_cards",
        "anki_srs_state",
        "anki_reviews",
        "anki_deck_settings",
        "focus_sessions",
        "alarms",
        "page_history",
        "tutor_sessions",
        "tutor_messages",
        "tutor_memories",
        "library_books",
        "library_highlights",
        "library_bookmarks",
        "library_collections",
        "library_book_collections",
        "library_reading_sessions",
        "transactions",
        "wishlist",
        "pages",
        "vault_groups",
        "vault_items",
        "vault_password_history",
        "files",
        "file_folders",
        "file_page_links",
        "youtube_watched",
        "diagrams",
        "notifications",
        "activity_logs",
        "ai_prompts",
    ];
    for t in tables_with_sync {
        let _ = conn.execute(
            &format!(
                "ALTER TABLE {} ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
                t
            ),
            [],
        );
        let _ = conn.execute(
            &format!(
                "ALTER TABLE {} ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP",
                t
            ),
            [],
        );
        let _ = conn.execute(
            &format!(
                "ALTER TABLE {} ADD COLUMN deleted_at DATETIME DEFAULT NULL",
                t
            ),
            [],
        );
    }
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN drive_file_id TEXT", []);
    let _ = conn.execute("ALTER TABLE videos ADD COLUMN last_watched_at DATETIME", []);
    let _ = conn.execute("ALTER TABLE lofis ADD COLUMN drive_file_id TEXT", []);

    // Migration for anki_decks parent_id
    let _ = conn.execute("ALTER TABLE anki_decks ADD COLUMN parent_id TEXT", []);

    // Migration for page_history
    let _ = conn.execute("ALTER TABLE page_history ADD COLUMN encrypted_content TEXT", []);

    // Migration for anki tags
    let _ = conn.execute("ALTER TABLE anki_cards ADD COLUMN tags TEXT DEFAULT '[]'", []);

    let _ = conn.execute("CREATE TABLE IF NOT EXISTS focus_sessions (id TEXT PRIMARY KEY, tag TEXT NOT NULL, description TEXT NOT NULL, target_time_minutes INTEGER NOT NULL, status TEXT NOT NULL, justification TEXT, summary TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)", []);

    let _ = conn.execute("CREATE TABLE IF NOT EXISTS alarms (id TEXT PRIMARY KEY, time TEXT NOT NULL, label TEXT, sound TEXT DEFAULT 'bell', enabled BOOLEAN DEFAULT 1, days TEXT)", []);

    // Create ai_prompts table
    let _ = conn.execute("CREATE TABLE IF NOT EXISTS ai_prompts (id TEXT PRIMARY KEY, module TEXT NOT NULL, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL)", []);

    // Migrations for culture module
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN access_link TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN goal_note TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN api_id TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN api_source TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN last_sync_at TEXT", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN volumes INTEGER", []);
    let _ = conn.execute("ALTER TABLE culture_items ADD COLUMN chapters INTEGER", []);
    let _ = conn.execute("ALTER TABLE culture_episodes ADD COLUMN aired_at TEXT", []);

    // Migrations for Anki FSRS and Sync
    let _ = conn.execute("CREATE TABLE IF NOT EXISTS anki_deck_settings (id TEXT PRIMARY KEY, deck_id TEXT NOT NULL, new_limit INTEGER DEFAULT 20, review_limit INTEGER DEFAULT 200, learning_steps TEXT DEFAULT '1m,10m', relearning_steps TEXT DEFAULT '1m,10m', fsrs_weights TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL)", []);
    let _ = conn.execute("ALTER TABLE anki_cards ADD COLUMN source_module TEXT", []);
    let _ = conn.execute("ALTER TABLE anki_cards ADD COLUMN source_id TEXT", []);
    let _ = conn.execute("ALTER TABLE anki_cards ADD COLUMN media_url TEXT", []);

    // Migrations for Finance Accounts and Multi-Account Support
    let _ = conn.execute("CREATE TABLE IF NOT EXISTS finance_accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT DEFAULT '#10b981', icon TEXT DEFAULT 'wallet', initial_balance REAL DEFAULT 0.0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME DEFAULT NULL)", []);
    let _ = conn.execute("ALTER TABLE transactions ADD COLUMN due_date TEXT", []);
    let _ = conn.execute("ALTER TABLE transactions ADD COLUMN account_id TEXT", []);
    let _ = conn.execute("ALTER TABLE transactions ADD COLUMN destination_account_id TEXT", []);
    let _ = conn.execute("ALTER TABLE transactions ADD COLUMN linked_loan_id TEXT", []);
    let _ = conn.execute("ALTER TABLE transactions ADD COLUMN expected_amount REAL", []);
    let _ = conn.execute("ALTER TABLE vault_items ADD COLUMN position INTEGER DEFAULT 0", []);

    let accounts_count: i64 = conn.query_row("SELECT COUNT(*) FROM finance_accounts WHERE deleted_at IS NULL", [], |row| row.get(0)).unwrap_or(0);
    if accounts_count == 0 {
        let _ = conn.execute(
            "INSERT INTO finance_accounts (id, name, color, icon, initial_balance) VALUES ('default-wallet', 'Carteira Principal', '#10b981', 'wallet', 0.0)",
            [],
        );
    }
    let _ = conn.execute("UPDATE transactions SET account_id = 'default-wallet' WHERE account_id IS NULL", []);

    // Create strategic performance indexes for fast lookups, foreign keys, and soft deletes
    let _ = conn.execute_batch(
        "
        CREATE INDEX IF NOT EXISTS idx_pages_parent_deleted ON pages (parent_id, deleted_at);
        CREATE INDEX IF NOT EXISTS idx_pages_deleted_sort ON pages (deleted_at, sort_order);
        CREATE INDEX IF NOT EXISTS idx_page_history_page ON page_history (page_id);
        CREATE INDEX IF NOT EXISTS idx_page_history_page_created ON page_history (page_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events (start_date, deleted_at);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_page ON calendar_events (page_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (is_read, deleted_at, created_at);
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date, deleted_at);
        CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions (account_id, deleted_at);
        CREATE INDEX IF NOT EXISTS idx_library_books_status ON library_books (reading_status, deleted_at);
        CREATE INDEX IF NOT EXISTS idx_library_highlights_book ON library_highlights (book_id);
        CREATE INDEX IF NOT EXISTS idx_library_bookmarks_book ON library_bookmarks (book_id);
        CREATE INDEX IF NOT EXISTS idx_library_ocr_cache_book_page ON library_ocr_cache (book_id, page_number);
        CREATE INDEX IF NOT EXISTS idx_anki_cards_deck ON anki_cards (deck_id, deleted_at);
        CREATE INDEX IF NOT EXISTS idx_anki_srs_state_due ON anki_srs_state (due_date);
        CREATE INDEX IF NOT EXISTS idx_anki_reviews_card ON anki_reviews (card_id);
        CREATE INDEX IF NOT EXISTS idx_vault_items_group ON vault_items (group_id, deleted_at);
        CREATE INDEX IF NOT EXISTS idx_vault_items_position ON vault_items (position);
        CREATE INDEX IF NOT EXISTS idx_files_folder ON files (folder_id, deleted_at);
        CREATE INDEX IF NOT EXISTS idx_file_page_links_ids ON file_page_links (file_id, page_id);
        CREATE INDEX IF NOT EXISTS idx_file_page_links_page ON file_page_links (page_id);
        CREATE INDEX IF NOT EXISTS idx_culture_episodes_item ON culture_episodes (item_id);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs (date, module);
        "
    );

    Ok(conn)
}
