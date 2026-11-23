use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[repr(u8)]
pub enum State {
    #[default]
    New = 0,
    Learning = 1,
    Review = 2,
    Relearning = 3,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum Rating {
    Manual = 0,
    Again = 1,
    Hard = 2,
    Good = 3,
    Easy = 4,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub stability: f64,
    pub difficulty: f64,
    pub elapsed_days: i32,
    pub scheduled_days: i32,
    pub learning_steps: i32,
    pub reps: i32,
    pub lapses: i32,
    pub state: State,
    pub due: DateTime<Utc>,
    pub last_review: Option<DateTime<Utc>>,
}

impl Default for Card {
    fn default() -> Self {
        Self {
            stability: 0.0,
            difficulty: 0.0,
            elapsed_days: 0,
            scheduled_days: 0,
            learning_steps: 0,
            reps: 0,
            lapses: 0,
            state: State::New,
            due: Utc::now(),
            last_review: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsrsParameters {
    pub request_retention: f64,
    pub maximum_interval: i32,
    pub weights: Vec<f64>,
    pub learning_steps: Vec<String>,
    pub relearning_steps: Vec<String>,
    pub enable_short_term: bool,
}

impl Default for FsrsParameters {
    fn default() -> Self {
        Self {
            request_retention: 0.9,
            maximum_interval: 36500,
            weights: DEFAULT_WEIGHTS.to_vec(),
            learning_steps: vec!["1m".to_owned(), "10m".to_owned()],
            relearning_steps: vec!["10m".to_owned()],
            enable_short_term: true,
        }
    }
}

pub struct FsrsEngine {
    pub params: FsrsParameters,
}

impl FsrsEngine {
    pub fn new(params: Option<FsrsParameters>) -> Self {
        let mut params = params.unwrap_or_default();
        params.normalize();
        Self { params }
    }
}

pub const DEFAULT_WEIGHTS: [f64; 17] = [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925,
    1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898,
];
