use crate::db::DbState;
use rusqlite::Connection;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::sync::{Mutex, OnceLock};
use tauri::State;

const ALLOWED_SYNC_TABLES: &[&str] = &[
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
    "culture_disliked_items",
    "culture_ignored_items",
];

fn validate_sync_table(table_name: &str) -> Result<(), String> {
    if !ALLOWED_SYNC_TABLES.contains(&table_name) {
        return Err(format!(
            "Unauthorized or invalid sync table: {}",
            table_name
        ));
    }
    Ok(())
}

fn table_columns_cache() -> &'static Mutex<HashMap<String, HashSet<String>>> {
    static CACHE: OnceLock<Mutex<HashMap<String, HashSet<String>>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn query_table_columns_fresh(
    conn: &Connection,
    table_name: &str,
) -> Result<HashSet<String>, String> {
    let pragma_query = format!("PRAGMA table_info({})", table_name);
    let mut pragma_stmt = conn.prepare(&pragma_query).map_err(|e| e.to_string())?;
    let valid_columns: HashSet<String> = pragma_stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(valid_columns)
}

fn get_cached_table_columns(
    conn: &Connection,
    table_name: &str,
) -> Result<HashSet<String>, String> {
    {
        let cache = match table_columns_cache().lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(cols) = cache.get(table_name) {
            return Ok(cols.clone());
        }
    }

    let cols = query_table_columns_fresh(conn, table_name)?;
    {
        let mut cache = match table_columns_cache().lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        cache.insert(table_name.to_string(), cols.clone());
    }
    Ok(cols)
}

fn refresh_cached_table_columns(
    conn: &Connection,
    table_name: &str,
) -> Result<HashSet<String>, String> {
    let cols = query_table_columns_fresh(conn, table_name)?;
    let mut cache = match table_columns_cache().lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    cache.insert(table_name.to_string(), cols.clone());
    Ok(cols)
}

fn validate_sync_row_columns(
    table_name: &str,
    row: &serde_json::Map<String, Value>,
    valid_columns: &HashSet<String>,
) -> Result<(), String> {
    let unknown_columns: Vec<&str> = row
        .keys()
        .filter(|column| !valid_columns.contains(column.as_str()))
        .map(String::as_str)
        .collect();

    if unknown_columns.is_empty() {
        return Ok(());
    }

    Err(format!(
        "SQLite schema mismatch for sync table {}: missing column(s): {}",
        table_name,
        unknown_columns.join(", ")
    ))
}

fn map_sql_row_to_json(
    row: &rusqlite::Row<'_>,
    column_names: &[String],
) -> rusqlite::Result<Value> {
    let mut map = serde_json::Map::new();
    for (i, col) in column_names.iter().enumerate() {
        let val = row.get_ref(i)?;
        let json_val = match val {
            rusqlite::types::ValueRef::Null => Value::Null,
            rusqlite::types::ValueRef::Integer(i) => Value::Number(i.into()),
            rusqlite::types::ValueRef::Real(f) => serde_json::Number::from_f64(f)
                .map(Value::Number)
                .unwrap_or(Value::Null),
            rusqlite::types::ValueRef::Text(t) => {
                Value::String(String::from_utf8_lossy(t).to_string())
            }
            rusqlite::types::ValueRef::Blob(_) => {
                return Err(rusqlite::Error::InvalidColumnType(
                    i,
                    col.clone(),
                    rusqlite::types::Type::Blob,
                ));
            }
        };
        map.insert(col.clone(), json_val);
    }
    Ok(Value::Object(map))
}

