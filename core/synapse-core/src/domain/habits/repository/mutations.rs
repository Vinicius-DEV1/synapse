use super::super::models::Habit;
use super::HabitsRepository;
use crate::db::Database;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::{params, Connection};

impl HabitsRepository {
    pub fn create_habit(
        db: &Database,
        title: &str,
        color: Option<&str>,
        icon: Option<&str>,
        target_days: Option<i32>,
    ) -> Result<Habit> {
        Self::create_habit_with_category(db, title, None, color, icon, target_days)
    }

    pub fn create_habit_with_category(
        db: &Database,
        title: &str,
        category: Option<&str>,
        color: Option<&str>,
        icon: Option<&str>,
        target_days: Option<i32>,
    ) -> Result<Habit> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::create_habit_with_category_conn(&conn, title, category, color, icon, target_days)
    }

    pub fn create_habit_with_category_conn(
        conn: &Connection,
        title: &str,
        category: Option<&str>,
        color: Option<&str>,
        icon: Option<&str>,
        target_days: Option<i32>,
    ) -> Result<Habit> {
        Self::upsert_habit_with_category_conn(conn, None, title, category, color, icon, target_days)
    }

    pub fn upsert_habit_with_category_conn(
        conn: &Connection,
        id: Option<&str>,
        title: &str,
        category: Option<&str>,
        color: Option<&str>,
        icon: Option<&str>,
        target_days: Option<i32>,
    ) -> Result<Habit> {
        let title = title.trim();
        if title.is_empty() {
            return Err(SynapseError::Validation(
                "Habit title cannot be empty".into(),
            ));
        }
        let id = id
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let category = category
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("Geral");
        let color = color
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("#10b981");
        let icon = icon
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("⭐");
        let target_days = target_days
            .filter(|days| (1..=7).contains(days))
            .unwrap_or(7);
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO habits (id, title, category, color, icon, target_days_per_week, created_at, updated_at, deleted_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, NULL)
             ON CONFLICT(id) DO UPDATE SET title = excluded.title, category = excluded.category,
             color = excluded.color, icon = excluded.icon, target_days_per_week = excluded.target_days_per_week,
             updated_at = excluded.updated_at, deleted_at = NULL",
            params![id, title, category, color, icon, target_days, now],
        )?;
        Ok(Habit {
            id,
            title: title.to_string(),
            category: Some(category.to_string()),
            color: Some(color.to_string()),
            icon: Some(icon.to_string()),
            target_days_per_week: target_days,
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
        Self::update_habit_with_category(db, habit_id, title, None, color, icon, target_days)
    }

    pub fn update_habit_with_category(
        db: &Database,
        habit_id: &str,
        title: &str,
        category: Option<&str>,
        color: Option<&str>,
        icon: Option<&str>,
        target_days: Option<i32>,
    ) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::update_habit_with_category_conn(
            &conn,
            habit_id,
            title,
            category,
            color,
            icon,
            target_days,
        )
    }

    pub fn update_habit_with_category_conn(
        conn: &Connection,
        habit_id: &str,
        title: &str,
        category: Option<&str>,
        color: Option<&str>,
        icon: Option<&str>,
        target_days: Option<i32>,
    ) -> Result<()> {
        let habit_id = habit_id.trim();
        let title = title.trim();
        if habit_id.is_empty() || title.is_empty() {
            return Err(SynapseError::Validation(
                "ID and title cannot be empty".into(),
            ));
        }
        let color = color
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("#10b981");
        let icon = icon
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("⭐");
        let target_days = target_days
            .filter(|days| (1..=7).contains(days))
            .unwrap_or(7);
        let now = Utc::now().to_rfc3339();
        let count = conn.execute(
            "UPDATE habits SET title = ?1, category = COALESCE(?2, category), color = ?3, icon = ?4,
             target_days_per_week = ?5, updated_at = ?6 WHERE id = ?7 AND deleted_at IS NULL",
            params![title, category.map(str::trim), color, icon, target_days, now, habit_id],
        )?;
        if count == 0 {
            return Err(SynapseError::NotFound(format!(
                "Habit {habit_id} not found"
            )));
        }
        Ok(())
    }

    pub fn delete_habit(db: &Database, habit_id: &str) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::delete_habit_conn(&conn, habit_id)
    }

    pub fn delete_habit_conn(conn: &Connection, habit_id: &str) -> Result<()> {
        let habit_id = habit_id.trim();
        if habit_id.is_empty() {
            return Err(SynapseError::Validation("ID cannot be empty".into()));
        }
        let now = Utc::now().to_rfc3339();
        let count = conn.execute(
            "UPDATE habits SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
            params![now, habit_id],
        )?;
        if count == 0 {
            return Err(SynapseError::NotFound(format!(
                "Habit {habit_id} not found"
            )));
        }
        Ok(())
    }

    pub fn toggle_habit_checkin(db: &Database, habit_id: &str, date: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::toggle_habit_checkin_conn(&conn, habit_id, date)
    }

    pub fn toggle_habit_checkin_conn(
        conn: &Connection,
        habit_id: &str,
        date: &str,
    ) -> Result<bool> {
        let habit_id = habit_id.trim();
        let date = date.trim();
        if habit_id.is_empty() || date.is_empty() {
            return Err(SynapseError::Validation(
                "ID and date cannot be empty".into(),
            ));
        }
        let existing: Option<(String, Option<String>)> = conn
            .query_row(
                "SELECT id, deleted_at FROM habit_logs WHERE habit_id = ?1 AND date = ?2
                 ORDER BY (deleted_at IS NULL) DESC, updated_at DESC LIMIT 1",
                params![habit_id, date],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .ok();
        let now = Utc::now().to_rfc3339();
        if let Some((log_id, deleted_at)) = existing {
            if deleted_at.is_some() {
                conn.execute(
                    "UPDATE habit_logs SET deleted_at = NULL, completed_at = ?1, updated_at = ?1 WHERE id = ?2",
                    params![now, log_id],
                )?;
                return Ok(true);
            }
            conn.execute(
                "UPDATE habit_logs SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2",
                params![now, log_id],
            )?;
            return Ok(false);
        }
        let id = format!("{habit_id}_{date}");
        conn.execute(
            "INSERT INTO habit_logs (id, habit_id, date, completed_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?4, ?4)",
            params![id, habit_id, date, now],
        )?;
        Ok(true)
    }
}
