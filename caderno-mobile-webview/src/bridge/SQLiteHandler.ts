import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const SQLiteHandler = {
  /**
   * Initializes the native SQLite database with the complete Caderno schema.
   */
  async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!dbInstance) {
      dbInstance = await SQLite.openDatabaseAsync('caderno.db');
      await this.initSchema(dbInstance);
    }
    return dbInstance;
  },

  async initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS keychain (
        id TEXT PRIMARY KEY, 
        auth_hash TEXT NOT NULL, 
        library_key_enc TEXT, 
        finance_key_enc TEXT, 
        notes_key_enc TEXT, 
        culture_key_enc TEXT, 
        anki_key_enc TEXT, 
        focus_key_enc TEXT, 
        files_key_enc TEXT, 
        vault_key_enc TEXT, 
        calendar_key_enc TEXT, 
        practice_key_enc TEXT, 
        core_key_enc TEXT
      );

      CREATE TABLE IF NOT EXISTS config (
        id TEXT PRIMARY KEY, 
        data TEXT, 
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY, 
        parent_id TEXT, 
        title TEXT NOT NULL, 
        content TEXT DEFAULT '', 
        icon TEXT DEFAULT 'file', 
        sort_order INTEGER DEFAULT 0, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        deleted_at DATETIME DEFAULT NULL, 
        cover_image TEXT, 
        description TEXT, 
        password_salt TEXT, 
        crdt_state TEXT, 
        encrypted_content TEXT, 
        is_pinned INTEGER DEFAULT 0, 
        pinned_order REAL DEFAULT 0.0, 
        is_locked INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS page_history (
        id TEXT PRIMARY KEY, 
        page_id TEXT NOT NULL, 
        content TEXT NOT NULL, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS image_cache (
        id TEXT PRIMARY KEY, 
        data BLOB NOT NULL, 
        mimeType TEXT DEFAULT 'image/png'
      );

      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY, 
        name TEXT NOT NULL, 
        file_type TEXT NOT NULL, 
        file_size INTEGER DEFAULT 0, 
        local_path TEXT, 
        drive_file_id TEXT, 
        folder_id TEXT, 
        mime_type TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        deleted_at DATETIME DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS file_folders (
        id TEXT PRIMARY KEY, 
        name TEXT NOT NULL, 
        parent_id TEXT, 
        color TEXT DEFAULT '#6366f1', 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        deleted_at DATETIME DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS file_page_links (
        id TEXT PRIMARY KEY, 
        file_id TEXT NOT NULL, 
        page_id TEXT NOT NULL, 
        link_type TEXT DEFAULT 'upload', 
        widget_id TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        deleted_at DATETIME DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY, 
        title TEXT NOT NULL, 
        description TEXT, 
        start_date TEXT, 
        end_date TEXT, 
        type TEXT DEFAULT 'event', 
        type_ TEXT DEFAULT 'event', 
        status TEXT DEFAULT 'pending', 
        color TEXT DEFAULT '#3b82f6', 
        deleted_at DATETIME DEFAULT NULL, 
        page_id TEXT, 
        reminders TEXT DEFAULT '[]', 
        notified_reminders TEXT DEFAULT '[]', 
        recurrence_rule TEXT, 
        reminder_minutes INTEGER, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY, 
        description TEXT NOT NULL, 
        amount REAL NOT NULL, 
        type TEXT NOT NULL, 
        category TEXT NOT NULL, 
        date TEXT NOT NULL, 
        status TEXT DEFAULT 'completed', 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        deleted_at DATETIME DEFAULT NULL, 
        is_paid INTEGER DEFAULT 1, 
        is_recurring INTEGER DEFAULT 0, 
        recurrence_period TEXT, 
        recurrence_end_date TEXT, 
        paid_amount REAL
      );

      CREATE TABLE IF NOT EXISTS wishlist (
        id TEXT PRIMARY KEY, 
        title TEXT NOT NULL, 
        price REAL NOT NULL, 
        priority TEXT DEFAULT 'medium', 
        category TEXT DEFAULT 'Geral', 
        expected_date TEXT, 
        estimated_cost REAL NOT NULL DEFAULT 0.0, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        deleted_at DATETIME DEFAULT NULL, 
        description TEXT, 
        link TEXT, 
        updated_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS anki_decks (
        id TEXT PRIMARY KEY, 
        name TEXT NOT NULL, 
        description TEXT, 
        parent_id TEXT, 
        color TEXT DEFAULT '#4F46E5', 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS anki_cards (
        id TEXT PRIMARY KEY, 
        deck_id TEXT NOT NULL, 
        front TEXT NOT NULL, 
        back TEXT NOT NULL, 
        extra_note TEXT, 
        tags TEXT DEFAULT '[]', 
        card_type TEXT, 
        validation_mode TEXT, 
        media_url TEXT, 
        source_module TEXT, 
        source_id TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME, 
        deleted_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS anki_srs_state (
        id TEXT PRIMARY KEY, 
        due_date DATETIME NOT NULL, 
        stability REAL NOT NULL, 
        difficulty REAL NOT NULL, 
        elapsed_days INTEGER DEFAULT 0, 
        reps INTEGER DEFAULT 0, 
        lapses INTEGER DEFAULT 0, 
        state TEXT DEFAULT 'new', 
        last_review DATETIME, 
        scheduled_days INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS anki_reviews (
        id TEXT PRIMARY KEY, 
        card_id TEXT NOT NULL, 
        rating INTEGER NOT NULL, 
        duration INTEGER DEFAULT 0, 
        review_time DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS anki_notes (
        id TEXT PRIMARY KEY, 
        deck_id TEXT NOT NULL, 
        front TEXT NOT NULL, 
        back TEXT NOT NULL, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        deleted_at DATETIME DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS anki_deck_settings (
        id TEXT PRIMARY KEY, 
        deck_id TEXT NOT NULL, 
        new_limit INTEGER DEFAULT 20, 
        review_limit INTEGER DEFAULT 100, 
        learning_steps TEXT, 
        relearning_steps TEXT, 
        fsrs_weights TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        deleted_at DATETIME DEFAULT NULL
      );

      CREATE TABLE IF NOT EXISTS library_books (
        id TEXT PRIMARY KEY, 
        title TEXT NOT NULL, 
        author TEXT DEFAULT 'Desconhecido', 
        file_path TEXT, 
        drive_file_id TEXT, 
        cover_color TEXT, 
        cover_image TEXT, 
        collections TEXT DEFAULT '[]', 
        total_pages INTEGER DEFAULT 0, 
        current_page INTEGER DEFAULT 0, 
        reading_status TEXT DEFAULT 'unread', 
        last_read_page TEXT, 
        epub_locations TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        deleted_at DATETIME, 
        reading_preferences TEXT, 
        language TEXT, 
        last_read_at DATETIME, 
        original_name TEXT, 
        published_year INTEGER, 
        publisher TEXT
      );

      CREATE TABLE IF NOT EXISTS library_collections (
        id TEXT PRIMARY KEY, 
        name TEXT NOT NULL, 
        color TEXT DEFAULT '#4F46E5', 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS library_book_collections (
        id TEXT PRIMARY KEY, 
        book_id TEXT NOT NULL, 
        collection_id TEXT NOT NULL, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS library_highlights (
        id TEXT PRIMARY KEY, 
        book_id TEXT NOT NULL, 
        page_number INTEGER NOT NULL, 
        text_content TEXT DEFAULT '', 
        color TEXT DEFAULT 'yellow', 
        rects TEXT, 
        highlight_type TEXT, 
        note TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS library_bookmarks (
        id TEXT PRIMARY KEY, 
        book_id TEXT NOT NULL, 
        page_number INTEGER NOT NULL, 
        label TEXT DEFAULT '', 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS library_ocr_cache (
        id TEXT PRIMARY KEY, 
        book_id TEXT NOT NULL, 
        page_number INTEGER NOT NULL, 
        text_content TEXT DEFAULT '', 
        word_boxes TEXT DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS library_reading_sessions (
        id TEXT PRIMARY KEY, 
        book_id TEXT NOT NULL, 
        started_at DATETIME NOT NULL, 
        ended_at DATETIME DEFAULT NULL, 
        pages_read INTEGER DEFAULT 0, 
        start_page INTEGER DEFAULT 0, 
        end_page INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS focus_sessions (
        id TEXT PRIMARY KEY, 
        tag TEXT NOT NULL, 
        description TEXT NOT NULL, 
        target_time_minutes INTEGER NOT NULL, 
        status TEXT NOT NULL, 
        justification TEXT, 
        summary TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS alarms (
        id TEXT PRIMARY KEY, 
        time TEXT NOT NULL, 
        label TEXT, 
        sound TEXT DEFAULT 'bell', 
        enabled BOOLEAN DEFAULT 1, 
        days TEXT
      );

      CREATE TABLE IF NOT EXISTS culture_items (
        id TEXT PRIMARY KEY, 
        title TEXT NOT NULL, 
        type TEXT NOT NULL, 
        synopsis TEXT, 
        cover_image TEXT, 
        status TEXT DEFAULT 'backlog', 
        progress INTEGER DEFAULT 0, 
        total_episodes INTEGER DEFAULT 0, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        myanimelist_id INTEGER, 
        anilist_id INTEGER, 
        access_link TEXT, 
        total_progress INTEGER DEFAULT 0, 
        is_goal BOOLEAN DEFAULT 0, 
        goal_note TEXT, 
        api_id TEXT, 
        api_source TEXT, 
        last_sync_at DATETIME, 
        volumes INTEGER, 
        chapters INTEGER, 
        episodes_count INTEGER
      );

      CREATE TABLE IF NOT EXISTS culture_episodes (
        id TEXT PRIMARY KEY, 
        item_id TEXT NOT NULL, 
        episode_number INTEGER, 
        title TEXT, 
        synopsis TEXT, 
        is_watched BOOLEAN DEFAULT 0, 
        watched_at DATETIME, 
        season_number INTEGER, 
        episode_in_season INTEGER, 
        aired_at DATETIME, 
        updated_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS vault_groups (
        id TEXT PRIMARY KEY, 
        name TEXT NOT NULL, 
        icon TEXT, 
        color TEXT, 
        position INTEGER DEFAULT 0, 
        created_at TEXT NOT NULL, 
        updated_at TEXT NOT NULL, 
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS vault_items (
        id TEXT PRIMARY KEY, 
        group_id TEXT, 
        label TEXT NOT NULL, 
        username TEXT, 
        email TEXT, 
        password TEXT, 
        url TEXT, 
        notes TEXT, 
        custom_fields TEXT, 
        is_favorite INTEGER DEFAULT 0, 
        password_changed_at TEXT, 
        password_strength INTEGER DEFAULT 0, 
        created_at TEXT NOT NULL, 
        updated_at TEXT NOT NULL, 
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS vault_password_history (
        id TEXT PRIMARY KEY, 
        item_id TEXT NOT NULL, 
        password TEXT NOT NULL, 
        changed_at TEXT NOT NULL, 
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS diagrams (
        id TEXT PRIMARY KEY, 
        title TEXT NOT NULL, 
        content TEXT DEFAULT '', 
        encrypted_content TEXT, 
        icon TEXT DEFAULT '🎨', 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
        deleted_at DATETIME DEFAULT NULL
      );

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
    `);
  },

  async getAll<T = any>(query: string, params: any[] = []): Promise<T[]> {
    const db = await this.getDb();
    return await db.getAllAsync<T>(query, params);
  },

  async getFirst<T = any>(query: string, params: any[] = []): Promise<T | null> {
    const db = await this.getDb();
    return await db.getFirstAsync<T>(query, params);
  },

  async exec(sql: string): Promise<void> {
    const db = await this.getDb();
    await db.execAsync(sql);
  },

  async run(query: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
    const db = await this.getDb();
    return await db.runAsync(query, params);
  },

  async transaction<T>(callback: (txDb: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    const db = await this.getDb();
    let result: T;
    await db.withTransactionAsync(async () => {
      result = await callback(db);
    });
    return result!;
  }
};
