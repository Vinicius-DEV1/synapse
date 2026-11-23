use super::models::Card;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;

pub fn get_deck_cards(conn: &rusqlite::Connection, deck_id: &str) -> Result<Vec<Card>> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.deck_id, c.front, c.back, 
                COALESCE(c.tags, '') as tags, 
                COALESCE(c.card_type, 'reading') as card_type, 
                COALESCE(c.validation_mode, 'default') as validation_mode, 
                COALESCE(c.extra_note, '') as extra_note, 
                c.media_url, 
                COALESCE(s.stability, 0) as stability, COALESCE(s.difficulty, 0) as difficulty, 
                COALESCE(s.reps, 0) as reps, COALESCE(s.lapses, 0) as lapses, 
                COALESCE(s.state, 'new') as state, s.due_date, c.created_at, c.updated_at,
                COALESCE(s.learning_steps, 0) as learning_steps
         FROM anki_cards c 
         LEFT JOIN anki_srs_state s ON c.id = s.id 
         WHERE c.deck_id = ? AND c.deleted_at IS NULL 
         ORDER BY c.created_at ASC",
    )?;

    let cards = stmt
        .query_map(params![deck_id], |row| {
            Ok(Card {
                id: row.get(0)?,
                deck_id: row.get(1)?,
                front: row.get(2)?,
                back: row.get(3)?,
                tags: row.get(4)?,
                card_type: row.get(5)?,
                validation_mode: row.get(6)?,
                extra_note: row.get(7)?,
                media_url: row.get(8)?,
                stability: row.get(9)?,
                difficulty: row.get(10)?,
                reps: row.get(11)?,
                lapses: row.get(12)?,
                state: row.get(13)?,
                due_date: row.get(14)?,
                created_at: row.get(15)?,
                updated_at: row.get(16)?,
                learning_steps: row.get(17)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(cards)
}

pub use super::study_cards::get_due_cards;

pub fn create_card(
    conn: &rusqlite::Connection,
    deck_id: &str,
    front: &str,
    back: &str,
    tags: Option<&str>,
    card_type: Option<&str>,
    extra_note: Option<&str>,
) -> Result<String> {
    let trimmed_deck = deck_id.trim();
    let trimmed_front = front.trim();
    if trimmed_deck.is_empty() || trimmed_front.is_empty() {
        return Err(SynapseError::Validation(
            "Deck ID and Front cannot be empty".into(),
        ));
    }

    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM anki_decks WHERE id = ?1 AND deleted_at IS NULL)",
        params![trimmed_deck],
        |row| row.get(0),
    )?;
    if !exists {
        return Err(SynapseError::NotFound(format!(
            "Active deck {trimmed_deck} does not exist"
        )));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let resolved_type = card_type
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("reading");
    let resolved_tags = tags.unwrap_or("").trim();
    let resolved_note = extra_note.unwrap_or("").trim();

    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "INSERT INTO anki_cards (id, deck_id, front, back, tags, card_type, validation_mode, extra_note, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, 'default', ?, ?, ?)",
        params![id, trimmed_deck, trimmed_front, back, resolved_tags, resolved_type, resolved_note, now, now],
    )?;

    tx.execute(
        "INSERT INTO anki_srs_state (id, due_date, stability, difficulty, elapsed_days, reps, lapses, state, scheduled_days, learning_steps, created_at, updated_at)
         VALUES (?, ?, 0.0, 0.0, 0, 0, 0, 'new', 0, 0, ?, ?)",
        params![id, now, now, now],
    )?;
    tx.commit()?;

    Ok(id)
}

pub fn update_card(
    conn: &rusqlite::Connection,
    card_id: &str,
    front: &str,
    back: &str,
    tags: Option<&str>,
    card_type: Option<&str>,
    extra_note: Option<&str>,
) -> Result<bool> {
    let trimmed_id = card_id.trim();
    let trimmed_front = front.trim();
    if trimmed_id.is_empty() || trimmed_front.is_empty() {
        return Err(SynapseError::Validation(
            "Card ID and Front cannot be empty".into(),
        ));
    }

    let now = Utc::now().to_rfc3339();
    let resolved_type = card_type
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("reading");
    let resolved_tags = tags.unwrap_or("").trim();
    let resolved_note = extra_note.unwrap_or("").trim();

    let count = conn.execute(
        "UPDATE anki_cards 
         SET front = ?, back = ?, tags = ?, card_type = ?, extra_note = ?, updated_at = ? 
         WHERE id = ? AND deleted_at IS NULL",
        params![
            trimmed_front,
            back,
            resolved_tags,
            resolved_type,
            resolved_note,
            now,
            trimmed_id
        ],
    )?;

    Ok(count > 0)
}

pub fn delete_card(conn: &rusqlite::Connection, card_id: &str) -> Result<bool> {
    let trimmed_id = card_id.trim();
    if trimmed_id.is_empty() {
        return Err(SynapseError::Validation("ID cannot be empty".into()));
    }

    let now = Utc::now().to_rfc3339();
    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "UPDATE anki_srs_state SET deleted_at = ? WHERE id = ?",
        params![now, trimmed_id],
    )?;

    let count = tx.execute(
        "UPDATE anki_cards SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL",
        params![now, trimmed_id],
    )?;
    tx.commit()?;

    Ok(count > 0)
}

pub fn get_due_cards_count(conn: &rusqlite::Connection) -> Result<i64> {
    let mut stmt = conn.prepare(
        "SELECT count(*) FROM anki_cards c \
         LEFT JOIN anki_srs_state s ON c.id = s.id \
         WHERE c.deleted_at IS NULL AND (s.due_date IS NULL OR s.due_date <= datetime('now'))",
    )?;
    let count: i64 = stmt.query_row([], |row| row.get(0))?;
    Ok(count)
}
