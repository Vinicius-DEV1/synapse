pub mod calendar_reminders;
pub mod models;
pub mod repository;
#[cfg(test)]
mod tests;

pub use calendar_reminders::sync_calendar_reminders as sync_calendar_reminders_conn;
pub use models::*;
pub use repository::*;

use crate::db::Database;
use crate::error::{Result, SynapseError};

pub struct NotificationsRepository;

impl NotificationsRepository {
    pub fn get_notifications(db: &Database) -> Result<Vec<AppNotification>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::get_notifications(&conn)
    }

    pub fn get_notifications_conn(conn: &rusqlite::Connection) -> Result<Vec<AppNotification>> {
        repository::get_notifications(conn)
    }

    pub fn get_unread_count(db: &Database) -> Result<i32> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::get_unread_count(&conn)
    }

    pub fn get_unread_count_conn(conn: &rusqlite::Connection) -> Result<i32> {
        repository::get_unread_count(conn)
    }

    pub fn sync_calendar_reminders(
        db: &Database,
        requests: &[CalendarReminderRequest],
    ) -> Result<CalendarReminderSyncResult> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        calendar_reminders::sync_calendar_reminders(&conn, requests)
    }

    pub fn mark_delivered(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::mark_notification_delivered(&conn, id)
    }

    pub fn deliver_due_notifications(db: &Database) -> Result<Vec<AppNotification>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::deliver_due_notifications(&conn)
    }

    pub fn add_notification(
        db: &Database,
        title: &str,
        message: &str,
        notification_type: &str,
        target_page_id: Option<&str>,
        event_id: Option<&str>,
        scheduled_for: Option<&str>,
    ) -> Result<AppNotification> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::add_notification(
            &conn,
            title,
            message,
            notification_type,
            target_page_id,
            event_id,
            scheduled_for,
        )
    }

    pub fn snooze_notification(
        db: &Database,
        id: &str,
        delay_minutes: u32,
        title_suffix: &str,
    ) -> Result<AppNotification> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::snooze_notification(&conn, id, delay_minutes, title_suffix)
    }

    pub fn add_notification_conn(
        conn: &rusqlite::Connection,
        title: &str,
        message: &str,
        notification_type: &str,
        target_page_id: Option<&str>,
        event_id: Option<&str>,
        scheduled_for: Option<&str>,
    ) -> Result<AppNotification> {
        repository::add_notification(
            conn,
            title,
            message,
            notification_type,
            target_page_id,
            event_id,
            scheduled_for,
        )
    }

    pub fn mark_read(db: &Database, id: Option<&str>) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::mark_notification_read(&conn, id)
    }

    pub fn mark_read_conn(conn: &rusqlite::Connection, id: Option<&str>) -> Result<bool> {
        repository::mark_notification_read(conn, id)
    }

    pub fn delete_notification(db: &Database, id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::delete_notification(&conn, id)
    }

    pub fn delete_notification_conn(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
        repository::delete_notification(conn, id)
    }

    pub fn clear_all(db: &Database) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        repository::clear_all_notifications(&conn)
    }

    pub fn clear_all_conn(conn: &rusqlite::Connection) -> Result<bool> {
        repository::clear_all_notifications(conn)
    }
}
