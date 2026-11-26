use super::models::QuizBattery;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::{params, OptionalExtension};

pub fn get_quiz_battery(
    conn: &rusqlite::Connection,
    battery_id: &str,
) -> Result<Option<QuizBattery>> {
    let trimmed_id = battery_id.trim();
    if trimmed_id.is_empty() {
        return Ok(None);
    }

    conn.query_row(
        "SELECT b.id, b.title, b.description,
                COALESCE(b.page_id, (SELECT link.page_id FROM quiz_page_links link
                    WHERE link.battery_id = b.id ORDER BY link.created_at LIMIT 1)), p.title,
                (SELECT count(*) FROM quiz_questions q WHERE q.battery_id = b.id AND q.deleted_at IS NULL) as question_count
         FROM quiz_batteries b
         LEFT JOIN pages p ON p.id = COALESCE(b.page_id, (
            SELECT link.page_id FROM quiz_page_links link WHERE link.battery_id = b.id
            ORDER BY link.created_at LIMIT 1
         ))
         WHERE b.id = ? AND b.deleted_at IS NULL",
        [trimmed_id],
        |row| {
            Ok(QuizBattery {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                page_id: row.get(3)?,
                page_title: row.get(4)?,
                question_count: row.get(5)?,
            })
        },
    )
    .optional()
    .map_err(Into::into)
}

pub fn get_quiz_batteries(conn: &rusqlite::Connection) -> Result<Vec<QuizBattery>> {
    let mut stmt = conn.prepare(
        "SELECT b.id, b.title, b.description,
                COALESCE(b.page_id, (SELECT link.page_id FROM quiz_page_links link
                    WHERE link.battery_id = b.id ORDER BY link.created_at LIMIT 1)), p.title,
                (SELECT count(*) FROM quiz_questions q WHERE q.battery_id = b.id AND q.deleted_at IS NULL) as question_count
         FROM quiz_batteries b
         LEFT JOIN pages p ON p.id = COALESCE(b.page_id, (
            SELECT link.page_id FROM quiz_page_links link WHERE link.battery_id = b.id
            ORDER BY link.created_at LIMIT 1
         ))
         WHERE b.deleted_at IS NULL
         ORDER BY b.created_at DESC",
    )?;

    let batteries = stmt
        .query_map([], |row| {
            Ok(QuizBattery {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                page_id: row.get(3)?,
                page_title: row.get(4)?,
                question_count: row.get(5)?,
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

/// Creates a Notes question battery and its page link as one database operation.
pub fn create_quiz_battery_for_page(
    conn: &mut rusqlite::Connection,
    title: &str,
    description: Option<&str>,
    page_id: &str,
) -> Result<String> {
    let trimmed_title = title.trim();
    let trimmed_page_id = page_id.trim();
    if trimmed_title.is_empty() {
        return Err(SynapseError::Validation(
            "Battery title cannot be empty".into(),
        ));
    }
    if trimmed_page_id.is_empty() {
        return Err(SynapseError::Validation("Page ID cannot be empty".into()));
    }

    let transaction = conn.transaction()?;
    let page_exists: bool = transaction.query_row(
        "SELECT EXISTS(SELECT 1 FROM pages WHERE id = ? AND deleted_at IS NULL)",
        [trimmed_page_id],
        |row| row.get(0),
    )?;
    if !page_exists {
        return Err(SynapseError::NotFound("Notes page was not found".into()));
    }

    let battery_id = uuid::Uuid::new_v4().to_string();
    let link_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let desc = description.unwrap_or("").trim();

    transaction.execute(
        "INSERT INTO quiz_batteries (id, page_id, title, description, layout, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'sequential', 0, ?, ?)",
        params![battery_id, trimmed_page_id, trimmed_title, desc, now, now],
    )?;
    transaction.execute(
        "INSERT INTO quiz_page_links (id, battery_id, page_id, created_at)
         VALUES (?, ?, ?, ?)",
        params![link_id, battery_id, trimmed_page_id, now],
    )?;
    transaction.commit()?;

    Ok(battery_id)
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
