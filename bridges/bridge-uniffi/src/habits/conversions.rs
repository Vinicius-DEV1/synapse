use super::models::{HabitLogRecord, HabitRecord, HabitStatsRecord};
use synapse_core::domain::habits::{Habit, HabitLog, HabitStats};

impl From<Habit> for HabitRecord {
    fn from(value: Habit) -> Self {
        Self {
            id: value.id,
            title: value.title,
            category: value.category,
            color: value.color,
            icon: value.icon,
            target_days_per_week: value.target_days_per_week,
            created_at: value.created_at,
            updated_at: value.updated_at,
            deleted_at: value.deleted_at,
        }
    }
}

impl From<HabitLog> for HabitLogRecord {
    fn from(value: HabitLog) -> Self {
        Self {
            id: value.id,
            habit_id: value.habit_id,
            date: value.date,
            completed_at: value.completed_at,
            notes: value.notes,
            created_at: value.created_at,
            updated_at: value.updated_at,
            deleted_at: value.deleted_at,
        }
    }
}

impl From<HabitStats> for HabitStatsRecord {
    fn from(value: HabitStats) -> Self {
        Self {
            current_streak: value.current_streak,
            best_streak: value.best_streak,
            total_completed: value.total_completed,
            completion_rate_30_days: value.completion_rate_30_days,
        }
    }
}
