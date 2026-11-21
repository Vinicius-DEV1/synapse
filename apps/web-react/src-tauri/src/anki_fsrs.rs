use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize)]
pub struct FsrsState {
    pub stability: f64,
    pub difficulty: f64,
    pub elapsed_days: i32,
    pub scheduled_days: i32,
    pub reps: i32,
    pub lapses: i32,
    pub state: String,
    pub due_date: String,
    pub last_review: String,
}

#[tauri::command]
pub async fn anki_review_card_fsrs(
    card_id: String,
    rating: i32,
    state: FsrsState,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            let now = chrono::Utc::now().to_rfc3339();

            conn.execute("BEGIN TRANSACTION", [])
                .map_err(|e| e.to_string())?;

            if let Err(e) = conn.execute(
                "INSERT INTO anki_srs_state (id, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, due_date, last_review, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)
                 ON CONFLICT(id) DO UPDATE SET
                    stability = excluded.stability,
                    difficulty = excluded.difficulty,
                    elapsed_days = excluded.elapsed_days,
                    scheduled_days = excluded.scheduled_days,
                    reps = excluded.reps,
                    lapses = excluded.lapses,
                    state = excluded.state,
                    due_date = excluded.due_date,
                    last_review = excluded.last_review,
                    updated_at = excluded.updated_at",
                params![
                    card_id,
                    state.stability,
                    state.difficulty,
                    state.elapsed_days,
                    state.scheduled_days,
                    state.reps,
                    state.lapses,
                    state.state,
                    state.due_date,
                    state.last_review,
                    now
                ],
            ) {
                let _ = conn.execute("ROLLBACK", []);
                return Err(e.to_string());
            }

            let review_id = uuid::Uuid::new_v4().to_string();
            if let Err(e) = conn.execute(
                "INSERT INTO anki_reviews (id, card_id, rating, review_time, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4, ?4)",
                params![review_id, card_id, rating, now],
            ) {
                let _ = conn.execute("ROLLBACK", []);
                return Err(e.to_string());
            }

            conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
            Ok(true)
        })
        .await
}

#[tauri::command]
pub async fn anki_reset_deck(
    deck_id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            let now = chrono::Utc::now().to_rfc3339();
            conn.execute("BEGIN TRANSACTION", [])
                .map_err(|e| e.to_string())?;

            let _ = conn.execute(
                "UPDATE anki_srs_state SET stability = 0.0, difficulty = 0.0, elapsed_days = 0, scheduled_days = 0, reps = 0, lapses = 0, state = '0', due_date = ?1, last_review = NULL, updated_at = ?1 WHERE id IN (SELECT id FROM anki_cards WHERE deck_id = ?2)",
                params![now, deck_id]
            );
            let _ = conn.execute(
                "UPDATE anki_reviews SET deleted_at = ?1, updated_at = ?1 WHERE card_id IN (SELECT id FROM anki_cards WHERE deck_id = ?2)",
                params![now, deck_id]
            );

            conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
            Ok(true)
        })
        .await
}
