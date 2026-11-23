use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;

pub fn create_deck(
    conn: &rusqlite::Connection,
    name: &str,
    description: Option<&str>,
    color: Option<&str>,
    parent_id: Option<&str>,
) -> Result<String> {
    let trimmed_name = name.trim();
    if trimmed_name.is_empty() {
        return Err(SynapseError::Validation("Deck name cannot be empty".into()));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let desc = description.unwrap_or("").trim();
    let col = color.unwrap_or("#10b981").trim();
    let pid = parent_id.map(|s| s.trim()).filter(|s| !s.is_empty());

    conn.execute(
        "INSERT INTO anki_decks (id, name, description, color, parent_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![id, trimmed_name, desc, col, pid, now, now],
    )?;

    Ok(id)
}

pub fn update_deck(
    conn: &rusqlite::Connection,
    deck_id: &str,
    name: &str,
    description: Option<&str>,
    color: Option<&str>,
) -> Result<bool> {
    let trimmed_id = deck_id.trim();
    let trimmed_name = name.trim();
    if trimmed_id.is_empty() || trimmed_name.is_empty() {
        return Err(SynapseError::Validation(
            "ID and name cannot be empty".into(),
        ));
    }

    let now = Utc::now().to_rfc3339();
    let desc = description.unwrap_or("").trim();
    let col = color.unwrap_or("#10b981").trim();

    let count = conn.execute(
        "UPDATE anki_decks SET name = ?, description = ?, color = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        params![trimmed_name, desc, col, now, trimmed_id],
    )?;

    Ok(count > 0)
}

pub fn delete_deck(conn: &rusqlite::Connection, deck_id: &str) -> Result<bool> {
    let trimmed_id = deck_id.trim();
    if trimmed_id.is_empty() {
        return Err(SynapseError::Validation("ID cannot be empty".into()));
    }

    let now = Utc::now().to_rfc3339();
    let count = conn.execute(
        "UPDATE anki_decks SET deleted_at = ? WHERE (id = ? OR parent_id = ?) AND deleted_at IS NULL",
        params![now, trimmed_id, trimmed_id],
    )?;

    Ok(count > 0)
}

pub fn reset_deck_progress(conn: &rusqlite::Connection, deck_id: &str) -> Result<bool> {
    let trimmed_id = deck_id.trim();
    if trimmed_id.is_empty() {
        return Err(SynapseError::Validation("ID cannot be empty".into()));
    }

    let now = Utc::now().to_rfc3339();
    let tx = conn.unchecked_transaction()?;
    let count = tx.execute(
        "UPDATE anki_srs_state
         SET stability = 0.0, difficulty = 0.0, elapsed_days = 0, scheduled_days = 0,
             learning_steps = 0,
             reps = 0, lapses = 0, state = 'new', due_date = ?, last_review = NULL,
             updated_at = ?
         WHERE id IN (
             SELECT id FROM anki_cards WHERE deck_id = ? AND deleted_at IS NULL
         ) AND deleted_at IS NULL",
        params![now, now, trimmed_id],
    )?;
    tx.execute(
        "UPDATE anki_reviews SET deleted_at = ?, updated_at = ?
         WHERE card_id IN (
             SELECT id FROM anki_cards WHERE deck_id = ? AND deleted_at IS NULL
         ) AND deleted_at IS NULL",
        params![now, now, trimmed_id],
    )?;
    tx.commit()?;

    Ok(count > 0)
}
