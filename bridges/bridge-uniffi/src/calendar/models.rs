#[derive(uniffi::Record, Clone)]
pub struct CalendarEventRecord {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub event_type: String,
    pub status: String,
    pub color: String,
    pub page_id: Option<String>,
    pub reminders: Vec<i32>,
    pub notified_reminders: Vec<i32>,
    pub recurrence_rule: Option<String>,
}
