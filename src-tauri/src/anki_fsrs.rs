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
pub fn anki_review_card_fsrs(
    card_id: String,
    rating: i32,
    state: FsrsState,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| e.to_string())?;

    if let Err(e) = conn.execute(
        "UPDATE anki_srs_state SET stability = ?, difficulty = ?, elapsed_days = ?, scheduled_days = ?, reps = ?, lapses = ?, state = ?, due_date = ?, last_review = ? WHERE id = ?",
        params![state.stability, state.difficulty, state.elapsed_days, state.scheduled_days, state.reps, state.lapses, state.state, state.due_date, state.last_review, card_id]
    ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e.to_string());
    }

    let review_id = uuid::Uuid::new_v4().to_string();
    if let Err(e) = conn.execute(
        "INSERT INTO anki_reviews (id, card_id, rating) VALUES (?, ?, ?)",
        params![review_id, card_id, rating],
    ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e.to_string());
    }

    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn anki_reset_deck(deck_id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| e.to_string())?;

    let _ = conn.execute(
        "UPDATE anki_srs_state SET stability = 0.0, difficulty = 0.0, elapsed_days = 0, scheduled_days = 0, reps = 0, lapses = 0, state = '0', due_date = CURRENT_TIMESTAMP, last_review = NULL WHERE id IN (SELECT id FROM anki_cards WHERE deck_id = ?)",
        [&deck_id]
    );
    let _ = conn.execute(
        "UPDATE anki_reviews SET deleted_at = CURRENT_TIMESTAMP WHERE card_id IN (SELECT id FROM anki_cards WHERE deck_id = ?)",
        [&deck_id]
    );

    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
    Ok(true)
}
