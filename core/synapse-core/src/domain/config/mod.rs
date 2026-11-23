//! Global configuration and preferences persistence.

use rusqlite::params;
use crate::error::Result;

#[cfg(test)]
mod tests;

pub struct ConfigRepository;

impl ConfigRepository {
    /// Retrieves a configuration value by key from the config table.
    pub fn get(conn: &rusqlite::Connection, key: &str) -> Result<Option<String>> {
        let mut stmt = conn.prepare_cached(
            "SELECT COALESCE(NULLIF(value, ''), data) FROM config WHERE id = ?1 LIMIT 1",
        )?;
        let mut rows = stmt.query(params![key])?;
        if let Some(row) = rows.next()? {
            let val: Option<String> = row.get(0)?;
            Ok(val)
        } else {
            Ok(None)
        }
    }

    /// Sets or updates a configuration value by key in the config table.
    pub fn set(conn: &rusqlite::Connection, key: &str, value: &str) -> Result<()> {
        conn.execute(
            "INSERT INTO config (id, data, value, updated_at) VALUES (?1, ?2, ?2, CURRENT_TIMESTAMP) \
             ON CONFLICT(id) DO UPDATE SET data = excluded.data, value = excluded.value, updated_at = CURRENT_TIMESTAMP",
            params![key, value],
        )?;
        Ok(())
    }

    /// Deletes a configuration key.
    pub fn delete(conn: &rusqlite::Connection, key: &str) -> Result<()> {
        conn.execute("DELETE FROM config WHERE id = ?1", params![key])?;
        Ok(())
    }
}
