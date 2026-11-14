pub mod events;
pub mod models;
#[cfg(test)]
mod tests;

pub use events::*;
pub use models::*;

use crate::db::Database;
use crate::error::{Result, SynapseError};

pub struct CalendarRepository;

impl CalendarRepository {
    pub fn get_events(db: &Database) -> Result<Vec<CalendarEvent>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        events::get_calendar_events(&conn)
    }

    pub fn get_events_conn(conn: &rusqlite::Connection) -> Result<Vec<CalendarEvent>> {
        events::get_calendar_events(conn)
    }

    pub fn get_event(db: &Database, id: &str) -> Result<Option<CalendarEvent>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        events::get_calendar_event(&conn, id)
    }

    pub fn get_event_conn(conn: &rusqlite::Connection, id: &str) -> Result<Option<CalendarEvent>> {
        events::get_calendar_event(conn, id)
    }

    pub fn create_event(
        db: &Database,
        title: &str,
        description: &str,
        start_date: &str,
        end_date: &str,
        event_type: &str,
        color: &str,
        page_id: Option<&str>,
    ) -> Result<Option<CalendarEvent>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        events::create_calendar_event(&conn, title, description, start_date, end_date, event_type, color, page_id)
    }

    pub fn create_event_conn(
        conn: &rusqlite::Connection,
        title: &str,
        description: &str,
        start_date: &str,
        end_date: &str,
        event_type: &str,
        color: &str,
        page_id: Option<&str>,
    ) -> Result<Option<CalendarEvent>> {
        events::create_calendar_event(conn, title, description, start_date, end_date, event_type, color, page_id)
    }

    pub fn update_event(
        db: &Database,
        id: &str,
        title: &str,
        description: &str,
        start_date: &str,
        end_date: &str,
        color: &str,
        event_type: Option<&str>,
        page_id: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        events::update_calendar_event(&conn, id, title, description, start_date, end_date, color, event_type, page_id)
    }

    pub fn update_event_conn(
        conn: &rusqlite::Connection,
        id: &str,
        title: &str,
        description: &str,
        start_date: &str,
        end_date: &str,
        color: &str,
        event_type: Option<&str>,
        page_id: Option<&str>,
    ) -> Result<bool> {
        events::update_calendar_event(conn, id, title, description, start_date, end_date, color, event_type, page_id)
    }

    pub fn toggle_status(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        events::toggle_event_status(&conn, id)
    }

    pub fn toggle_status_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        events::toggle_event_status(conn, id)
    }

    pub fn delete_event(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        events::delete_calendar_event(&conn, id)
    }

    pub fn delete_event_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        events::delete_calendar_event(conn, id)
    }
}
