use super::models::{
    CalendarReminderRequestRecord, CalendarReminderSyncRecord, NotificationRecord,
};
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::notifications::NotificationsRepository;
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseNotificationsStore {
    database: Database,
}

#[uniffi::export]
impl SynapseNotificationsStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_notifications(&self) -> Result<Vec<NotificationRecord>, SynapseError> {
        NotificationsRepository::get_notifications(&self.database)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn get_unread_count(&self) -> Result<i32, SynapseError> {
        NotificationsRepository::get_unread_count(&self.database).map_err(map_core_error)
    }

    pub fn sync_calendar_reminders(
        &self,
        requests: Vec<CalendarReminderRequestRecord>,
    ) -> Result<CalendarReminderSyncRecord, SynapseError> {
        let requests = requests
            .into_iter()
            .map(
                |request| synapse_core::domain::notifications::CalendarReminderRequest {
                    event_id: request.event_id,
                    reminder_minutes: request.reminder_minutes,
                    title: request.title,
                    message: request.message,
                    target_page_id: request.target_page_id,
                    scheduled_for: request.scheduled_for,
                },
            )
            .collect::<Vec<_>>();
        NotificationsRepository::sync_calendar_reminders(&self.database, &requests)
            .map(|result| CalendarReminderSyncRecord {
                scheduled_notifications: result
                    .scheduled_notifications
                    .into_iter()
                    .map(Into::into)
                    .collect(),
                cancelled_ids: result.cancelled_ids,
            })
            .map_err(map_core_error)
    }

    pub fn mark_delivered(&self, id: String) -> Result<bool, SynapseError> {
        NotificationsRepository::mark_delivered(&self.database, &id).map_err(map_core_error)
    }

    pub fn snooze_notification(
        &self,
        id: String,
        delay_minutes: u32,
        title_suffix: String,
    ) -> Result<NotificationRecord, SynapseError> {
        NotificationsRepository::snooze_notification(
            &self.database,
            &id,
            delay_minutes,
            &title_suffix,
        )
        .map(Into::into)
        .map_err(map_core_error)
    }

    pub fn mark_read(&self, id: Option<String>) -> Result<bool, SynapseError> {
        NotificationsRepository::mark_read(&self.database, id.as_deref()).map_err(map_core_error)
    }

    pub fn delete_notification(&self, id: String) -> Result<bool, SynapseError> {
        NotificationsRepository::delete_notification(&self.database, &id).map_err(map_core_error)
    }

    pub fn clear_all(&self) -> Result<bool, SynapseError> {
        NotificationsRepository::clear_all(&self.database).map_err(map_core_error)
    }
}