fn execute_sync_get_table(conn: &Connection, table_name: &str) -> Result<Vec<Value>, String> {
    let query = format!("SELECT * FROM {}", table_name);
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let column_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

    let iter = stmt
        .query_map([], |row| map_sql_row_to_json(row, &column_names))
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for item in iter {
        items.push(item.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

#[tauri::command]
pub async fn sync_get_table(
    table_name: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<Value>, String> {
    validate_sync_table(&table_name)?;

    db_state
        .read(move |conn| execute_sync_get_table(conn, &table_name))
        .await
}

fn execute_sync_delete_row(conn: &Connection, table_name: &str, id: &str) -> Result<(), String> {
    validate_sync_table(table_name)?;

    let valid_columns = get_cached_table_columns(conn, table_name)?;

    let key_column = if valid_columns.contains("id") {
        "id"
    } else if valid_columns.contains("url") {
        "url"
    } else {
        return Err(format!(
            "Sync table {} has no supported primary key column for deletion",
            table_name
        ));
    };

    if valid_columns.contains("deleted_at") {
        let now = chrono::Utc::now().to_rfc3339();
        let query = if valid_columns.contains("updated_at") {
            format!(
                "UPDATE {} SET deleted_at = ?1, updated_at = ?1 WHERE {} = ?2",
                table_name, key_column
            )
        } else {
            format!(
                "UPDATE {} SET deleted_at = ?1 WHERE {} = ?2",
                table_name, key_column
            )
        };
        conn.execute(&query, [&now, id])
            .map_err(|e| e.to_string())?;
    } else {
        // Key-value and append-only tables without deleted_at (e.g. config) must be hard-deleted.
        let query = format!("DELETE FROM {} WHERE {} = ?1", table_name, key_column);
        conn.execute(&query, [id]).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn sync_delete_row(
    table_name: String,
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    validate_sync_table(&table_name)?;

    db_state
        .write(move |conn| {
            execute_sync_delete_row(conn, &table_name, &id)?;
            Ok(true)
        })
        .await
}

fn execute_upsert_row_with_columns(
    conn: &Connection,
    table_name: &str,
    obj: &serde_json::Map<String, Value>,
    valid_columns: &HashSet<String>,
) -> Result<(), String> {
    validate_sync_row_columns(table_name, obj, valid_columns)?;

    let conflict_key = if valid_columns.contains("id") {
        "id"
    } else if valid_columns.contains("url") {
        "url"
    } else {
        "id"
    };

    let mut columns = Vec::with_capacity(obj.len());
    let mut placeholders = Vec::with_capacity(obj.len());
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::with_capacity(obj.len());

    for (k, v) in obj {
        if !valid_columns.contains(k) {
            continue;
        }
        columns.push(k.as_str());
        placeholders.push("?");

        let sql_val = match v {
            Value::Null => rusqlite::types::Value::Null,
            Value::Bool(b) => rusqlite::types::Value::Integer(if *b { 1 } else { 0 }),
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    rusqlite::types::Value::Integer(i)
                } else if let Some(f) = n.as_f64() {
                    rusqlite::types::Value::Real(f)
                } else {
                    rusqlite::types::Value::Null
                }
            }
            Value::String(s) => rusqlite::types::Value::Text(s.clone()),
            Value::Array(_) | Value::Object(_) => rusqlite::types::Value::Text(v.to_string()),
        };
        params_vec.push(sql_val);
    }

    if columns.is_empty() {
        return Ok(());
    }

    let cols_str = columns.join(", ");
    let placeholders_str = placeholders.join(", ");
    let update_str = columns
        .iter()
        .filter(|c| **c != conflict_key)
        .map(|c| format!("{} = excluded.{}", c, c))
        .collect::<Vec<_>>()
        .join(", ");

    let query = if update_str.is_empty() {
        format!(
            "INSERT OR IGNORE INTO {} ({}) VALUES ({})",
            table_name, cols_str, placeholders_str
        )
    } else {
        format!(
            "INSERT INTO {} ({}) VALUES ({}) ON CONFLICT({}) DO UPDATE SET {}",
            table_name, cols_str, placeholders_str, conflict_key, update_str
        )
    };

    let params_iter = rusqlite::params_from_iter(params_vec.iter());
    conn.execute(&query, params_iter)
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub(crate) fn execute_sync_upsert_rows_batch(
    conn: &mut Connection,
    table_name: &str,
    rows: &[Value],
) -> Result<usize, String> {
    validate_sync_table(table_name)?;
    if rows.is_empty() {
        return Ok(0);
    }

    let mut valid_columns = get_cached_table_columns(conn, table_name)?;

    // Validate all rows before opening transaction; refresh schema cache once on mismatch.
    for row in rows {
        let obj = row.as_object().ok_or("Row must be an object")?;
        if validate_sync_row_columns(table_name, obj, &valid_columns).is_err() {
            valid_columns = refresh_cached_table_columns(conn, table_name)?;
            validate_sync_row_columns(table_name, obj, &valid_columns)?;
        }
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for row in rows {
        let obj = row.as_object().ok_or("Row must be an object")?;
        execute_upsert_row_with_columns(&tx, table_name, obj, &valid_columns)?;
    }
    tx.commit().map_err(|e| e.to_string())?;

    Ok(rows.len())
}

#[tauri::command]
pub async fn sync_upsert_row(
    table_name: String,
    row: Value,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    validate_sync_table(&table_name)?;

    db_state
        .write(move |conn| {
            let obj = row.as_object().ok_or("Row must be an object")?;
            let mut valid_columns = get_cached_table_columns(conn, &table_name)?;
            if validate_sync_row_columns(&table_name, obj, &valid_columns).is_err() {
                valid_columns = refresh_cached_table_columns(conn, &table_name)?;
            }
            execute_upsert_row_with_columns(conn, &table_name, obj, &valid_columns)?;
            Ok(true)
        })
        .await
}

/// Atomically upserts a batch of rows in a single SQLite transaction using cached column metadata.
#[tauri::command]
pub async fn sync_upsert_rows_batch(
    table_name: String,
    rows: Vec<Value>,
    db_state: State<'_, DbState>,
) -> Result<usize, String> {
    validate_sync_table(&table_name)?;
    if rows.is_empty() {
        return Ok(0);
    }

    db_state
        .write(move |conn| execute_sync_upsert_rows_batch(conn, &table_name, &rows))
        .await
}

fn execute_sync_get_rows_by_ids(
    conn: &Connection,
    table_name: &str,
    ids: &[String],
) -> Result<Vec<Value>, String> {
    validate_sync_table(table_name)?;
    if ids.is_empty() {
        return Ok(Vec::new());
    }

    let valid_columns = get_cached_table_columns(conn, table_name)?;
    let key_column = if valid_columns.contains("id") {
        "id"
    } else if valid_columns.contains("url") {
        "url"
    } else {
        "id"
    };

    let mut items = Vec::with_capacity(ids.len());
    // Chunk IN clauses to stay safely below SQLite's max host parameter limit.
    for chunk in ids.chunks(500) {
        let placeholders = vec!["?"; chunk.len()].join(", ");
        let query = format!(
            "SELECT * FROM {} WHERE {} IN ({})",
            table_name, key_column, placeholders
        );

        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
        let column_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

        let params: Vec<rusqlite::types::Value> = chunk
            .iter()
            .map(|id| rusqlite::types::Value::Text(id.clone()))
            .collect();

        let iter = stmt
            .query_map(rusqlite::params_from_iter(params.iter()), |row| {
                map_sql_row_to_json(row, &column_names)
            })
            .map_err(|e| e.to_string())?;

        for item in iter {
            items.push(item.map_err(|e| e.to_string())?);
        }
    }

    Ok(items)
}

/// Queries rows matching specific IDs in a table for targeted sync conflict resolution.
#[tauri::command]
pub async fn sync_get_rows_by_ids(
    table_name: String,
    ids: Vec<String>,
    db_state: State<'_, DbState>,
) -> Result<Vec<Value>, String> {
    validate_sync_table(&table_name)?;
    if ids.is_empty() {
        return Ok(Vec::new());
    }

    db_state
        .read(move |conn| execute_sync_get_rows_by_ids(conn, &table_name, &ids))
        .await
}

#[tauri::command]
pub async fn sync_get_row(
    table_name: String,
    id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<Value>, String> {
    validate_sync_table(&table_name)?;
    db_state
        .read(move |conn| {
            let mut rows = execute_sync_get_rows_by_ids(conn, &table_name, &[id])?;
            Ok(rows.pop())
        })
        .await
}

pub(crate) fn build_modified_rows_query(
    table_name: &str,
    has_updated_at: bool,
    has_created_at: bool,
    has_deleted_at: bool,
    since_epoch_ms: i64,
) -> (String, Vec<rusqlite::types::Value>) {
    let since_epoch_secs = since_epoch_ms / 1000;
    // Subtract 24h for the string-range lower bound so B-tree index pruning remains 100% sound
    // across SQLite space timestamps, ISO 'T' timestamps, and arbitrary RFC3339 timezone offsets.
    let lower_bound_secs = since_epoch_secs.saturating_sub(86_400).max(0);
    let index_lower_bound = chrono::DateTime::from_timestamp(lower_bound_secs, 0)
        .unwrap_or(chrono::DateTime::UNIX_EPOCH)
        .format("%Y-%m-%d")
        .to_string();

    let mut where_clauses = Vec::new();
    let mut params: Vec<rusqlite::types::Value> = Vec::new();

    if has_updated_at {
        where_clauses.push("(updated_at >= ? AND CAST(strftime('%s', updated_at) AS INTEGER) > ?)");
        params.push(index_lower_bound.clone().into());
        params.push(since_epoch_secs.into());
    }
    if has_created_at {
        where_clauses.push("(created_at >= ? AND CAST(strftime('%s', created_at) AS INTEGER) > ?)");
        params.push(index_lower_bound.clone().into());
        params.push(since_epoch_secs.into());
    }
    if has_deleted_at {
        where_clauses.push(
            "(deleted_at IS NOT NULL AND deleted_at >= ? AND CAST(strftime('%s', deleted_at) AS INTEGER) > ?)",
        );
        params.push(index_lower_bound.into());
        params.push(since_epoch_secs.into());
    }

    let query = format!(
        "SELECT * FROM {} WHERE {}",
        table_name,
        where_clauses.join(" OR ")
    );
    (query, params)
}

pub(crate) fn execute_sync_get_modified_rows(
    conn: &Connection,
    table_name: &str,
    since_epoch_ms: i64,
) -> Result<Vec<Value>, String> {
    validate_sync_table(table_name)?;

    if since_epoch_ms <= 0 {
        return execute_sync_get_table(conn, table_name);
    }

    let valid_columns = get_cached_table_columns(conn, table_name)?;
    let has_updated_at = valid_columns.contains("updated_at");
    let has_created_at = valid_columns.contains("created_at");
    let has_deleted_at = valid_columns.contains("deleted_at");

    if !has_updated_at && !has_created_at {
        return execute_sync_get_table(conn, table_name);
    }

    let (query, params) = build_modified_rows_query(
        table_name,
        has_updated_at,
        has_created_at,
        has_deleted_at,
        since_epoch_ms,
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let cols: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

    let iter = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |row| {
            map_sql_row_to_json(row, &cols)
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for item in iter {
        items.push(item.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

/// Queries only rows in a table modified, created, or deleted since a specific epoch millisecond.
/// Uses index-pruned string lower bounds combined with exact epoch filtering for O(log N) scans.
#[tauri::command]
pub async fn sync_get_modified_rows(
    table_name: String,
    since_epoch_ms: i64,
    db_state: State<'_, DbState>,
) -> Result<Vec<Value>, String> {
    validate_sync_table(&table_name)?;

    db_state
        .read(move |conn| execute_sync_get_modified_rows(conn, &table_name, since_epoch_ms))
        .await
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;
    use serde_json::json;

    #[test]
    fn sync_upsert_rejects_unknown_columns_without_dropping_them() {
        let row = json!({"id": "page-1", "future_field": "preserve me"});
        let valid_columns = std::collections::HashSet::from(["id".to_string()]);
        let error = super::validate_sync_row_columns(
            "pages",
            row.as_object().expect("row is an object"),
            &valid_columns,
        )
        .expect_err("unknown columns must hold the checkpoint until the schema is migrated");

        assert!(error.contains("future_field"));
    }

    #[test]
    fn sync_get_rows_by_ids_only_allows_registered_sync_tables() {
        assert!(super::validate_sync_table("pages").is_ok());
        assert!(super::validate_sync_table("keychain").is_err());
    }

    #[test]
    fn sync_delete_row_handles_tables_with_and_without_deleted_at() {
        let conn = Connection::open_in_memory().unwrap();
        synapse_core::db::initialize_connection(&conn).unwrap();

        // Table without deleted_at (config)
        conn.execute(
            "INSERT INTO config (id, data) VALUES ('link_entity:https://example.com', '{}')",
            [],
        )
        .unwrap();
        super::execute_sync_delete_row(&conn, "config", "link_entity:https://example.com").unwrap();
        let config_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM config WHERE id = 'link_entity:https://example.com'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(config_count, 0);

        // Table with deleted_at and updated_at (pages)
        conn.execute(
            "INSERT INTO pages (id, title) VALUES ('page-1', 'Test')",
            [],
        )
        .unwrap();
        super::execute_sync_delete_row(&conn, "pages", "page-1").unwrap();
        let deleted_at: Option<String> = conn
            .query_row(
                "SELECT deleted_at FROM pages WHERE id = 'page-1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(deleted_at.is_some());

        // Table with deleted_at but without updated_at (vault_password_history)
        conn.execute(
            "INSERT INTO vault_password_history (id, item_id, password, changed_at) VALUES ('vph-1', 'item-1', 'enc', '2026-01-01T00:00:00Z')",
            [],
        )
        .unwrap();
        super::execute_sync_delete_row(&conn, "vault_password_history", "vph-1").unwrap();
        let vph_deleted: Option<String> = conn
            .query_row(
                "SELECT deleted_at FROM vault_password_history WHERE id = 'vph-1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(vph_deleted.is_some());
    }

    #[test]
    fn sync_upsert_rows_batch_commits_atomically_and_updates_existing_rows() {
        let mut conn = Connection::open_in_memory().unwrap();
        synapse_core::db::initialize_connection(&conn).unwrap();

        let batch = vec![
            json!({"id": "p1", "title": "First", "updated_at": "2026-01-01T00:00:00Z"}),
            json!({"id": "p2", "title": "Second", "updated_at": "2026-01-02T00:00:00Z"}),
        ];
        let count = super::execute_sync_upsert_rows_batch(&mut conn, "pages", &batch).unwrap();
        assert_eq!(count, 2);

        // Re-upsert updating p1 and adding p3
        let batch2 = vec![
            json!({"id": "p1", "title": "First Updated", "updated_at": "2026-01-03T00:00:00Z"}),
            json!({"id": "p3", "title": "Third", "updated_at": "2026-01-04T00:00:00Z"}),
        ];
        super::execute_sync_upsert_rows_batch(&mut conn, "pages", &batch2).unwrap();

        let title: String = conn
            .query_row("SELECT title FROM pages WHERE id = 'p1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(title, "First Updated");

        let total: i64 = conn
            .query_row("SELECT COUNT(*) FROM pages", [], |r| r.get(0))
            .unwrap();
        assert_eq!(total, 3);
    }

    #[test]
    fn sync_get_modified_rows_uses_indexes_and_handles_mixed_timestamp_formats() {
        let conn = Connection::open_in_memory().unwrap();
        synapse_core::db::initialize_connection(&conn).unwrap();

        conn.execute(
            "INSERT INTO pages (id, title, created_at, updated_at) VALUES ('old-space', 'Old', '2023-11-10 12:00:00', '2023-11-10 12:00:00')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO pages (id, title, created_at, updated_at) VALUES ('new-space', 'New Space', '2023-11-15 12:00:00', '2023-11-15 12:00:00')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO pages (id, title, created_at, updated_at) VALUES ('new-iso', 'New ISO', '2026-10-26T18:30:00.000Z', '2026-10-26T18:30:00.000Z')",
            [],
        )
        .unwrap();

        let threshold_ms: i64 = 1_700_000_000_000; // ~2023-11-14T22:13:20Z
        let modified = super::execute_sync_get_modified_rows(&conn, "pages", threshold_ms).unwrap();
        let mut ids: Vec<String> = modified
            .iter()
            .filter_map(|v| v.get("id").and_then(|s| s.as_str()).map(String::from))
            .collect();
        ids.sort();
        assert_eq!(ids, vec!["new-iso", "new-space"]);

        // Verify SQLite uses B-tree indexes (SEARCH USING INDEX) instead of full table SCAN
        let (query, params) =
            super::build_modified_rows_query("pages", true, true, true, threshold_ms);
        let explain_sql = format!("EXPLAIN QUERY PLAN {}", query);
        let mut stmt = conn.prepare(&explain_sql).unwrap();
        let plan_lines: Vec<String> = stmt
            .query_map(rusqlite::params_from_iter(params.iter()), |row| {
                row.get::<_, String>(3)
            })
            .unwrap()
            .flatten()
            .collect();
        let combined_plan = plan_lines.join(" | ");
        assert!(
            combined_plan.contains("USING INDEX"),
            "Expected indexed query plan, got: {}",
            combined_plan
        );
        assert!(
            !combined_plan.contains("SCAN pages"),
            "Unexpected full table scan in query plan: {}",
            combined_plan
        );
    }
}
