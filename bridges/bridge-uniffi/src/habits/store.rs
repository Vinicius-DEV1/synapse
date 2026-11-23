use super::models::{HabitLogRecord, HabitRecord, HabitSnapshotRecord};
use crate::errors::map_core_error;
use crate::SynapseError;
use chrono::NaiveDate;
use std::collections::HashMap;
use std::sync::Arc;
use synapse_core::domain::habits::{calculate_habit_stats, HabitsRepository};
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseHabitsStore {
    database: Database,
}

#[uniffi::export]
impl SynapseHabitsStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_snapshots(
        &self,
        start_date: String,
        end_date: String,
        today: String,
    ) -> Result<Vec<HabitSnapshotRecord>, SynapseError> {
        let today = NaiveDate::parse_from_str(&today, "%Y-%m-%d").map_err(|error| {
            SynapseError::InvalidInput {
                msg: format!("Invalid stats date: {error}"),
            }
        })?;
        let habits = HabitsRepository::get_habits(&self.database).map_err(map_core_error)?;
        let recent_logs =
            HabitsRepository::get_habit_logs_range(&self.database, &start_date, &end_date)
                .map_err(map_core_error)?;
        let all_logs =
            HabitsRepository::get_all_active_logs(&self.database).map_err(map_core_error)?;
        let mut recent_by_habit: HashMap<String, Vec<_>> = HashMap::new();
        let mut all_by_habit: HashMap<String, Vec<_>> = HashMap::new();
        for log in recent_logs {
            recent_by_habit
                .entry(log.habit_id.clone())
                .or_default()
                .push(log);
        }
        for log in all_logs {
            all_by_habit
                .entry(log.habit_id.clone())
                .or_default()
                .push(log);
        }

        Ok(habits
            .into_iter()
            .map(|habit| {
                let logs = recent_by_habit.remove(&habit.id).unwrap_or_default();
                let stats = calculate_habit_stats(
                    all_by_habit
                        .get(&habit.id)
                        .map(Vec::as_slice)
                        .unwrap_or_default(),
                    today,
                );
                HabitSnapshotRecord {
                    habit: habit.into(),
                    recent_logs: logs.into_iter().map(HabitLogRecord::from).collect(),
                    stats: stats.into(),
                }
            })
            .collect())
    }

    pub fn create_habit(
        &self,
        title: String,
        category: String,
        color: Option<String>,
        icon: Option<String>,
        target_days_per_week: i32,
    ) -> Result<HabitRecord, SynapseError> {
        HabitsRepository::create_habit_with_category(
            &self.database,
            &title,
            Some(&category),
            color.as_deref(),
            icon.as_deref(),
            Some(target_days_per_week),
        )
        .map(Into::into)
        .map_err(map_core_error)
    }

    pub fn update_habit(&self, habit: HabitRecord) -> Result<bool, SynapseError> {
        let category = habit.category.clone();
        HabitsRepository::update_habit_with_category(
            &self.database,
            &habit.id,
            &habit.title,
            category.as_deref(),
            habit.color.as_deref(),
            habit.icon.as_deref(),
            Some(habit.target_days_per_week),
        )
        .map(|()| true)
        .map_err(map_core_error)
    }

    pub fn toggle_checkin(&self, habit_id: String, date: String) -> Result<bool, SynapseError> {
        HabitsRepository::toggle_habit_checkin(&self.database, &habit_id, &date)
            .map_err(map_core_error)
    }

    pub fn delete_habit(&self, habit_id: String) -> Result<bool, SynapseError> {
        HabitsRepository::delete_habit(&self.database, &habit_id)
            .map(|()| true)
            .map_err(map_core_error)
    }
}
