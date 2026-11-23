#[derive(uniffi::Record, Clone)]
pub struct HabitRecord {
    pub id: String,
    pub title: String,
    pub category: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub target_days_per_week: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct HabitLogRecord {
    pub id: String,
    pub habit_id: String,
    pub date: String,
    pub completed_at: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct HabitStatsRecord {
    pub current_streak: i32,
    pub best_streak: i32,
    pub total_completed: i32,
    pub completion_rate_30_days: i32,
}

#[derive(uniffi::Record, Clone)]
pub struct HabitSnapshotRecord {
    pub habit: HabitRecord,
    pub recent_logs: Vec<HabitLogRecord>,
    pub stats: HabitStatsRecord,
}
