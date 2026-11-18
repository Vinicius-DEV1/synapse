use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
    pub keys: Mutex<Option<crate::cmd_auth::UnlockedKeys>>,
}

impl DbState {
    pub fn lock_conn(&self) -> Result<std::sync::MutexGuard<'_, Option<Connection>>, String> {
        self.conn
            .lock()
            .map_err(|error| format!("Database connection lock poisoned: {error}"))
    }

    pub fn lock_keys(
        &self,
    ) -> Result<std::sync::MutexGuard<'_, Option<crate::cmd_auth::UnlockedKeys>>, String> {
        self.keys
            .lock()
            .map_err(|error| format!("Keys lock poisoned: {error}"))
    }
}

pub fn init_db(db_path: PathBuf) -> Result<Connection, String> {
    let conn = Connection::open(&db_path)
        .map_err(|error| format!("Failed to open SQLite database: {error}"))?;
    synapse_core::db::initialize_connection(&conn)?;
    Ok(conn)
}
