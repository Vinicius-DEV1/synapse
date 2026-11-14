//! Practice and AI tutor domain module.

pub mod models;
pub mod repository;
#[cfg(test)]
pub mod tests;

use crate::db::Database;
use crate::error::{Result, SynapseError};
pub use models::{TutorMemory, TutorMessage, TutorSession};

/// Practice repository providing high-level typed domain access.
pub struct PracticeRepository;

impl PracticeRepository {
    pub fn get_sessions(db: &Database) -> Result<Vec<TutorSession>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::get_sessions(&conn)
    }

    pub fn get_sessions_conn(conn: &rusqlite::Connection) -> Result<Vec<TutorSession>> {
        repository::get_sessions(conn)
    }

    pub fn get_session(db: &Database, session_id: &str) -> Result<Option<TutorSession>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::get_session(&conn, session_id)
    }

    pub fn get_session_conn(conn: &rusqlite::Connection, session_id: &str) -> Result<Option<TutorSession>> {
        repository::get_session(conn, session_id)
    }

    pub fn save_session(db: &Database, session: &TutorSession) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::save_session(&conn, session)
    }

    pub fn save_session_conn(conn: &rusqlite::Connection, session: &TutorSession) -> Result<()> {
        repository::save_session(conn, session)
    }

    pub fn delete_session(db: &Database, session_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::delete_session(&conn, session_id)
    }

    pub fn delete_session_conn(conn: &rusqlite::Connection, session_id: &str) -> Result<bool> {
        repository::delete_session(conn, session_id)
    }

    pub fn get_messages(db: &Database, session_id: &str) -> Result<Vec<TutorMessage>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::get_messages(&conn, session_id)
    }

    pub fn get_messages_conn(conn: &rusqlite::Connection, session_id: &str) -> Result<Vec<TutorMessage>> {
        repository::get_messages(conn, session_id)
    }

    pub fn save_message(db: &Database, message: &TutorMessage) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::save_message(&conn, message)
    }

    pub fn save_message_conn(conn: &rusqlite::Connection, message: &TutorMessage) -> Result<()> {
        repository::save_message(conn, message)
    }

    pub fn get_memories(db: &Database) -> Result<Vec<TutorMemory>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::get_memories(&conn)
    }

    pub fn get_memories_conn(conn: &rusqlite::Connection) -> Result<Vec<TutorMemory>> {
        repository::get_memories(conn)
    }

    pub fn save_memory(db: &Database, memory: &TutorMemory) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::save_memory(&conn, memory)
    }

    pub fn save_memory_conn(conn: &rusqlite::Connection, memory: &TutorMemory) -> Result<()> {
        repository::save_memory(conn, memory)
    }

    pub fn delete_memory(db: &Database, memory_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::delete_memory(&conn, memory_id)
    }

    pub fn delete_memory_conn(conn: &rusqlite::Connection, memory_id: &str) -> Result<bool> {
        repository::delete_memory(conn, memory_id)
    }
}
