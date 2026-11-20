use rusqlite::Connection;

use crate::db::initialize_connection;

#[test]
fn initialization_is_versioned_idempotent_and_preserves_legacy_sessions() {
    let connection = Connection::open_in_memory().expect("open in-memory database");
    connection
        .execute_batch(
            "CREATE TABLE sessions (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
             INSERT INTO sessions (id, payload) VALUES ('legacy-session', 'keep-me');",
        )
        .expect("create legacy sessions table");

    initialize_connection(&connection).expect("initialize canonical schema");
    initialize_connection(&connection).expect("rerun idempotent schema initialization");

    let payload: String = connection
        .query_row(
            "SELECT payload FROM sessions WHERE id = 'legacy-session'",
            [],
            |row| row.get(0),
        )
        .expect("read preserved legacy session");
    assert_eq!(payload, "keep-me");

    let version_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM schema_migrations", [], |row| {
            row.get(0)
        })
        .expect("read migration version count");
    assert_eq!(version_count, 3);

    for table in [
        "shared_page_keys",
        "culture_disliked_items",
        "culture_ignored_items",
    ] {
        let exists: bool = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
                [table],
                |row| row.get(0),
            )
            .expect("check canonical sync table");
        assert!(exists, "expected canonical table {table}");
    }
}

#[test]
fn versioned_migrations_add_finance_columns_to_existing_databases() {
    let connection = Connection::open_in_memory().expect("open in-memory database");
    connection
        .execute_batch(
            "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
             INSERT INTO schema_migrations (version, applied_at) VALUES (1, 'existing');
             CREATE TABLE transactions (id TEXT PRIMARY KEY, description TEXT NOT NULL);",
        )
        .expect("create version one database without transaction timestamp");

    crate::db::migrations::run_migrations(&connection).expect("apply version two migration");

    let has_updated_at: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM pragma_table_info('transactions') WHERE name = 'updated_at')",
            [],
            |row| row.get(0),
        )
        .expect("check transaction timestamp column");
    let has_person: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM pragma_table_info('transactions') WHERE name = 'person')",
            [],
            |row| row.get(0),
        )
        .expect("check transaction person column");
    let version: i64 = connection
        .query_row("SELECT MAX(version) FROM schema_migrations", [], |row| {
            row.get(0)
        })
        .expect("check migrated version");

    assert!(has_updated_at);
    assert!(has_person);
    assert_eq!(version, 3);
}

#[test]
fn failed_schema_migration_rolls_back_schema_and_version() {
    let connection = Connection::open_in_memory().expect("open in-memory database");
    connection
        .execute_batch("CREATE VIEW library_books AS SELECT 'legacy' AS id, 'title' AS title;")
        .expect("create incompatible legacy object");

    let error =
        initialize_connection(&connection).expect_err("migration must reject a view collision");
    assert!(error.contains("library_books"));

    let version_table_exists: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations')",
            [],
            |row| row.get(0),
        )
        .expect("check migration rollback");
    assert!(!version_table_exists);

    let view_exists: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'view' AND name = 'library_books')",
            [],
            |row| row.get(0),
        )
        .expect("check legacy view preservation");
    assert!(view_exists);
}

#[test]
fn initialization_rejects_a_database_from_a_newer_schema_version() {
    let connection = Connection::open_in_memory().expect("open in-memory database");
    connection
        .execute_batch(
            "CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
             INSERT INTO schema_migrations (version, applied_at) VALUES (4, 'future');",
        )
        .expect("create newer schema marker");

    let error = initialize_connection(&connection).expect_err("newer schema must be rejected");
    assert!(error.contains("newer than supported"));

    let core_table_exists: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'pages')",
            [],
            |row| row.get(0),
        )
        .expect("check no older schema was applied");
    assert!(!core_table_exists);
}

#[test]
fn all_web_sync_tables_exist_in_the_shared_sqlite_schema() {
    const WEB_SYNC_TABLES: &[&str] = &[
        "config",
        "ai_prompts",
        "pages",
        "page_history",
        "transactions",
        "wishlist",
        "finance_accounts",
        "library_books",
        "library_highlights",
        "library_bookmarks",
        "library_collections",
        "library_book_collections",
        "library_reading_sessions",
        "culture_items",
        "culture_episodes",
        "culture_disliked_items",
        "culture_ignored_items",
        "videos",
        "video_words",
        "youtube_watched",
        "youtube_summaries",
        "calendar_events",
        "vault_groups",
        "vault_items",
        "vault_password_history",
        "tutor_sessions",
        "tutor_messages",
        "tutor_memories",
        "focus_sessions",
        "alarms",
        "lofis",
        "activity_logs",
        "anki_decks",
        "anki_notes",
        "anki_cards",
        "anki_srs_state",
        "anki_reviews",
        "anki_deck_settings",
        "files",
        "file_folders",
        "file_page_links",
        "diagrams",
        "quiz_batteries",
        "quiz_questions",
        "quiz_attempts",
        "quiz_page_links",
        "habits",
        "habit_logs",
        "notifications",
        "shared_page_keys",
    ];
    let connection = Connection::open_in_memory().expect("open in-memory database");
    initialize_connection(&connection).expect("initialize canonical schema");

    for table in WEB_SYNC_TABLES {
        let exists: bool = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
                [table],
                |row| row.get(0),
            )
            .expect("check web sync table");
        assert!(exists, "expected Web sync table {table}");
    }
}
