use crate::error::{Result, SynapseError};
use crate::fsrs::{Card as FsrsCard, FsrsEngine, Rating, State as FsrsState};
use chrono::{DateTime, Utc};
use rusqlite::params;

pub fn record_card_review(conn: &rusqlite::Connection, card_id: &str, rating: i32) -> Result<bool> {
    let trimmed_id = card_id.trim();
    if trimmed_id.is_empty() {
        return Err(SynapseError::Validation("Card ID cannot be empty".into()));
    }

    let rating_enum = match rating {
        1 => Rating::Again,
        2 => Rating::Hard,
        3 => Rating::Good,
        4 => Rating::Easy,
        _ => return Err(SynapseError::Validation(format!("Invalid rating: {}", rating))),
    };

    let mut stmt = conn.prepare(
        "SELECT stability, difficulty, reps, lapses, state, due_date, last_review 
         FROM anki_srs_state WHERE id = ?",
    )?;

    struct SrsStateRow {
        stability: f64,
        difficulty: f64,
        reps: i32,
        lapses: i32,
        state: String,
        due_date: Option<String>,
        last_review: Option<String>,
    }

    let current = stmt
        .query_row(params![trimmed_id], |row| {
            Ok(SrsStateRow {
                stability: row.get(0).unwrap_or(0.0),
                difficulty: row.get(1).unwrap_or(0.0),
                reps: row.get(2).unwrap_or(0),
                lapses: row.get(3).unwrap_or(0),
                state: row.get::<_, Option<String>>(4)?.unwrap_or_else(|| "new".to_string()),
                due_date: row.get(5)?,
                last_review: row.get(6)?,
            })
        })
        .ok();

    let now = Utc::now();
    let fsrs_card = match current {
        Some(row) => {
            let state = match row.state.as_str() {
                "learning" => FsrsState::Learning,
                "review" => FsrsState::Review,
                "relearning" => FsrsState::Relearning,
                _ => FsrsState::New,
            };
            let due = row
                .due_date
                .as_deref()
                .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or(now);
            let last_review = row
                .last_review
                .as_deref()
                .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| dt.with_timezone(&Utc));

            FsrsCard {
                due,
                stability: row.stability,
                difficulty: row.difficulty,
                elapsed_days: 0,
                scheduled_days: 0,
                reps: row.reps,
                lapses: row.lapses,
                state,
                last_review,
            }
        }
        None => FsrsCard {
            due: now,
            stability: 0.0,
            difficulty: 0.0,
            elapsed_days: 0,
            scheduled_days: 0,
            reps: 0,
            lapses: 0,
            state: FsrsState::New,
            last_review: None,
        },
    };

    let engine = FsrsEngine::new(None);
    let updated = engine.review(&fsrs_card, rating_enum, now);

    let state_str = match updated.state {
        FsrsState::New => "new",
        FsrsState::Learning => "learning",
        FsrsState::Review => "review",
        FsrsState::Relearning => "relearning",
    };

    let now_str = now.to_rfc3339();
    let due_str = updated.due.to_rfc3339();

    conn.execute(
        "UPDATE anki_srs_state 
         SET stability = ?, difficulty = ?, reps = ?, lapses = ?, scheduled_days = ?, state = ?, due_date = ?, last_review = ?, updated_at = ? 
         WHERE id = ?",
        params![
            updated.stability,
            updated.difficulty,
            updated.reps,
            updated.lapses,
            updated.scheduled_days,
            state_str,
            due_str,
            now_str,
            now_str,
            trimmed_id
        ],
    )?;

    let review_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO anki_reviews (id, card_id, rating, duration, review_time, created_at) 
         VALUES (?, ?, ?, 5000, ?, ?)",
        params![review_id, trimmed_id, rating, now_str, now_str],
    )?;

    Ok(true)
}
