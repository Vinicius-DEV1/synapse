pub mod alarms;
pub mod lofi;
pub mod models;
pub mod sessions;
#[cfg(test)]
mod tests;

pub use alarms::*;
pub use lofi::*;
pub use models::*;
pub use sessions::*;

use crate::db::Database;
use crate::error::{Result, SynapseError};

pub struct FocusRepository;

impl FocusRepository {
    pub fn get_lofis(db: &Database) -> Result<Vec<LofiTrack>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        lofi::get_lofis(&conn)
    }

    pub fn get_lofis_conn(conn: &rusqlite::Connection) -> Result<Vec<LofiTrack>> {
        lofi::get_lofis(conn)
    }

    pub fn add_lofi_track(db: &Database, title: &str, file_path: &str, duration: f64) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        lofi::add_lofi_track(&conn, title, file_path, duration)
    }

    pub fn add_lofi_track_conn(conn: &rusqlite::Connection, title: &str, file_path: &str, duration: f64) -> Result<bool> {
        lofi::add_lofi_track(conn, title, file_path, duration)
    }

    pub fn delete_lofi(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        lofi::delete_lofi(&conn, id)
    }

    pub fn delete_lofi_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        lofi::delete_lofi(conn, id)
    }

    pub fn get_sessions(db: &Database) -> Result<Vec<FocusSession>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        sessions::get_focus_sessions(&conn)
    }

    pub fn get_sessions_conn(conn: &rusqlite::Connection) -> Result<Vec<FocusSession>> {
        sessions::get_focus_sessions(conn)
    }

    pub fn record_session(
        db: &Database,
        tag: &str,
        target_minutes: i32,
        status: &str,
        summary: &str,
        description: &str,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        sessions::record_focus_session(&conn, tag, target_minutes, status, summary, description)
    }

    pub fn record_session_conn(
        conn: &rusqlite::Connection,
        tag: &str,
        target_minutes: i32,
        status: &str,
        summary: &str,
        description: &str,
    ) -> Result<bool> {
        sessions::record_focus_session(conn, tag, target_minutes, status, summary, description)
    }

    pub fn create_session(db: &Database, session: FocusSession) -> Result<String> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        sessions::create_focus_session(&conn, session)
    }

    pub fn create_session_conn(conn: &rusqlite::Connection, session: FocusSession) -> Result<String> {
        sessions::create_focus_session(conn, session)
    }

    pub fn delete_session(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        sessions::delete_focus_session(&conn, id)
    }

    pub fn delete_session_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        sessions::delete_focus_session(conn, id)
    }

    pub fn get_alarms(db: &Database) -> Result<Vec<FocusAlarm>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        alarms::get_alarms(&conn)
    }

    pub fn get_alarms_conn(conn: &rusqlite::Connection) -> Result<Vec<FocusAlarm>> {
        alarms::get_alarms(conn)
    }

    pub fn create_alarm(
        db: &Database,
        time: &str,
        label: &str,
        sound: &str,
        enabled: bool,
        days: &str,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        alarms::create_alarm(&conn, time, label, sound, enabled, days)
    }

    pub fn create_alarm_conn(
        conn: &rusqlite::Connection,
        time: &str,
        label: &str,
        sound: &str,
        enabled: bool,
        days: &str,
    ) -> Result<bool> {
        alarms::create_alarm(conn, time, label, sound, enabled, days)
    }

    pub fn upsert_alarm(db: &Database, alarm: FocusAlarm) -> Result<FocusAlarm> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        alarms::upsert_alarm(&conn, alarm)
    }

    pub fn upsert_alarm_conn(conn: &rusqlite::Connection, alarm: FocusAlarm) -> Result<FocusAlarm> {
        alarms::upsert_alarm(conn, alarm)
    }

    pub fn update_alarm(
        db: &Database,
        id: &str,
        time: &str,
        label: &str,
        sound: &str,
        enabled: bool,
        days: &str,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        alarms::update_alarm(&conn, id, time, label, sound, enabled, days)
    }

    pub fn update_alarm_conn(
        conn: &rusqlite::Connection,
        id: &str,
        time: &str,
        label: &str,
        sound: &str,
        enabled: bool,
        days: &str,
    ) -> Result<bool> {
        alarms::update_alarm(conn, id, time, label, sound, enabled, days)
    }

    pub fn toggle_alarm(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        alarms::toggle_alarm(&conn, id)
    }

    pub fn toggle_alarm_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        alarms::toggle_alarm(conn, id)
    }

    pub fn delete_alarm(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        alarms::delete_alarm(&conn, id)
    }

    pub fn delete_alarm_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        alarms::delete_alarm(conn, id)
    }
}
