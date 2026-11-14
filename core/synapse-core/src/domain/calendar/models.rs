use serde::{Deserialize, Serialize};

fn default_calendar_type() -> String {
    "event".to_string()
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    #[serde(rename = "type", default = "default_calendar_type")]
    pub type_: String,
    pub status: String,
    pub color: String,
    pub page_id: Option<String>,
    pub reminders: Option<serde_json::Value>,
    pub notified_reminders: Option<serde_json::Value>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}
