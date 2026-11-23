use super::models::NotificationRecord;
use synapse_core::domain::notifications::AppNotification;

impl From<AppNotification> for NotificationRecord {
    fn from(notification: AppNotification) -> Self {
        Self {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            notification_type: notification.type_,
            target_page_id: notification.target_page_id,
            event_id: notification.event_id,
            scheduled_for: notification.scheduled_for,
            event_reminder_minutes: notification.event_reminder_minutes,
            fired_at: notification.fired_at,
            is_read: notification.is_read,
            created_at: notification.created_at,
            updated_at: notification.updated_at,
        }
    }
}
