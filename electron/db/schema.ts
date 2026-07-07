import { getDb } from './connection';

export function setupTables(): Promise<void> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('PRAGMA foreign_keys = ON');

      // CORE TABLES
      db.run(`
        CREATE TABLE IF NOT EXISTS keychain (
          id TEXT PRIMARY KEY,
          auth_hash TEXT NOT NULL,
          library_key_enc TEXT,
          finance_key_enc TEXT,
          notes_key_enc TEXT,
          culture_key_enc TEXT,
          anki_key_enc TEXT
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS config (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS videos (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          original_name TEXT NOT NULL,
          duration REAL,
          file_path TEXT,
          drive_file_id TEXT,
          drive_subtitle_id TEXT,
          local_subtitle_path TEXT,
          is_local INTEGER DEFAULT 0,
          progress REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME DEFAULT NULL
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS lofis (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          original_name TEXT NOT NULL,
          duration REAL,
          file_path TEXT,
          drive_file_id TEXT,
          is_local INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME DEFAULT NULL
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS video_words (
          id TEXT PRIMARY KEY,
          video_id TEXT NOT NULL,
          word TEXT NOT NULL,
          context TEXT,
          timestamp REAL,
          color TEXT DEFAULT 'yellow',
          note TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME DEFAULT NULL
        )
      `);

      // Verifica quais bancos estão acoplados
      db.all('PRAGMA database_list', (err, rows: any[]) => {
        if (err) return reject(err);
        
        const attached = rows.map(r => r.name);

        const runSafe = (sql: string) => new Promise<void>(res => db.run(sql, (err) => {
          if (err && !err.message.includes('duplicate column')) console.error("runSafe err:", err.message, "SQL:", sql);
          res();
        }));
        const promises: Promise<void>[] = [];

        // Migrate videos table
        promises.push(runSafe("ALTER TABLE videos ADD COLUMN collection_id TEXT;"));
        promises.push(runSafe("ALTER TABLE videos ADD COLUMN collection_name TEXT;"));
        promises.push(runSafe("ALTER TABLE videos ADD COLUMN youtube_url TEXT;"));
        promises.push(runSafe("ALTER TABLE videos ADD COLUMN youtube_description TEXT;"));
        promises.push(runSafe("ALTER TABLE videos ADD COLUMN audio_tracks_json TEXT;"));
        promises.push(runSafe("ALTER TABLE videos ADD COLUMN subtitles_json TEXT;"));

        // LIBRARY TABLES
        if (attached.includes('library')) {
          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS library.library_books (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              author TEXT DEFAULT 'Desconhecido',
              file_path TEXT,
              drive_file_id TEXT,
              cover_color TEXT DEFAULT '#4F46E5',
              cover_image TEXT,
              total_pages INTEGER DEFAULT 0,
              current_page INTEGER DEFAULT 1,
              reading_status TEXT DEFAULT 'not_started',
              last_read_page TEXT,
              epub_locations TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              deleted_at DATETIME DEFAULT NULL
            )
          `));
          
          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS library.library_collections (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              color TEXT DEFAULT '#4F46E5',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              deleted_at DATETIME DEFAULT NULL
            )
          `));

          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS library.library_book_collections (
              id TEXT UNIQUE,
              book_id TEXT NOT NULL,
              collection_id TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              deleted_at DATETIME DEFAULT NULL,
              PRIMARY KEY (book_id, collection_id)
            )
          `));

          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS library.library_highlights (
              id TEXT PRIMARY KEY,
              book_id TEXT NOT NULL,
              page_number INTEGER NOT NULL,
              text_content TEXT DEFAULT '',
              color TEXT DEFAULT 'yellow',
              rects TEXT DEFAULT '[]',
              highlight_type TEXT DEFAULT 'text',
              note TEXT DEFAULT '',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              deleted_at DATETIME DEFAULT NULL
            )
          `));

          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS library.library_bookmarks (
              id TEXT PRIMARY KEY,
              book_id TEXT NOT NULL,
              page_number INTEGER NOT NULL,
              label TEXT DEFAULT '',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              deleted_at DATETIME DEFAULT NULL
            )
          `));

          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS library.library_ocr_cache (
              id TEXT PRIMARY KEY,
              book_id TEXT NOT NULL,
              page_number INTEGER NOT NULL,
              text_content TEXT DEFAULT '',
              word_boxes TEXT DEFAULT '[]',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `));

          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS library.library_reading_sessions (
              id TEXT PRIMARY KEY,
              book_id TEXT NOT NULL,
              started_at DATETIME NOT NULL,
              ended_at DATETIME DEFAULT NULL,
              pages_read INTEGER DEFAULT 0,
              start_page INTEGER DEFAULT 1,
              end_page INTEGER DEFAULT 1
            )
          `));
          
          // Migration patch for last_read_page
          promises.push(runSafe("ALTER TABLE library.library_books ADD COLUMN last_read_page TEXT;"));
          promises.push(runSafe("ALTER TABLE library.library_books ADD COLUMN epub_locations TEXT;"));
          promises.push(runSafe("ALTER TABLE library.library_books ADD COLUMN reading_preferences TEXT;"));
        }

        // NOTES TABLES
        if (attached.includes('notes')) {
          promises.push(runSafe("ALTER TABLE notes.pages ADD COLUMN sort_order REAL DEFAULT 0;"));
          promises.push(runSafe("ALTER TABLE notes.pages ADD COLUMN crdt_state TEXT;"));
        }

        // FINANCE TABLES
        if (attached.includes('finance')) {
          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS finance.transactions (
              id TEXT PRIMARY KEY,
              description TEXT NOT NULL,
              amount REAL NOT NULL,
              type TEXT NOT NULL,
              category TEXT NOT NULL,
              date TEXT NOT NULL,
              is_recurring INTEGER DEFAULT 0,
              recurrence_period TEXT,
              recurrence_end_date TEXT,
              is_paid INTEGER DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              deleted_at DATETIME DEFAULT NULL
            )
          `));

          promises.push(runSafe("ALTER TABLE finance.transactions ADD COLUMN paid_amount REAL DEFAULT 0;"));

          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS finance.wishlist (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              price REAL NOT NULL,
              priority TEXT NOT NULL,
              link TEXT,
              description TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              deleted_at DATETIME DEFAULT NULL
            )
          `));
          
          promises.push(runSafe("ALTER TABLE finance.wishlist ADD COLUMN description TEXT;"));
        }

        // NOTES TABLES
        if (attached.includes('notes')) {
          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS notes.pages (
              id TEXT PRIMARY KEY,
              parent_id TEXT,
              title TEXT NOT NULL,
              content TEXT DEFAULT '',
              icon TEXT DEFAULT 'file',
              sort_order REAL DEFAULT 0,
              crdt_state TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              deleted_at DATETIME DEFAULT NULL,
              is_locked INTEGER DEFAULT 0,
              password_salt TEXT,
              encrypted_content TEXT,
              is_pinned INTEGER DEFAULT 0,
              pinned_order REAL DEFAULT 0
            )
          `));

          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS notes.image_cache (
              id TEXT PRIMARY KEY,
              data BLOB NOT NULL,
              mimeType TEXT DEFAULT 'image/png'
            )
          `));
          
          promises.push(runSafe(`ALTER TABLE notes.pages ADD COLUMN is_pinned INTEGER DEFAULT 0`));
          promises.push(runSafe(`ALTER TABLE notes.pages ADD COLUMN pinned_order REAL DEFAULT 0`));
          promises.push(runSafe(`ALTER TABLE notes.image_cache ADD COLUMN mimeType TEXT DEFAULT 'image/png'`));
          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS notes.page_history (
              id TEXT PRIMARY KEY,
              page_id TEXT NOT NULL,
              content TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `));
        }

        // CULTURE TABLES
        if (attached.includes('culture')) {
          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS culture.items (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              type TEXT NOT NULL,
              synopsis TEXT,
              cover_image TEXT,
              access_link TEXT,
              progress INTEGER DEFAULT 0,
              total_progress INTEGER DEFAULT 0,
              is_goal INTEGER DEFAULT 0,
              status TEXT DEFAULT 'unknown',
              last_sync_at DATETIME DEFAULT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              deleted_at DATETIME DEFAULT NULL
            )
          `));
          
          promises.push(runSafe("ALTER TABLE culture.items ADD COLUMN api_id TEXT;"));
          promises.push(runSafe("ALTER TABLE culture.items ADD COLUMN api_source TEXT;"));
          promises.push(runSafe("ALTER TABLE culture.items ADD COLUMN status TEXT DEFAULT 'unknown';"));
          promises.push(runSafe("ALTER TABLE culture.items ADD COLUMN last_sync_at DATETIME DEFAULT NULL;"));
          promises.push(runSafe("ALTER TABLE culture.items ADD COLUMN goal_note TEXT;"));
          promises.push(runSafe("ALTER TABLE culture.items ADD COLUMN volumes INTEGER DEFAULT NULL;"));
          promises.push(runSafe("ALTER TABLE culture.items ADD COLUMN chapters INTEGER DEFAULT NULL;"));
          promises.push(runSafe("ALTER TABLE culture.items ADD COLUMN episodes_count INTEGER DEFAULT NULL;"));

          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS culture.episodes (
              id TEXT PRIMARY KEY,
              item_id TEXT NOT NULL,
              episode_number INTEGER,
              title TEXT,
              synopsis TEXT,
              is_watched INTEGER DEFAULT 0,
              aired_at DATETIME DEFAULT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `));
          
          promises.push(runSafe("ALTER TABLE culture.episodes ADD COLUMN aired_at DATETIME DEFAULT NULL;"));
          promises.push(runSafe("ALTER TABLE culture.episodes ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;"));
        }

        // ANKI TABLES
        if (attached.includes('anki')) {
          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS anki.anki_decks (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT,
              color TEXT DEFAULT '#4F46E5',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `));

          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS anki.anki_cards (
              id TEXT PRIMARY KEY,
              deck_id TEXT NOT NULL,
              front TEXT NOT NULL,
              back TEXT NOT NULL,
              extra_note TEXT,
              source_module TEXT,
              source_id TEXT,
              media_url TEXT,
              card_type TEXT DEFAULT 'reading',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `));

          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS anki.anki_srs_state (
              card_id TEXT PRIMARY KEY,
              due_date DATETIME NOT NULL,
              stability REAL NOT NULL,
              difficulty REAL NOT NULL,
              elapsed_days INTEGER DEFAULT 0,
              scheduled_days INTEGER DEFAULT 0,
              reps INTEGER DEFAULT 0,
              lapses INTEGER DEFAULT 0,
              state INTEGER DEFAULT 0 -- 0=New, 1=Learning, 2=Review, 3=Relearning
            )
          `));

          promises.push(runSafe(`
            CREATE TABLE IF NOT EXISTS anki.anki_reviews (
              id TEXT PRIMARY KEY,
              card_id TEXT NOT NULL,
              rating INTEGER NOT NULL, -- 1=Again, 2=Hard, 3=Good, 4=Easy
              duration INTEGER DEFAULT 0, -- in ms
              review_time DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `));
        }

        Promise.all(promises).then(() => resolve()).catch(reject);
      });
    });
  });
}

