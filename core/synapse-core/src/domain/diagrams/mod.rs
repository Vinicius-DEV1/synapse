//! Diagrams domain module.

pub mod models;
pub mod repository;
#[cfg(test)]
pub mod tests;

use crate::db::Database;
use crate::error::{Result, SynapseError};
pub use models::{DiagramMeta, DiagramRecord};

/// Diagrams repository providing high-level typed domain access.
pub struct DiagramsRepository;

impl DiagramsRepository {
    pub fn get_diagrams(db: &Database) -> Result<Vec<DiagramMeta>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::get_diagrams(&conn)
    }

    pub fn get_diagrams_conn(conn: &rusqlite::Connection) -> Result<Vec<DiagramMeta>> {
        repository::get_diagrams(conn)
    }

    pub fn get_diagram(db: &Database, id: &str) -> Result<Option<DiagramRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::get_diagram(&conn, id)
    }

    pub fn get_diagram_conn(conn: &rusqlite::Connection, id: &str) -> Result<Option<DiagramRecord>> {
        repository::get_diagram(conn, id)
    }

    pub fn create_diagram(db: &Database, diagram: &DiagramRecord) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::create_diagram(&conn, diagram)
    }

    pub fn create_diagram_conn(conn: &rusqlite::Connection, diagram: &DiagramRecord) -> Result<()> {
        repository::create_diagram(conn, diagram)
    }

    pub fn save_diagram(
        db: &Database,
        id: &str,
        title: &str,
        content: &str,
        encrypted_content: Option<&str>,
        icon: &str,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::save_diagram(&conn, id, title, content, encrypted_content, icon)
    }

    pub fn save_diagram_conn(
        conn: &rusqlite::Connection,
        id: &str,
        title: &str,
        content: &str,
        encrypted_content: Option<&str>,
        icon: &str,
    ) -> Result<bool> {
        repository::save_diagram(conn, id, title, content, encrypted_content, icon)
    }

    pub fn delete_diagram(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::delete_diagram(&conn, id)
    }

    pub fn delete_diagram_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        repository::delete_diagram(conn, id)
    }
}
