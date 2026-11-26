use serde::{Deserialize, Serialize};

#[derive(Deserialize, Debug, Clone, PartialEq)]
#[serde(
    tag = "actionType",
    rename_all = "lowercase",
    rename_all_fields = "camelCase"
)]
pub enum QuizAssistantQuestionAction {
    Create {
        #[serde(rename = "type", default = "default_question_type")]
        type_: String,
        question: String,
        #[serde(default)]
        options: Vec<String>,
        #[serde(default)]
        correct_index: i32,
        #[serde(default)]
        expected_answer: String,
        #[serde(default)]
        explanation: String,
        #[serde(default)]
        tags: Vec<String>,
    },
    Edit {
        target_question_id: String,
        changes: QuizAssistantQuestionChanges,
    },
    Delete {
        target_question_id: String,
    },
    Reorder {
        order: Vec<String>,
    },
}

fn default_question_type() -> String {
    "multiple_choice".into()
}

#[derive(Deserialize, Debug, Clone, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QuizAssistantQuestionChanges {
    #[serde(rename = "type")]
    pub type_: Option<String>,
    pub question: Option<String>,
    pub options: Option<Vec<String>>,
    pub correct_index: Option<i32>,
    pub expected_answer: Option<String>,
    pub explanation: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct QuizBattery {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub title: String,
    pub description: Option<String>,
    #[serde(default)]
    pub question_count: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct QuizQuestion {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub battery_id: String,
    #[serde(rename = "type", default)]
    pub type_: String,
    #[serde(default)]
    pub question: String,
    #[serde(default)]
    pub options: String, // JSON array string
    pub correct_index: Option<i32>,
    pub expected_answer: Option<String>,
    pub explanation: Option<String>,
    pub tags: Option<String>, // JSON array string
    #[serde(default)]
    pub sort_order: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct QuizAttempt {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub question_id: String,
    #[serde(default)]
    pub battery_id: String,
    #[serde(rename = "type", default)]
    pub type_: String,
    pub selected_index: Option<i32>,
    pub user_answer: Option<String>,
    pub is_correct: i32,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct QuizAttemptDetail {
    pub id: String,
    pub question_id: String,
    pub battery_id: String,
    pub question: String,
    pub type_: String,
    pub selected_index: Option<i32>,
    pub user_typed_answer: Option<String>,
    pub user_answer: Option<String>,
    pub correct_answer: String,
    pub explanation: Option<String>,
    pub is_correct: bool,
    pub duration_ms: i64,
    pub created_at: Option<String>,
    pub ai_feedback: Option<QuizAiFeedback>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct QuizAiFeedback {
    pub verdict: String,
    pub feedback: String,
    pub model: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct QuizOpenAnswerAttempt {
    pub id: String,
    pub question_id: String,
    pub battery_id: String,
    pub user_typed_answer: String,
    pub is_correct: bool,
    pub ai_feedback: QuizAiFeedback,
    pub duration_ms: i64,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct QuizAnswerResult {
    pub attempt_id: String,
    pub is_correct: bool,
    pub correct_index: i32,
    pub correct_answer: String,
    pub explanation: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct QuizStats {
    pub total_batteries: i64,
    pub total_questions: i64,
    pub total_attempts: i64,
    pub answered_questions: i64,
    pub correct_attempts: i64,
    pub incorrect_attempts: i64,
    pub incorrect_questions: i64,
    pub reviewable_incorrect_questions: i64,
    pub accuracy_rate: i64,
}
