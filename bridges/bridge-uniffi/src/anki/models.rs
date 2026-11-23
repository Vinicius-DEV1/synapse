#[derive(uniffi::Record, Clone)]
pub struct AnkiDeckRecord {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub parent_id: Option<String>,
    pub depth: i32,
    pub has_children: bool,
    pub children_count: i32,
    pub card_count: i64,
    pub new_count: i64,
    pub learning_count: i64,
    pub review_count: i64,
}

#[derive(uniffi::Record, Clone)]
pub struct AnkiCardRecord {
    pub id: String,
    pub deck_id: String,
    pub front: String,
    pub back: String,
    pub tags: Option<String>,
    pub card_type: Option<String>,
    pub extra_note: Option<String>,
    pub stability: f64,
    pub difficulty: f64,
    pub reps: i32,
    pub lapses: i32,
    pub learning_steps: i32,
    pub state: Option<String>,
    pub due_date: Option<String>,
    pub created_at: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct AnkiSettingsRecord {
    pub new_limit: i32,
    pub review_limit: i32,
    pub learning_steps: String,
    pub relearning_steps: String,
    pub fsrs_weights: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct AnkiStatsRecord {
    pub total_cards: i64,
    pub new_count: i64,
    pub learning_count: i64,
    pub mature_count: i64,
    pub young_count: i64,
    pub total_reviews: i64,
    pub again_count: i64,
    pub hard_count: i64,
    pub good_count: i64,
    pub easy_count: i64,
    pub retention_rate: f64,
}
