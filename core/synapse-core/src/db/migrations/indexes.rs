//! Indexes are created after the canonical columns exist.

use rusqlite::Connection;

pub(super) const INDEXES_SQL: &str = r##"
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs (date, module);
CREATE INDEX IF NOT EXISTS idx_anki_cards_deck ON anki_cards (deck_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_anki_cards_updated ON anki_cards(updated_at);
CREATE INDEX IF NOT EXISTS idx_anki_reviews_card ON anki_reviews (card_id);
CREATE INDEX IF NOT EXISTS idx_anki_srs_state_due ON anki_srs_state (due_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_page ON calendar_events (page_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events (start_date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_updated ON calendar_events(updated_at);
CREATE INDEX IF NOT EXISTS idx_culture_disliked_updated ON culture_disliked_items(updated_at);
CREATE INDEX IF NOT EXISTS idx_culture_episodes_item ON culture_episodes (item_id);
CREATE INDEX IF NOT EXISTS idx_culture_ignored_updated ON culture_ignored_items(updated_at);
CREATE INDEX IF NOT EXISTS idx_file_page_links_ids ON file_page_links (file_id, page_id);
CREATE INDEX IF NOT EXISTS idx_file_page_links_page ON file_page_links (page_id);
CREATE INDEX IF NOT EXISTS idx_files_folder ON files (folder_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs (habit_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_updated ON habit_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_habits_updated ON habits(updated_at);
CREATE INDEX IF NOT EXISTS idx_library_bookmarks_book ON library_bookmarks (book_id);
CREATE INDEX IF NOT EXISTS idx_library_books_status ON library_books (reading_status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_library_highlights_book ON library_highlights (book_id);
CREATE INDEX IF NOT EXISTS idx_library_ocr_cache_book_page ON library_ocr_cache (book_id, page_number);
CREATE INDEX IF NOT EXISTS idx_link_metadata_cache_updated ON link_metadata_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (is_read, deleted_at, created_at);
CREATE INDEX IF NOT EXISTS idx_page_history_page ON page_history (page_id);
CREATE INDEX IF NOT EXISTS idx_page_history_page_created ON page_history (page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_deleted_sort ON pages (deleted_at, sort_order);
CREATE INDEX IF NOT EXISTS idx_pages_parent_deleted ON pages (parent_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_pages_updated ON pages(updated_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_question_created ON quiz_attempts(question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_batteries_parent ON quiz_batteries(parent_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_battery_deleted ON quiz_questions(battery_id, deleted_at, sort_order);
CREATE INDEX IF NOT EXISTS idx_shared_page_keys_page ON shared_page_keys(page_id);
CREATE INDEX IF NOT EXISTS idx_shared_page_keys_updated ON shared_page_keys(updated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions (account_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_vault_items_group ON vault_items (group_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_vault_items_position ON vault_items (position);
CREATE INDEX IF NOT EXISTS idx_youtube_summaries_video_id ON youtube_summaries(video_id);
"##;

/// Sync tables whose timestamp columns (`updated_at`, `created_at`, `deleted_at`)
/// should be indexed for fast incremental `sync_get_modified_rows` range scans.
const SYNC_INDEXED_TABLES: &[&str] = &[
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
    "notifications",
    "link_metadata_cache",
    "youtube_summaries",
    "habits",
    "habit_logs",
    "shared_page_keys",
];

/// Idempotently creates B-tree timestamp indexes on sync tables present in the database
/// so incremental delta sync (`updated_at >= ?`, `created_at >= ?`, `deleted_at >= ?`) uses index scans.
pub(super) fn ensure_sync_timestamp_indexes(conn: &Connection) -> Result<(), String> {
    let mut existing_tables: std::collections::HashSet<String> = std::collections::HashSet::new();
    {
        let mut stmt = conn
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
            .map_err(|e| format!("Failed to inspect SQLite tables for sync indexes: {e}"))?;
        let rows = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed to read SQLite tables for sync indexes: {e}"))?;
        for table in rows.flatten() {
            existing_tables.insert(table);
        }
    }

    let mut existing_indexes: std::collections::HashSet<String> = std::collections::HashSet::new();
    {
        let mut stmt = conn
            .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
            .map_err(|e| format!("Failed to inspect SQLite indexes: {e}"))?;
        let rows = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Failed to read SQLite indexes: {e}"))?;
        for idx in rows.flatten() {
            existing_indexes.insert(idx);
        }
    }

    for &table in SYNC_INDEXED_TABLES {
        if !existing_tables.contains(table) {
            continue;
        }

        let updated_idx = format!("idx_sync_{table}_updated");
        let created_idx = format!("idx_sync_{table}_created");
        let deleted_idx = format!("idx_sync_{table}_deleted");

        if existing_indexes.contains(&updated_idx)
            && existing_indexes.contains(&created_idx)
            && existing_indexes.contains(&deleted_idx)
        {
            continue;
        }

        let cols: std::collections::HashSet<String> = {
            let mut stmt = conn
                .prepare("SELECT name FROM pragma_table_info(?1)")
                .map_err(|e| format!("Failed to inspect columns of {table}: {e}"))?;
            let rows = stmt
                .query_map([table], |row| row.get::<_, String>(0))
                .map_err(|e| format!("Failed to read columns of {table}: {e}"))?;
            rows.flatten().collect()
        };

        if cols.contains("updated_at") && !existing_indexes.contains(&updated_idx) {
            let sql = format!("CREATE INDEX IF NOT EXISTS {updated_idx} ON {table}(updated_at)");
            conn.execute(&sql, [])
                .map_err(|e| format!("Failed to create index {updated_idx}: {e}"))?;
        }
        if cols.contains("created_at") && !existing_indexes.contains(&created_idx) {
            let sql = format!("CREATE INDEX IF NOT EXISTS {created_idx} ON {table}(created_at)");
            conn.execute(&sql, [])
                .map_err(|e| format!("Failed to create index {created_idx}: {e}"))?;
        }
        if cols.contains("deleted_at") && !existing_indexes.contains(&deleted_idx) {
            let sql = format!(
                "CREATE INDEX IF NOT EXISTS {deleted_idx} ON {table}(deleted_at) WHERE deleted_at IS NOT NULL"
            );
            conn.execute(&sql, [])
                .map_err(|e| format!("Failed to create index {deleted_idx}: {e}"))?;
        }
    }

    Ok(())
}
