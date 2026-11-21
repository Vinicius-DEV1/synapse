pub mod migrations;
pub mod keychain;
mod schema;

use rusqlite::Connection;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Shared SQLite connection holder for platform adapters.
pub struct Database {
    conn: Mutex<Connection>,
    path: PathBuf,
}

/// Configures and initializes the canonical schema on a platform-owned writer connection.
pub fn initialize_connection(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA secure_delete = ON;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;
         PRAGMA cache_size = -64000;
         PRAGMA temp_store = MEMORY;
         PRAGMA mmap_size = 268435456;",
    )
    .map_err(|error| format!("Failed to configure SQLite connection: {error}"))?;
    migrations::run_migrations(conn)
}

/// Configures a read-only SQLite connection for concurrent WAL reads.
pub fn configure_read_connection(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "PRAGMA query_only = ON;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;
         PRAGMA cache_size = -16000;
         PRAGMA temp_store = MEMORY;
         PRAGMA mmap_size = 268435456;",
    )
    .map_err(|error| format!("Failed to configure SQLite read connection: {error}"))
}

impl Database {
    /// Opens or creates the canonical SQLite database and applies pending migrations.
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, String> {
        let path = path.as_ref().to_path_buf();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|error| format!("Failed to create SQLite parent directory: {error}"))?;
        }

        let conn =
            Connection::open(&path).map_err(|error| format!("Failed to open DB: {error}"))?;
        initialize_connection(&conn)?;

        Ok(Self {
            conn: Mutex::new(conn),
            path,
        })
    }

    /// Accesses the underlying connection through its mutex.
    pub fn lock(&self) -> Result<std::sync::MutexGuard<'_, Connection>, String> {
        self.conn
            .lock()
            .map_err(|error| format!("Database lock poisoned: {error}"))
    }

    /// Returns the path used to open this database.
    pub fn path(&self) -> &Path {
        &self.path
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_database_initialization_and_schema_creation() {
        let temp_db = NamedTempFile::new().unwrap();
        let db = Database::open(temp_db.path()).expect("Failed to initialize database");

        let conn = db.lock().expect("Failed to lock database");

        // Assert WAL mode
        let journal_mode: String = conn
            .query_row("PRAGMA journal_mode", [], |r| r.get(0))
            .unwrap();
        assert_eq!(journal_mode.to_lowercase(), "wal");

        // Assert key tables exist
        let tables_to_check = [
            "keychain",
            "pages",
            "videos",
            "anki_cards",
            "anki_srs_state",
            "quiz_batteries",
            "quiz_questions",
            "transactions",
            "habits",
            "habit_logs",
            "vault_items",
            "library_books",
        ];

        for table in tables_to_check {
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
                    [table],
                    |r| r.get(0),
                )
                .unwrap();
            assert_eq!(count, 1, "Table '{}' should exist in schema", table);
        }
    }
}
