use crate::db::DbState;
use chrono::{Datelike, Duration, NaiveDate, Utc};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use synapse_core::domain::habits::{Habit, HabitLog};
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CreateHabitPayload {
    pub id: Option<String>,
    pub title: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub target_days_per_week: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateHabitPayload {
    pub title: Option<String>,
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
pub struct HabitStats {
    #[serde(rename = "currentStreak")]
    pub current_streak: i32,
    #[serde(rename = "bestStreak")]
    pub best_streak: i32,
    #[serde(rename = "totalCompleted")]
    pub total_completed: i32,
    #[serde(rename = "completionRate30Days")]
    pub completion_rate_30_days: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HabitWithLogs {
    pub habit: Habit,
    pub logs: Vec<HabitLog>,
    pub stats: HabitStats,
}

fn calculate_habit_stats(logs: &[HabitLog]) -> HabitStats {
    let today = Utc::now().date_naive();
    let date_set: HashSet<NaiveDate> = logs
        .iter()
        .filter_map(|l| NaiveDate::parse_from_str(l.date.trim(), "%Y-%m-%d").ok())
        .collect();

    let total_completed = date_set.len() as i32;

    let mut current_streak = 0;
    if date_set.contains(&today) {
        current_streak = 1;
        let mut prev = today - Duration::days(1);
        while date_set.contains(&prev) {
            current_streak += 1;
            prev -= Duration::days(1);
        }
    } else {
        let yesterday = today - Duration::days(1);
        if date_set.contains(&yesterday) {
            current_streak = 1;
            let mut prev = yesterday - Duration::days(1);
            while date_set.contains(&prev) {
                current_streak += 1;
                prev -= Duration::days(1);
            }
        }
    }

    let mut sorted_dates: Vec<NaiveDate> = date_set.iter().copied().collect();
    sorted_dates.sort();

    let mut best_streak = 0;
    let mut current_chain = 0;
    let mut last_date: Option<NaiveDate> = None;

    for d in sorted_dates {
        match last_date {
            None => current_chain = 1,
            Some(prev) => {
                if d == prev + Duration::days(1) {
                    current_chain += 1;
                } else {
                    current_chain = 1;
                }
            }
        }
        if current_chain > best_streak {
            best_streak = current_chain;
        }
        last_date = Some(d);
    }

    let mut past_30_count = 0;
    for i in 0..30 {
        let check = today - Duration::days(i);
        if date_set.contains(&check) {
            past_30_count += 1;
        }
    }
    let completion_rate_30_days = ((past_30_count as f64 / 30.0) * 100.0).round() as i32;
    let _ = today.year();

    HabitStats {
        current_streak,
        best_streak,
        total_completed,
        completion_rate_30_days,
    }
}

#[tauri::command]
pub fn habits_get_all(db_state: State<'_, DbState>) -> Result<Vec<Habit>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, color, icon, target_days_per_week, created_at, updated_at, deleted_at
             FROM habits
             WHERE deleted_at IS NULL
             ORDER BY title COLLATE NOCASE ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Habit {
                id: row.get(0)?,
                title: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                target_days_per_week: row.get(4).unwrap_or(7),
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for r in rows.flatten() {
        items.push(r);
    }
    Ok(items)
}

#[tauri::command]
pub fn habits_get_by_id(id: String, db_state: State<'_, DbState>) -> Result<Option<Habit>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let res = conn.query_row(
        "SELECT id, title, color, icon, target_days_per_week, created_at, updated_at, deleted_at
         FROM habits
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        |row| {
            Ok(Habit {
                id: row.get(0)?,
                title: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                target_days_per_week: row.get(4).unwrap_or(7),
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
            })
        },
    );

    match res {
        Ok(h) => Ok(Some(h)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn habits_create(
    data: CreateHabitPayload,
    db_state: State<'_, DbState>,
) -> Result<Habit, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let id = data
        .id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let now = Utc::now().to_rfc3339();
    let title = data.title.trim().to_string();
    let color = data.color.unwrap_or_else(|| "emerald".to_string());
    let icon = data.icon.unwrap_or_else(|| "Flame".to_string());
    let target = data.target_days_per_week.unwrap_or(7);

    conn.execute(
        "INSERT INTO habits (id, title, color, icon, target_days_per_week, created_at, updated_at, deleted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, NULL)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            color = excluded.color,
            icon = excluded.icon,
            target_days_per_week = excluded.target_days_per_week,
            updated_at = excluded.updated_at,
            deleted_at = NULL",
        params![id, title, color, icon, target, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Habit {
        id,
        title,
        color: Some(color),
        icon: Some(icon),
        target_days_per_week: target,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    })
}

#[tauri::command]
pub fn habits_update(
    id: String,
    data: UpdateHabitPayload,
    db_state: State<'_, DbState>,
) -> Result<UpdateHabitResponse, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let now = Utc::now().to_rfc3339();
    let count = conn
        .execute(
            "UPDATE habits SET
                title = COALESCE(?1, title),
                color = COALESCE(?2, color),
                icon = COALESCE(?3, icon),
                target_days_per_week = COALESCE(?4, target_days_per_week),
                updated_at = ?5
             WHERE id = ?6 AND deleted_at IS NULL",
            params![
                data.title.map(|t| t.trim().to_string()),
                data.color,
                data.icon,
                data.target_days_per_week,
                now,
                id
            ],
        )
        .map_err(|e| e.to_string())?;

    Ok(UpdateHabitResponse {
        success: count > 0,
    })
}

#[tauri::command]
pub fn habits_delete(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;
    let now = Utc::now().to_rfc3339();

    let count = conn
        .execute(
            "UPDATE habits SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
            params![now, id],
        )
        .map_err(|e| e.to_string())?;

    Ok(count > 0)
}

#[tauri::command]
pub fn habits_get_logs(
    habit_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<HabitLog>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, habit_id, date, completed_at, notes, created_at, updated_at, deleted_at
             FROM habit_logs
             WHERE habit_id = ?1 AND deleted_at IS NULL
             ORDER BY date ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![habit_id], |row| {
            Ok(HabitLog {
                id: row.get(0)?,
                habit_id: row.get(1)?,
                date: row.get(2)?,
                completed_at: row.get(3)?,
                notes: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

#[tauri::command]
pub fn habits_get_all_logs(db_state: State<'_, DbState>) -> Result<Vec<HabitLog>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, habit_id, date, completed_at, notes, created_at, updated_at, deleted_at
             FROM habit_logs
             WHERE deleted_at IS NULL
             ORDER BY date ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(HabitLog {
                id: row.get(0)?,
                habit_id: row.get(1)?,
                date: row.get(2)?,
                completed_at: row.get(3)?,
                notes: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

#[tauri::command]
pub fn habits_toggle_day_log(
    habit_id: String,
    date: String,
    db_state: State<'_, DbState>,
) -> Result<ToggleDayLogResponse, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let composite_id = format!("{}_{}", habit_id, date);
    let now = Utc::now().to_rfc3339();

    let existing: Option<(String, Option<String>)> = conn
        .query_row(
            "SELECT id, deleted_at FROM habit_logs WHERE id = ?1 OR (habit_id = ?2 AND date = ?3) LIMIT 1",
            params![composite_id, habit_id, date],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .ok();

    if let Some((row_id, deleted_at)) = existing {
        if deleted_at.is_none() {
            conn.execute(
                "UPDATE habit_logs SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2",
                params![now, row_id],
            )
            .map_err(|e| e.to_string())?;
            return Ok(ToggleDayLogResponse {
                completed: false,
                log: None,
            });
        } else {
            conn.execute(
                "UPDATE habit_logs SET deleted_at = NULL, completed_at = ?1, updated_at = ?1 WHERE id = ?2",
                params![now, row_id],
            )
            .map_err(|e| e.to_string())?;
            let log = HabitLog {
                id: row_id,
                habit_id,
                date,
                completed_at: Some(now.clone()),
                notes: None,
                created_at: Some(now.clone()),
                updated_at: Some(now),
                deleted_at: None,
            };
            return Ok(ToggleDayLogResponse {
                completed: true,
                log: Some(log),
            });
        }
    }

    conn.execute(
        "INSERT INTO habit_logs (id, habit_id, date, completed_at, created_at, updated_at, deleted_at)
         VALUES (?1, ?2, ?3, ?4, ?4, ?4, NULL)",
        params![composite_id, habit_id, date, now],
    )
    .map_err(|e| e.to_string())?;

    let log = HabitLog {
        id: composite_id,
        habit_id,
        date,
        completed_at: Some(now.clone()),
        notes: None,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    };

    Ok(ToggleDayLogResponse {
        completed: true,
        log: Some(log),
    })
}

#[tauri::command]
pub fn habits_get_with_stats(
    habit_id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<HabitWithLogs>, String> {
    let habit = match habits_get_by_id(habit_id.clone(), db_state.clone())? {
        Some(h) => h,
        None => return Ok(None),
    };
    let logs = habits_get_logs(habit_id, db_state)?;
    let stats = calculate_habit_stats(&logs);

    Ok(Some(HabitWithLogs { habit, logs, stats }))
}
