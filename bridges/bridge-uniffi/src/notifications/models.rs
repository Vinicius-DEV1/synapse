#[derive(uniffi::Record, Clone)]
pub struct NotificationRecord {
    pub id: String,
    pub title: String,
    pub message: String,
    pub notification_type: String,
    pub target_page_id: Option<String>,
    pub event_id: Option<String>,
    pub scheduled_for: Option<String>,
    pub event_reminder_minutes: Option<i32>,
    pub fired_at: String,
    pub is_read: bool,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct CalendarReminderRequestRecord {
    pub event_id: String,
    pub reminder_minutes: i32,
    pub title: String,
    pub message: String,
    pub target_page_id: Option<String>,
    pub scheduled_for: String,
}

#[derive(uniffi::Record, Clone)]
pub struct CalendarReminderSyncRecord {
    pub scheduled_notifications: Vec<NotificationRecord>,
    pub cancelled_ids: Vec<String>,
}
