use super::models::AnkiDeckSettings;
use crate::error::Result;
use chrono::Utc;
use rusqlite::{params, OptionalExtension};
use std::collections::HashMap;

pub fn get_deck_settings(conn: &rusqlite::Connection, deck_id: &str) -> Result<AnkiDeckSettings> {
    let mut stmt = conn.prepare(
        "SELECT new_limit, review_limit, learning_steps, relearning_steps, fsrs_weights 
         FROM anki_deck_settings WHERE deck_id = ?",
    )?;

    let settings = stmt
        .query_row(params![deck_id], |row| {
            Ok(AnkiDeckSettings {
                new_limit: row.get(0)?,
                review_limit: row.get(1)?,
                learning_steps: row.get(2)?,
                relearning_steps: row.get(3)?,
                fsrs_weights: row.get(4)?,
            })
        })
        .optional()?
        .unwrap_or_default();

    Ok(settings)
}

pub fn update_deck_settings(
    conn: &rusqlite::Connection,
    deck_id: &str,
    settings: AnkiDeckSettings,
) -> Result<bool> {
    if settings.new_limit < 0 || settings.review_limit < 0 {
        return Err(crate::error::SynapseError::Validation(
            "Anki daily limits cannot be negative".to_owned(),
        ));
    }
    validate_fsrs_weights(settings.fsrs_weights.as_deref())?;

    let tx = conn.unchecked_transaction()?;
    let existing_id: Option<String> = tx
        .query_row(
            "SELECT id FROM anki_deck_settings WHERE deck_id = ?",
            params![deck_id],
            |row| row.get(0),
        )
        .optional()?;

    if existing_id.is_some() {
        tx.execute(
            "UPDATE anki_deck_settings 
             SET new_limit = ?, review_limit = ?, learning_steps = ?, relearning_steps = ?, fsrs_weights = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE deck_id = ?",
            params![
                settings.new_limit,
                settings.review_limit,
                settings.learning_steps,
                settings.relearning_steps,
                settings.fsrs_weights,
                deck_id
            ],
        )?;
    } else {
        let id = uuid::Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO anki_deck_settings (id, deck_id, new_limit, review_limit, learning_steps, relearning_steps, fsrs_weights) 
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![
                id,
                deck_id,
                settings.new_limit,
                settings.review_limit,
                settings.learning_steps,
                settings.relearning_steps,
                settings.fsrs_weights
            ],
        )?;
    }

    tx.commit()?;
    Ok(true)
}

fn validate_fsrs_weights(weights: Option<&str>) -> Result<()> {
    let Some(weights) = weights.filter(|value| !value.trim().is_empty()) else {
        return Ok(());
    };
    let values: Vec<f64> = serde_json::from_str(weights).map_err(|error| {
        crate::error::SynapseError::Validation(format!("Invalid Anki FSRS weights: {error}"))
    })?;
    if !matches!(values.len(), 17 | 19 | 21) || values.iter().any(|value| !value.is_finite()) {
        return Err(crate::error::SynapseError::Validation(
            "Anki FSRS weights must contain 17, 19, or 21 finite values".to_owned(),
        ));
    }
    Ok(())
}

pub fn get_total_due_count(conn: &rusqlite::Connection) -> Result<i64> {
    let now = Utc::now().to_rfc3339();

    let mut stmt = conn.prepare(
        "SELECT c.deck_id,
                COALESCE(st.state, '0'),
                st.due_date,
                COALESCE(ds.new_limit, 20),
                COALESCE(ds.review_limit, 200)
         FROM anki_cards c
         LEFT JOIN anki_srs_state st ON c.id = st.id
         LEFT JOIN anki_deck_settings ds ON c.deck_id = ds.deck_id
         WHERE c.deleted_at IS NULL",
    )?;

    let mut deck_counts: HashMap<String, (i64, i64, i64, i64, i64)> = HashMap::new();

    let rows = stmt.query_map([], |row| {
        let deck_id: String = row.get(0)?;
        let state: String = row.get(1)?;
        let due_date: Option<String> = row.get(2)?;
        let new_limit: i64 = row.get(3)?;
        let review_limit: i64 = row.get(4)?;
        Ok((deck_id, state, due_date, new_limit, review_limit))
    })?;

    for r in rows {
        let (deck_id, state_str, due_date, new_limit, review_limit) = r?;
        let entry = deck_counts
            .entry(deck_id)
            .or_insert((0, 0, 0, new_limit, review_limit));
        let state: i32 = match state_str.trim().to_lowercase().as_str() {
            "0" | "new" | "" => 0,
            "1" | "learning" => 1,
            "2" | "review" => 2,
            "3" | "relearning" => 3,
            _ => 0,
        };
        if state == 0 {
            entry.0 += 1;
        } else if state == 1 || state == 3 {
            if let Some(ref d) = due_date {
                if d.as_str() <= now.as_str() {
                    entry.1 += 1;
                }
            }
        } else if state == 2 {
            if let Some(ref d) = due_date {
                if d.as_str() <= now.as_str() {
                    entry.2 += 1;
                }
            }
        }
    }

    let mut total: i64 = 0;
    for (_deck, (news, learning, reviews, new_lim, rev_lim)) in deck_counts {
        let capped_new = news.min(new_lim);
        let capped_review = reviews.min(rev_lim);
        total += learning + capped_review + capped_new;
    }

    Ok(total)
}
