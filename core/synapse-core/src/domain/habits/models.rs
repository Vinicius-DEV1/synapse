use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct Habit {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub title: String,
    pub category: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    #[serde(default)]
    pub target_days_per_week: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct HabitLog {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub habit_id: String,
    #[serde(default)]
    pub date: String,
    pub completed_at: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HabitStats {
    pub current_streak: i32,
    pub best_streak: i32,
    pub total_completed: i32,
    pub completion_rate_30_days: i32,
}
