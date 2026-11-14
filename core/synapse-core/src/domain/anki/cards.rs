use super::models::Card;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;
use std::collections::HashMap;

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
                COALESCE(s.state, 'new') as state, s.due_date, c.created_at, c.updated_at 
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
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(cards)
}

pub fn get_due_cards(conn: &rusqlite::Connection, deck_id: &str) -> Result<Vec<Card>> {
    let mut stmt = conn.prepare("SELECT id, parent_id FROM anki_decks WHERE deleted_at IS NULL")?;
    let mut children_map: HashMap<String, Vec<String>> = HashMap::new();
    let rows = stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let pid: Option<String> = row.get(1)?;
        Ok((id, pid))
    })?;

    for r in rows {
        let (id, pid) = r?;
        if let Some(parent) = pid.filter(|s| !s.is_empty()) {
            children_map.entry(parent).or_default().push(id);
        }
    }

    let mut target_deck_ids = Vec::new();
    fn collect(did: &str, map: &HashMap<String, Vec<String>>, out: &mut Vec<String>) {
        out.push(did.to_string());
        if let Some(children) = map.get(did) {
            for c in children {
                collect(c, map, out);
            }
        }
    }
    collect(deck_id, &children_map, &mut target_deck_ids);

    if target_deck_ids.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = vec!["?"; target_deck_ids.len()].join(",");
    let sql = format!(
        "SELECT c.id, c.deck_id, c.front, c.back, 
                COALESCE(c.tags, '') as tags, 
                COALESCE(c.card_type, 'reading') as card_type, 
                COALESCE(c.validation_mode, 'default') as validation_mode, 
                COALESCE(c.extra_note, '') as extra_note, 
                c.media_url, 
                COALESCE(s.stability, 0) as stability, COALESCE(s.difficulty, 0) as difficulty, 
                COALESCE(s.reps, 0) as reps, COALESCE(s.lapses, 0) as lapses, 
                COALESCE(s.state, 'new') as state, s.due_date, c.created_at, c.updated_at 
         FROM anki_cards c 
         LEFT JOIN anki_srs_state s ON c.id = s.id 
         WHERE c.deck_id IN ({}) AND c.deleted_at IS NULL 
         ORDER BY CASE 
           WHEN s.state IN ('learning', 'relearning') THEN 1 
           WHEN s.state = 'review' AND datetime(s.due_date) <= datetime('now') THEN 2 
           WHEN COALESCE(s.state, 'new') = 'new' OR COALESCE(s.reps, 0) = 0 THEN 3 
           ELSE 4 END ASC, c.created_at ASC",
        placeholders
    );

    let params: Vec<&dyn rusqlite::ToSql> = target_deck_ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();
    let mut q_stmt = conn.prepare(&sql)?;
    let mut cards: Vec<Card> = q_stmt
        .query_map(&params[..], |row| {
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
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    // If no due cards in current schedule, provide all cards in the deck for practice study
    if cards.is_empty() {
        let fallback_sql = format!(
            "SELECT c.id, c.deck_id, c.front, c.back, 
                    COALESCE(c.tags, '') as tags, 
                    COALESCE(c.card_type, 'reading') as card_type, 
                    COALESCE(c.validation_mode, 'default') as validation_mode, 
                    COALESCE(c.extra_note, '') as extra_note, 
                    c.media_url, 
                    COALESCE(s.stability, 0) as stability, COALESCE(s.difficulty, 0) as difficulty, 
                    COALESCE(s.reps, 0) as reps, COALESCE(s.lapses, 0) as lapses, 
                    COALESCE(s.state, 'new') as state, s.due_date, c.created_at, c.updated_at 
             FROM anki_cards c 
             LEFT JOIN anki_srs_state s ON c.id = s.id 
             WHERE c.deck_id IN ({}) AND c.deleted_at IS NULL 
             ORDER BY c.created_at ASC",
            placeholders
        );
        let mut fb_stmt = conn.prepare(&fallback_sql)?;
        cards = fb_stmt
            .query_map(&params[..], |row| {
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
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
    }

    Ok(cards)
}

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
        return Err(SynapseError::Validation("Deck ID and Front cannot be empty".into()));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let resolved_type = card_type.map(|s| s.trim()).filter(|s| !s.is_empty()).unwrap_or("reading");
    let resolved_tags = tags.unwrap_or("").trim();
    let resolved_note = extra_note.unwrap_or("").trim();

    conn.execute(
        "INSERT INTO anki_cards (id, deck_id, front, back, tags, card_type, validation_mode, extra_note, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, 'default', ?, ?, ?)",
        params![id, trimmed_deck, trimmed_front, back, resolved_tags, resolved_type, resolved_note, now, now],
    )?;

    conn.execute(
        "INSERT INTO anki_srs_state (id, due_date, stability, difficulty, elapsed_days, reps, lapses, state, scheduled_days, created_at, updated_at) 
         VALUES (?, ?, 0.0, 0.0, 0, 0, 0, 'new', 0, ?, ?)",
        params![id, now, now, now],
    )?;

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
        return Err(SynapseError::Validation("Card ID and Front cannot be empty".into()));
    }

    let now = Utc::now().to_rfc3339();
    let resolved_type = card_type.map(|s| s.trim()).filter(|s| !s.is_empty()).unwrap_or("reading");
    let resolved_tags = tags.unwrap_or("").trim();
    let resolved_note = extra_note.unwrap_or("").trim();

    let count = conn.execute(
        "UPDATE anki_cards 
         SET front = ?, back = ?, tags = ?, card_type = ?, extra_note = ?, updated_at = ? 
         WHERE id = ? AND deleted_at IS NULL",
        params![trimmed_front, back, resolved_tags, resolved_type, resolved_note, now, trimmed_id],
    )?;

    Ok(count > 0)
}

pub fn delete_card(conn: &rusqlite::Connection, card_id: &str) -> Result<bool> {
    let trimmed_id = card_id.trim();
    if trimmed_id.is_empty() {
        return Err(SynapseError::Validation("ID cannot be empty".into()));
    }

    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE anki_srs_state SET deleted_at = ? WHERE id = ?",
        params![now, trimmed_id],
    )?;

    let count = conn.execute(
        "UPDATE anki_cards SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL",
        params![now, trimmed_id],
    )?;

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
