use super::models::{Habit, HabitLog};
use crate::db::Database;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;

pub struct HabitsRepository;

impl HabitsRepository {
    pub fn get_habits(db: &Database) -> Result<Vec<Habit>> {
        let conn = db.lock().map_err(SynapseError::Database)?;

        let mut stmt = conn.prepare(
            "SELECT id, title, color, icon, target_days_per_week, created_at, updated_at, deleted_at 
             FROM habits 
             WHERE deleted_at IS NULL 
             ORDER BY created_at ASC",
        )?;

        let habits = stmt
            .query_map([], |row| {
                Ok(Habit {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    color: row.get(2)?,
                    icon: row.get(3)?,
                    target_days_per_week: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                    deleted_at: row.get(7)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(habits)
    }

    pub fn create_habit(
        db: &Database,
        title: &str,
        color: Option<&str>,
        icon: Option<&str>,
        target_days: Option<i32>,
    ) -> Result<Habit> {
        let trimmed_title = title.trim();
        if trimmed_title.is_empty() {
            return Err(SynapseError::Validation("Habit title cannot be empty".into()));
        }

        let id = uuid::Uuid::new_v4().to_string();
        let resolved_color = color
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .unwrap_or("#10b981")
            .to_string();
        let resolved_icon = icon
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .unwrap_or("⭐")
            .to_string();
        let resolved_target = target_days.filter(|&d| (1..=7).contains(&d)).unwrap_or(7);
        let now = Utc::now().to_rfc3339();

        let conn = db.lock().map_err(SynapseError::Database)?;
        conn.execute(
            "INSERT INTO habits (id, title, color, icon, target_days_per_week, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![id, trimmed_title, resolved_color, resolved_icon, resolved_target, now, now],
        )?;

        Ok(Habit {
            id,
            title: trimmed_title.to_string(),
            color: Some(resolved_color),
            icon: Some(resolved_icon),
            target_days_per_week: resolved_target,
            created_at: Some(now.clone()),
            updated_at: Some(now),
            deleted_at: None,
        })
    }

    pub fn update_habit(
        db: &Database,
        habit_id: &str,
        title: &str,
        color: Option<&str>,
        icon: Option<&str>,
        target_days: Option<i32>,
    ) -> Result<()> {
        let trimmed_id = habit_id.trim();
        let trimmed_title = title.trim();
        if trimmed_id.is_empty() || trimmed_title.is_empty() {
            return Err(SynapseError::Validation("ID and title cannot be empty".into()));
        }

        let resolved_color = color
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .unwrap_or("#10b981");
        let resolved_icon = icon
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .unwrap_or("⭐");
        let resolved_target = target_days.filter(|&d| (1..=7).contains(&d)).unwrap_or(7);
        let now = Utc::now().to_rfc3339();

        let conn = db.lock().map_err(SynapseError::Database)?;
        let count = conn.execute(
            "UPDATE habits 
             SET title = ?, color = ?, icon = ?, target_days_per_week = ?, updated_at = ? 
             WHERE id = ? AND deleted_at IS NULL",
            params![trimmed_title, resolved_color, resolved_icon, resolved_target, now, trimmed_id],
        )?;

        if count == 0 {
            return Err(SynapseError::NotFound(format!("Habit {} not found", trimmed_id)));
        }

        Ok(())
    }

    pub fn delete_habit(db: &Database, habit_id: &str) -> Result<()> {
        let trimmed_id = habit_id.trim();
        if trimmed_id.is_empty() {
            return Err(SynapseError::Validation("ID cannot be empty".into()));
        }

        let now = Utc::now().to_rfc3339();
        let conn = db.lock().map_err(SynapseError::Database)?;
        let count = conn.execute(
            "UPDATE habits SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
            params![now, now, trimmed_id],
        )?;

        if count == 0 {
            return Err(SynapseError::NotFound(format!("Habit {} not found", trimmed_id)));
        }

        Ok(())
    }

    pub fn get_habit_logs_range(db: &Database, start_date: &str, end_date: &str) -> Result<Vec<HabitLog>> {
        let conn = db.lock().map_err(SynapseError::Database)?;

        let mut stmt = conn.prepare(
            "SELECT id, habit_id, date, completed_at, notes, created_at, updated_at, deleted_at 
             FROM habit_logs 
             WHERE date >= ? AND date <= ? AND deleted_at IS NULL 
             ORDER BY date ASC",
        )?;

        let logs = stmt
            .query_map(params![start_date, end_date], |row| {
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
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(logs)
    }

    pub fn get_habit_logs(db: &Database, date: &str) -> Result<Vec<HabitLog>> {
        Self::get_habit_logs_range(db, date, date)
    }

    pub fn toggle_habit_checkin(db: &Database, habit_id: &str, date: &str) -> Result<bool> {
        Self::toggle_habit(db, habit_id, date)
    }

    pub fn toggle_habit(db: &Database, habit_id: &str, date: &str) -> Result<bool> {
        let trimmed_id = habit_id.trim();
        let trimmed_date = date.trim();
        if trimmed_id.is_empty() || trimmed_date.is_empty() {
            return Err(SynapseError::Validation("ID and date cannot be empty".into()));
        }

        let conn = db.lock().map_err(SynapseError::Database)?;

        let existing_id: Option<String> = conn
            .query_row(
                "SELECT id FROM habit_logs WHERE habit_id = ? AND date = ? AND deleted_at IS NULL",
                params![trimmed_id, trimmed_date],
                |row| row.get(0),
            )
            .ok();

        if let Some(log_id) = existing_id {
            // Uncheck / delete log
            let now = Utc::now().to_rfc3339();
            conn.execute(
                "UPDATE habit_logs SET deleted_at = ?, updated_at = ? WHERE id = ?",
                params![now, now, log_id],
            )?;
            Ok(false)
        } else {
            // Check / insert log
            let new_id = uuid::Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            conn.execute(
                "INSERT INTO habit_logs (id, habit_id, date, completed_at, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?)",
                params![new_id, trimmed_id, trimmed_date, now, now, now],
            )?;
            Ok(true)
        }
    }
}
