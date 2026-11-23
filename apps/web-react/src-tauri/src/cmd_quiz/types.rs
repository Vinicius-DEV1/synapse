use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct QuizBatteryDto {
    pub id: String,
    pub parent_id: Option<String>,
    pub page_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub layout: String,
    pub tags: Vec<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct QuizQuestionDto {
    pub id: String,
    pub battery_id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub question: String,
    pub options: Vec<String>,
    pub correct_index: i32,
    pub expected_answer: Option<String>,
    pub explanation: Option<String>,
    pub tags: Vec<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct QuizAttemptDto {
    pub id: String,
    pub question_id: String,
    pub battery_id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub selected_index: Option<i32>,
    pub user_typed_answer: Option<String>,
    pub is_correct: bool,
    pub ai_feedback: Option<Value>,
    pub duration_ms: Option<i32>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct QuizPageLinkDto {
    pub id: String,
    pub battery_id: String,
    pub page_id: String,
    pub created_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct TagStatEntry {
    pub total: i32,
    pub correct: i32,
    pub answered: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct QuizStatsDto {
    #[serde(rename = "totalBatteries")]
    pub total_batteries: i32,
    #[serde(rename = "totalQuestions")]
    pub total_questions: i32,
    #[serde(rename = "answeredQuestions")]
    pub answered_questions: i32,
    #[serde(rename = "correctAnswers")]
    pub correct_answers: i32,
    #[serde(rename = "incorrectAnswers")]
    pub incorrect_answers: i32,
    #[serde(rename = "accuracyRate")]
    pub accuracy_rate: i32,
    #[serde(rename = "tagStats")]
    pub tag_stats: HashMap<String, TagStatEntry>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LinkedPageInfo {
    pub id: String,
    pub title: String,
    pub icon: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BatteryWithQuestionsDto {
    pub id: String,
    pub parent_id: Option<String>,
    pub page_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub layout: String,
    pub tags: Vec<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
    pub questions: Vec<QuizQuestionDto>,
    #[serde(rename = "latestAttempts")]
    pub latest_attempts: HashMap<String, QuizAttemptDto>,
    #[serde(rename = "linkedPages")]
    pub linked_pages: Vec<LinkedPageInfo>,
}

pub fn parse_json_string_vec(raw: Option<String>) -> Vec<String> {
    match raw {
        Some(s) if !s.trim().is_empty() => {
            serde_json::from_str::<Vec<String>>(&s).unwrap_or_default()
        }
        _ => Vec::new(),
    }
}
