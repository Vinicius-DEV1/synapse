use serde::{Deserialize, Serialize};

fn default_notification_type() -> String {
    "system".to_string()
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(default)]
pub struct AppNotification {
    pub id: String,
    pub title: String,
    pub message: String,
    #[serde(rename = "type", default = "default_notification_type")]
    pub type_: String,
    pub target_page_id: Option<String>,
    pub event_id: Option<String>,
    pub scheduled_for: Option<String>,
    pub fired_at: String,
    pub is_read: bool,
    pub created_at: String,
    pub updated_at: Option<String>,
}
