//! Practice and AI tutor domain models.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct TutorSession {
    pub id: String,
    pub title: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub custom_prompt: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct TutorMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub text_content: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct TutorMemory {
    pub id: String,
    pub category: String,
    pub fact: String,
    pub created_at: Option<String>,
    pub deleted_at: Option<String>,
}
