use super::settings;
use crate::error::{Result, SynapseError};
use crate::fsrs::{Card as FsrsCard, FsrsEngine, FsrsParameters, Rating, State as FsrsState};
use chrono::{DateTime, Utc};
use rusqlite::{params, OptionalExtension};

struct SrsStateRow {
    stability: f64,
    difficulty: f64,
    reps: i32,
    lapses: i32,
    learning_steps: i32,
    state: String,
    due_date: String,
    last_review: Option<String>,
    deck_id: String,
}

pub fn record_card_review(conn: &rusqlite::Connection, card_id: &str, rating: i32) -> Result<bool> {
    let card_id = card_id.trim();
    if card_id.is_empty() {
        return Err(SynapseError::Validation("Card ID cannot be empty".into()));
    }
    let rating = parse_rating(rating)?;
    let tx = conn.unchecked_transaction()?;
    let current = tx
        .query_row(
            "SELECT s.stability, s.difficulty, s.reps, s.lapses, s.learning_steps, s.state, s.due_date, \
             s.last_review, c.deck_id \
             FROM anki_srs_state s \
             JOIN anki_cards c ON c.id = s.id \
             WHERE s.id = ?1 AND s.deleted_at IS NULL AND c.deleted_at IS NULL",
            params![card_id],
            |row| {
                Ok(SrsStateRow {
                    stability: row.get(0)?,
                    difficulty: row.get(1)?,
                    reps: row.get(2)?,
                    lapses: row.get(3)?,
                    learning_steps: row.get(4)?,
                    state: row.get(5)?,
                    due_date: row.get(6)?,
                    last_review: row.get(7)?,
                    deck_id: row.get(8)?,
                })
            },
        )
        .optional()?
        .ok_or_else(|| SynapseError::NotFound(format!("Anki card {card_id} was not found")))?;

    let current_state = parse_state(&current.state)?;
    let due = parse_datetime(&current.due_date, "due_date")?;
    let last_review = current
        .last_review
        .as_deref()
        .map(|value| parse_datetime(value, "last_review"))
        .transpose()?;
    let deck_settings = settings::get_deck_settings(&tx, &current.deck_id)?;
    let engine = FsrsEngine::new(Some(read_fsrs_parameters(&deck_settings)?));
    let now = Utc::now();
    let fsrs_card = FsrsCard {
        due,
        stability: current.stability,
        difficulty: current.difficulty,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: current.reps,
        lapses: current.lapses,
        learning_steps: current.learning_steps,
        state: current_state,
        last_review,
    };
    let updated = engine.review(&fsrs_card, rating, now);

    let state = match updated.state {
        FsrsState::New => "new",
        FsrsState::Learning => "learning",
        FsrsState::Review => "review",
        FsrsState::Relearning => "relearning",
    };
    let now = now.to_rfc3339();
    let due_date = updated.due.to_rfc3339();
    let rows = tx.execute(
        "UPDATE anki_srs_state \
         SET stability = ?1, difficulty = ?2, elapsed_days = ?3, scheduled_days = ?4, \
             learning_steps = ?5, reps = ?6, lapses = ?7, state = ?8, due_date = ?9, \
             last_review = ?10, updated_at = ?10 \
         WHERE id = ?11 AND deleted_at IS NULL",
        params![
            updated.stability,
            updated.difficulty,
            updated.elapsed_days,
            updated.scheduled_days,
            updated.learning_steps,
            updated.reps,
            updated.lapses,
            state,
            due_date,
            now,
            card_id
        ],
    )?;
    if rows == 0 {
        return Err(SynapseError::NotFound(format!(
            "Anki review state for card {card_id} was not found"
        )));
    }

    let review_id = uuid::Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO anki_reviews (id, card_id, rating, duration, review_time, created_at) \
         VALUES (?1, ?2, ?3, 5000, ?4, ?4)",
        params![review_id, card_id, rating as i32, now],
    )?;
    tx.commit()?;
    Ok(true)
}

fn parse_rating(rating: i32) -> Result<Rating> {
    match rating {
        1 => Ok(Rating::Again),
        2 => Ok(Rating::Hard),
        3 => Ok(Rating::Good),
        4 => Ok(Rating::Easy),
        _ => Err(SynapseError::Validation(format!(
            "Invalid Anki rating: {rating}"
        ))),
    }
}

fn parse_state(state: &str) -> Result<FsrsState> {
    match state.trim().to_ascii_lowercase().as_str() {
        "new" | "0" => Ok(FsrsState::New),
        "learning" | "1" => Ok(FsrsState::Learning),
        "review" | "2" => Ok(FsrsState::Review),
        "relearning" | "3" => Ok(FsrsState::Relearning),
        _ => Err(SynapseError::Validation(format!(
            "Invalid Anki state: {state}"
        ))),
    }
}

fn parse_datetime(value: &str, field: &str) -> Result<DateTime<Utc>> {
    if let Ok(date) = DateTime::parse_from_rfc3339(value) {
        return Ok(date.with_timezone(&Utc));
    }
    for format in ["%Y-%m-%d %H:%M:%S%.f", "%Y-%m-%dT%H:%M:%S%.f"] {
        if let Ok(date) = chrono::NaiveDateTime::parse_from_str(value, format) {
            return Ok(date.and_utc());
        }
    }
    Err(SynapseError::Validation(format!(
        "Invalid Anki {field} timestamp: {value}"
    )))
}

fn read_fsrs_parameters(settings: &super::models::AnkiDeckSettings) -> Result<FsrsParameters> {
    let mut parameters = FsrsParameters {
        learning_steps: parse_steps(&settings.learning_steps),
        relearning_steps: parse_steps(&settings.relearning_steps),
        ..FsrsParameters::default()
    };
    if let Some(weights) = settings
        .fsrs_weights
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        let weights: Vec<f64> = serde_json::from_str(weights).map_err(|error| {
            SynapseError::Validation(format!("Invalid Anki FSRS weights: {error}"))
        })?;
        if !matches!(weights.len(), 17 | 19 | 21)
            || weights.iter().any(|weight| !weight.is_finite())
        {
            return Err(SynapseError::Validation(
                "Anki FSRS weights must contain 17, 19, or 21 finite values".to_owned(),
            ));
        }
        parameters.weights = weights;
    }
    Ok(parameters)
}

fn parse_steps(steps: &str) -> Vec<String> {
    steps
        .split(',')
        .map(str::trim)
        .filter(|step| !step.is_empty())
        .map(str::to_owned)
        .collect()
}
