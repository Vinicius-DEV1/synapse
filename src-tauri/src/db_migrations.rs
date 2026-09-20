use rusqlite::Connection;

/// Executes all idempotent column and table schema migrations on the SQLite connection.
pub fn run_migrations(conn: &Connection) {
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
}
