use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct Deck {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub parent_id: Option<String>,
    #[serde(default)]
    pub card_count: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct HierarchicalDeck {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub parent_id: Option<String>,
    pub depth: i32,
    pub has_children: bool,
    pub children_count: i32,
    pub card_count: i64,
    pub novos: i64,
    pub aprender: i64,
    pub revisar: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct Card {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub deck_id: String,
    #[serde(default)]
    pub front: String,
    #[serde(default)]
    pub back: String,
    pub tags: Option<String>,
    pub card_type: Option<String>,
    pub validation_mode: Option<String>,
    pub extra_note: Option<String>,
    pub media_url: Option<String>,
    pub stability: Option<f64>,
    pub difficulty: Option<f64>,
    pub reps: Option<i32>,
    pub lapses: Option<i32>,
    pub learning_steps: Option<i32>,
    pub state: Option<String>,
    pub due_date: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct AnkiDeckSettings {
    #[serde(default = "default_new_limit")]
    pub new_limit: i32,
    #[serde(default = "default_review_limit")]
    pub review_limit: i32,
    #[serde(default = "default_learning_steps")]
    pub learning_steps: String,
    #[serde(default = "default_relearning_steps")]
    pub relearning_steps: String,
    pub fsrs_weights: Option<String>,
}

impl Default for AnkiDeckSettings {
    fn default() -> Self {
        Self {
            new_limit: default_new_limit(),
            review_limit: default_review_limit(),
            learning_steps: default_learning_steps(),
            relearning_steps: default_relearning_steps(),
            fsrs_weights: None,
        }
    }
}

fn default_new_limit() -> i32 {
    20
}
fn default_review_limit() -> i32 {
    200
}
fn default_learning_steps() -> String {
    "1m,10m".to_string()
}
fn default_relearning_steps() -> String {
    "10m".to_string()
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct DeckStats {
    pub total: i64,
    pub novos: i64,
    pub aprender: i64,
    pub revisar: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct GlobalAnkiStats {
    pub total_cards: i64,
    pub novos: i64,
    pub aprendendo: i64,
    pub maduros: i64,
    pub jovens: i64,
    pub avg_stability: f64,
    pub avg_difficulty: f64,
    pub total_reviews: i64,
    pub errei: i64,
    pub dificil: i64,
    pub bom: i64,
    pub facil: i64,
    pub retention_rate: f64,
}
