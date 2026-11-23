use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use synapse_core::domain::habits::{
    calculate_habit_stats, Habit, HabitLog, HabitStats, HabitsRepository,
};
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CreateHabitPayload {
    pub id: Option<String>,
    pub title: String,
    pub category: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub target_days_per_week: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateHabitPayload {
    pub title: Option<String>,
    pub category: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub target_days_per_week: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateHabitResponse {
    pub success: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ToggleDayLogResponse {
    pub completed: bool,
    pub log: Option<HabitLog>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HabitWithLogs {
    pub habit: Habit,
    pub logs: Vec<HabitLog>,
    pub stats: HabitStats,
}

#[tauri::command]
pub async fn habits_get_all(db_state: State<'_, DbState>) -> Result<Vec<Habit>, String> {
    db_state
        .read(|conn| HabitsRepository::get_habits_conn(conn).map_err(|error| error.to_string()))
        .await
}

#[tauri::command]
pub async fn habits_get_by_id(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<Habit>, String> {
    db_state
        .read(move |conn| {
            HabitsRepository::get_habit_conn(conn, &id).map_err(|error| error.to_string())
        })
        .await
}

#[tauri::command]
pub async fn habits_create(
    data: CreateHabitPayload,
    db_state: State<'_, DbState>,
) -> Result<Habit, String> {
    db_state
        .write(move |conn| {
            HabitsRepository::upsert_habit_with_category_conn(
                conn,
                data.id.as_deref(),
                &data.title,
                data.category.as_deref(),
                data.color.as_deref(),
                data.icon.as_deref(),
                data.target_days_per_week,
            )
            .map_err(|error| error.to_string())
        })
        .await
}

#[tauri::command]
pub async fn habits_update(
    id: String,
    data: UpdateHabitPayload,
    db_state: State<'_, DbState>,
) -> Result<UpdateHabitResponse, String> {
    db_state
        .write(move |conn| {
            let Some(existing) =
                HabitsRepository::get_habit_conn(conn, &id).map_err(|error| error.to_string())?
            else {
                return Ok(UpdateHabitResponse { success: false });
            };
            let title = data.title.unwrap_or(existing.title);
            let category = data.category.or(existing.category);
            let color = data.color.or(existing.color);
            let icon = data.icon.or(existing.icon);
            let target_days = data
                .target_days_per_week
                .unwrap_or(existing.target_days_per_week);
            HabitsRepository::update_habit_with_category_conn(
                conn,
                &id,
                &title,
                category.as_deref(),
                color.as_deref(),
                icon.as_deref(),
                Some(target_days),
            )
            .map(|()| UpdateHabitResponse { success: true })
            .map_err(|error| error.to_string())
        })
        .await
}

#[tauri::command]
pub async fn habits_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    db_state
        .write(
            move |conn| match HabitsRepository::delete_habit_conn(conn, &id) {
                Ok(()) => Ok(true),
                Err(synapse_core::error::SynapseError::NotFound(_)) => Ok(false),
                Err(error) => Err(error.to_string()),
            },
        )
        .await
}

#[tauri::command]
pub async fn habits_get_logs(
    habit_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<HabitLog>, String> {
    db_state
        .read(move |conn| {
            HabitsRepository::get_logs_for_habit_conn(conn, &habit_id)
                .map_err(|error| error.to_string())
        })
        .await
}

#[tauri::command]
pub async fn habits_get_all_logs(db_state: State<'_, DbState>) -> Result<Vec<HabitLog>, String> {
    db_state
        .read(|conn| {
            HabitsRepository::get_all_active_logs_conn(conn).map_err(|error| error.to_string())
        })
        .await
}

#[tauri::command]
pub async fn habits_toggle_day_log(
    habit_id: String,
    date: String,
    db_state: State<'_, DbState>,
) -> Result<ToggleDayLogResponse, String> {
    db_state
        .write(move |conn| {
            let completed = HabitsRepository::toggle_habit_checkin_conn(conn, &habit_id, &date)
                .map_err(|error| error.to_string())?;
            let log = if completed {
                HabitsRepository::get_habit_logs_range_conn(conn, &date, &date)
                    .map_err(|error| error.to_string())?
                    .into_iter()
                    .find(|log| log.habit_id == habit_id)
            } else {
                None
            };
            Ok(ToggleDayLogResponse { completed, log })
        })
        .await
}

#[tauri::command]
pub async fn habits_get_with_stats(
    habit_id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<HabitWithLogs>, String> {
    db_state
        .read(move |conn| {
            let habit = HabitsRepository::get_habit_conn(conn, &habit_id)
                .map_err(|error| error.to_string())?;
            let Some(habit) = habit else { return Ok(None) };
            let logs: Vec<HabitLog> = HabitsRepository::get_logs_for_habit_conn(conn, &habit_id)
                .map_err(|error| error.to_string())?;
            let stats = calculate_habit_stats(&logs, Utc::now().date_naive());
            Ok(Some(HabitWithLogs { habit, logs, stats }))
        })
        .await
}
