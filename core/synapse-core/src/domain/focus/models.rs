use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct LofiTrack {
    pub id: String,
    pub title: String,
    pub original_name: Option<String>,
    pub duration: f64,
    pub file_path: String,
    pub is_local: i32,
    pub drive_file_id: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct FocusSession {
    pub id: String,
    pub tag: String,
    pub description: String,
    pub target_time_minutes: i32,
    pub status: String,
    pub justification: Option<String>,
    pub summary: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct FocusStats {
    pub completed_sessions_today: i32,
    pub completed_minutes_today: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct FocusAlarm {
    pub id: String,
    pub time: String,
    pub label: Option<String>,
    pub sound: Option<String>,
    pub enabled: i32,
    pub days: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}
