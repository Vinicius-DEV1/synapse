#[derive(uniffi::Record, Clone)]
pub struct PracticeSessionRecord {
    pub id: String,
    pub title: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub custom_prompt: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct PracticeMessageRecord {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub text_content: String,
    pub created_at: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct PracticeMemoryRecord {
    pub id: String,
    pub category: String,
    pub fact: String,
    pub created_at: Option<String>,
    pub deleted_at: Option<String>,
}
