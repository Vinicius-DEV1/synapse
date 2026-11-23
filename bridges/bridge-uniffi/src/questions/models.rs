#[derive(uniffi::Record, Clone)]
pub struct QuizBatteryRecord {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub question_count: i64,
}

#[derive(uniffi::Record, Clone)]
pub struct QuizQuestionRecord {
    pub id: String,
    pub battery_id: String,
    pub type_: String,
    pub question: String,
    pub options: String,
    pub correct_index: Option<i32>,
    pub expected_answer: Option<String>,
    pub explanation: Option<String>,
    pub tags: Option<String>,
    pub sort_order: i32,
}

#[derive(uniffi::Record, Clone)]
pub struct QuizAnswerRecord {
    pub attempt_id: String,
    pub is_correct: bool,
    pub correct_index: i32,
    pub correct_answer: String,
    pub explanation: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct QuizAttemptRecord {
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
}

impl From<synapse_core::domain::questions::QuizAttemptDetail> for QuizAttemptRecord {
    fn from(value: synapse_core::domain::questions::QuizAttemptDetail) -> Self {
        Self {
            id: value.id,
            question_id: value.question_id,
            battery_id: value.battery_id,
            question: value.question,
            type_: value.type_,
            selected_index: value.selected_index,
            user_typed_answer: value.user_typed_answer,
            user_answer: value.user_answer,
            correct_answer: value.correct_answer,
            explanation: value.explanation,
            is_correct: value.is_correct,
            duration_ms: value.duration_ms,
            created_at: value.created_at,
        }
    }
}

#[derive(uniffi::Record, Clone)]
pub struct QuizStatsRecord {
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
