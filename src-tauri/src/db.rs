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
         PRAGMA foreign_keys = ON;"
    ).map_err(|e| format!("Failed to set PRAGMAs: {}", e))?;
    
    Ok(conn)
}
