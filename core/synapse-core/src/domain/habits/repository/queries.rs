use super::super::models::{Habit, HabitLog};
use super::HabitsRepository;
use crate::db::Database;
use crate::error::{Result, SynapseError};
use rusqlite::{params, Connection, OptionalExtension};

impl HabitsRepository {
    pub fn get_habits(db: &Database) -> Result<Vec<Habit>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::get_habits_conn(&conn)
    }

    pub fn get_habits_conn(conn: &Connection) -> Result<Vec<Habit>> {
        let mut stmt = conn.prepare(
            "SELECT id, title, category, color, icon, target_days_per_week, created_at, updated_at, deleted_at
             FROM habits WHERE deleted_at IS NULL ORDER BY created_at ASC",
        )?;
        let habits = stmt
            .query_map([], map_habit)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(habits)
    }

    pub fn get_habit(db: &Database, habit_id: &str) -> Result<Option<Habit>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::get_habit_conn(&conn, habit_id)
    }

    pub fn get_habit_conn(conn: &Connection, habit_id: &str) -> Result<Option<Habit>> {
        let habit = conn
            .query_row(
                "SELECT id, title, category, color, icon, target_days_per_week, created_at, updated_at, deleted_at
                 FROM habits WHERE id = ?1 AND deleted_at IS NULL",
                [habit_id.trim()],
                map_habit,
            )
            .optional()?;
        Ok(habit)
    }

    pub fn get_habit_logs_range(
        db: &Database,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<HabitLog>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::get_habit_logs_range_conn(&conn, start_date, end_date)
    }

    pub fn get_habit_logs_range_conn(
        conn: &Connection,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<HabitLog>> {
        let mut stmt = conn.prepare(
            "SELECT id, habit_id, date, completed_at, notes, created_at, updated_at, deleted_at
             FROM habit_logs WHERE date >= ?1 AND date <= ?2 AND deleted_at IS NULL ORDER BY date ASC",
        )?;
        let logs = stmt
            .query_map(params![start_date.trim(), end_date.trim()], map_habit_log)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(logs)
    }

    pub fn get_all_active_logs(db: &Database) -> Result<Vec<HabitLog>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::get_all_active_logs_conn(&conn)
    }

    pub fn get_logs_for_habit(db: &Database, habit_id: &str) -> Result<Vec<HabitLog>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::get_logs_for_habit_conn(&conn, habit_id)
    }

    pub fn get_logs_for_habit_conn(conn: &Connection, habit_id: &str) -> Result<Vec<HabitLog>> {
        let mut stmt = conn.prepare(
            "SELECT id, habit_id, date, completed_at, notes, created_at, updated_at, deleted_at
             FROM habit_logs WHERE habit_id = ?1 AND deleted_at IS NULL ORDER BY date ASC",
        )?;
        let logs = stmt
            .query_map([habit_id.trim()], map_habit_log)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(logs)
    }

    pub fn get_all_active_logs_conn(conn: &Connection) -> Result<Vec<HabitLog>> {
        let mut stmt = conn.prepare(
            "SELECT id, habit_id, date, completed_at, notes, created_at, updated_at, deleted_at
             FROM habit_logs WHERE deleted_at IS NULL ORDER BY date ASC",
        )?;
        let logs = stmt
            .query_map([], map_habit_log)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(logs)
    }

    pub fn get_habit_logs(db: &Database, date: &str) -> Result<Vec<HabitLog>> {
        Self::get_habit_logs_range(db, date, date)
    }
}

fn map_habit(row: &rusqlite::Row<'_>) -> rusqlite::Result<Habit> {
    Ok(Habit {
        id: row.get(0)?,
        title: row.get(1)?,
        category: row.get(2)?,
        color: row.get(3)?,
        icon: row.get(4)?,
        target_days_per_week: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
        deleted_at: row.get(8)?,
    })
}

fn map_habit_log(row: &rusqlite::Row<'_>) -> rusqlite::Result<HabitLog> {
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
}
