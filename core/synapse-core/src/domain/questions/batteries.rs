use super::models::QuizBattery;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;

pub fn get_quiz_batteries(conn: &rusqlite::Connection) -> Result<Vec<QuizBattery>> {
    let mut stmt = conn.prepare(
        "SELECT b.id, b.title, b.description,
                (SELECT count(*) FROM quiz_questions q WHERE q.battery_id = b.id AND q.deleted_at IS NULL) as question_count
         FROM quiz_batteries b
         WHERE b.deleted_at IS NULL
         ORDER BY b.created_at DESC",
    )?;

    let batteries = stmt
        .query_map([], |row| {
            Ok(QuizBattery {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                question_count: row.get(3)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(batteries)
}

pub fn create_quiz_battery(
    conn: &rusqlite::Connection,
    title: &str,
    description: Option<&str>,
) -> Result<String> {
    let trimmed_title = title.trim();
    if trimmed_title.is_empty() {
        return Err(SynapseError::Validation(
            "Battery title cannot be empty".into(),
        ));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let desc = description.unwrap_or("").trim();

    conn.execute(
        "INSERT INTO quiz_batteries (id, title, description, layout, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, 'zen', 0, ?, ?)",
        params![id, trimmed_title, desc, now, now],
    )?;

    Ok(id)
}

pub fn update_quiz_battery(
    conn: &rusqlite::Connection,
    battery_id: &str,
    title: &str,
    description: Option<&str>,
) -> Result<bool> {
    let trimmed_id = battery_id.trim();
    let trimmed_title = title.trim();
    if trimmed_id.is_empty() || trimmed_title.is_empty() {
        return Err(SynapseError::Validation(
            "ID and title cannot be empty".into(),
        ));
    }

    let now = Utc::now().to_rfc3339();
    let desc = description.unwrap_or("").trim();

    let count = conn.execute(
        "UPDATE quiz_batteries SET title = ?, description = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        params![trimmed_title, desc, now, trimmed_id],
    )?;

    Ok(count > 0)
}

pub fn delete_quiz_battery(conn: &rusqlite::Connection, battery_id: &str) -> Result<bool> {
    let trimmed_id = battery_id.trim();
    if trimmed_id.is_empty() {
        return Err(SynapseError::Validation("ID cannot be empty".into()));
    }

    let now = Utc::now().to_rfc3339();
    let count = conn.execute(
        "UPDATE quiz_batteries SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL",
        params![now, trimmed_id],
    )?;

    Ok(count > 0)
}
