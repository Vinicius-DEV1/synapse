use crate::db::DbState;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize)]
pub struct AnkiDeck {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct AnkiCard {
    pub id: String,
    pub deck_id: String,
    pub front: String,
    pub back: String,
    pub extra_note: Option<String>,
    pub source_module: Option<String>,
    pub source_id: Option<String>,
    pub media_url: Option<String>,
    pub card_type: String,
    pub validation_mode: String,
    pub tags: Option<Vec<String>>,
    pub due_date: Option<String>,
    pub state: Option<String>,
    pub stability: Option<f64>,
    pub difficulty: Option<f64>,
    pub elapsed_days: Option<i32>,
    pub scheduled_days: Option<i32>,
    pub reps: Option<i32>,
    pub lapses: Option<i32>,
    pub last_review: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct AnkiDeckSettings {
    pub new_limit: i32,
    pub review_limit: i32,
    pub learning_steps: String,
    pub relearning_steps: String,
    pub fsrs_weights: Option<String>,
}

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
pub fn anki_get_decks(db_state: State<'_, DbState>) -> Result<Vec<AnkiDeck>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let mut stmt = conn.prepare("SELECT id, name, description, parent_id FROM anki_decks WHERE deleted_at IS NULL ORDER BY created_at DESC").map_err(|e| e.to_string())?;
    let iter = stmt
        .query_map([], |row| {
            Ok(AnkiDeck {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                parent_id: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }
    Ok(items)
}

#[tauri::command]
pub fn anki_create_deck(
    name: String,
    description: Option<String>,
    parent_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<String, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let id = uuid::Uuid::new_v4().to_string();

    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| e.to_string())?;

    if let Err(e) = conn.execute(
        "INSERT INTO anki_decks (id, name, description, parent_id) VALUES (?, ?, ?, ?)",
        params![id, name, description.unwrap_or_default(), parent_id],
    ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e.to_string());
    }

    let settings_id = uuid::Uuid::new_v4().to_string();
    if let Err(e) = conn.execute(
        "INSERT INTO anki_deck_settings (id, deck_id) VALUES (?, ?)",
        params![settings_id, id],
    ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e.to_string());
    }

    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn anki_get_deck_settings(
    deck_id: String,
    db_state: State<'_, DbState>,
) -> Result<AnkiDeckSettings, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT new_limit, review_limit, learning_steps, relearning_steps, fsrs_weights FROM anki_deck_settings WHERE deck_id = ?").map_err(|e| e.to_string())?;
    let row = stmt
        .query_row([&deck_id], |row| {
            Ok(AnkiDeckSettings {
                new_limit: row.get(0)?,
                review_limit: row.get(1)?,
                learning_steps: row.get(2)?,
                relearning_steps: row.get(3)?,
                fsrs_weights: row.get(4)?,
            })
        })
        .unwrap_or_else(|_| AnkiDeckSettings {
            new_limit: 20,
            review_limit: 200,
            learning_steps: "1m,10m".to_string(),
            relearning_steps: "10m".to_string(),
            fsrs_weights: None,
        });

    Ok(row)
}

#[tauri::command]
pub fn anki_save_card(card: AnkiCard, db_state: State<'_, DbState>) -> Result<String, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = if card.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        card.id.clone()
    };

    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| e.to_string())?;

    if let Err(e) = conn.execute(
        "INSERT INTO anki_cards (id, deck_id, front, back, extra_note, source_module, source_id, media_url, card_type, validation_mode, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, card.deck_id, card.front, card.back, card.extra_note, card.source_module, card.source_id, card.media_url, card.card_type, card.validation_mode, card.tags.as_ref().and_then(|t| serde_json::to_string(t).ok()).unwrap_or_else(|| "[]".to_string())]
    ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e.to_string());
    }

    let now = Utc::now().to_rfc3339();
    if let Err(e) = conn.execute(
        "INSERT INTO anki_srs_state (id, due_date, stability, difficulty, state) VALUES (?, ?, ?, ?, ?)",
        params![id, now, 0.0, 0.0, "0"]
    ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e.to_string());
    }

    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn anki_get_all_cards(
    deck_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<Vec<AnkiCard>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut query = "
        SELECT c.id, c.deck_id, c.front, c.back, c.extra_note, c.source_module, c.source_id, c.media_url, c.card_type, c.validation_mode,
               st.due_date, st.state, st.stability, st.difficulty, st.elapsed_days, st.scheduled_days, st.reps, st.lapses, st.last_review, c.created_at, c.tags
        FROM anki_cards c 
        LEFT JOIN anki_srs_state st ON c.id = st.id 
        WHERE c.deleted_at IS NULL".to_string();

    let mut p: Vec<String> = Vec::new();

    if let Some(did) = deck_id {
        query = "WITH RECURSIVE subdecks(id) AS (
            SELECT id FROM anki_decks WHERE id = ? AND deleted_at IS NULL
            UNION ALL
            SELECT d.id FROM anki_decks d
            JOIN subdecks sd ON d.parent_id = sd.id
            WHERE d.deleted_at IS NULL
         )
         SELECT c.id, c.deck_id, c.front, c.back, c.extra_note, c.source_module, c.source_id, c.media_url, c.card_type, c.validation_mode,
                st.due_date, st.state, st.stability, st.difficulty, st.elapsed_days, st.scheduled_days, st.reps, st.lapses, st.last_review, c.created_at, c.tags
         FROM anki_cards c 
         LEFT JOIN anki_srs_state st ON c.id = st.id 
         WHERE c.deleted_at IS NULL AND c.deck_id IN (SELECT id FROM subdecks)".to_string();
        p.push(did);
    }

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let params_iter = rusqlite::params_from_iter(p.iter());

    let iter = stmt
        .query_map(params_iter, |row| {
            Ok(AnkiCard {
                id: row.get(0)?,
                deck_id: row.get(1)?,
                front: row.get(2)?,
                back: row.get(3)?,
                extra_note: row.get(4)?,
                source_module: row.get(5)?,
                source_id: row.get(6)?,
                media_url: row.get(7)?,
                card_type: row.get(8)?,
                validation_mode: row.get(9)?,
                due_date: row.get(10)?,
                state: row.get(11)?,
                stability: row.get(12)?,
                difficulty: row.get(13)?,
                elapsed_days: row.get(14)?,
                scheduled_days: row.get(15)?,
                reps: row.get(16)?,
                lapses: row.get(17)?,
                last_review: row.get(18)?,
                created_at: row.get(19)?,
                tags: row
                    .get::<_, Option<String>>(20)?
                    .and_then(|s| serde_json::from_str(&s).ok()),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }
    Ok(items)
}

#[tauri::command]
pub fn anki_get_card(card_id: String, db_state: State<'_, DbState>) -> Result<AnkiCard, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("
        SELECT c.id, c.deck_id, c.front, c.back, c.extra_note, c.source_module, c.source_id, c.media_url, c.card_type, c.validation_mode,
               st.due_date, st.state, st.stability, st.difficulty, st.elapsed_days, st.scheduled_days, st.reps, st.lapses, st.last_review, c.created_at, c.tags
        FROM anki_cards c 
        LEFT JOIN anki_srs_state st ON c.id = st.id 
        WHERE c.id = ? AND c.deleted_at IS NULL
    ").map_err(|e| e.to_string())?;

    stmt.query_row([&card_id], |row| {
        Ok(AnkiCard {
            id: row.get(0)?,
            deck_id: row.get(1)?,
            front: row.get(2)?,
            back: row.get(3)?,
            extra_note: row.get(4)?,
            source_module: row.get(5)?,
            source_id: row.get(6)?,
            media_url: row.get(7)?,
            card_type: row.get(8)?,
            validation_mode: row.get(9)?,
            due_date: row.get(10)?,
            state: row.get(11)?,
            stability: row.get(12)?,
            difficulty: row.get(13)?,
            elapsed_days: row.get(14)?,
            scheduled_days: row.get(15)?,
            reps: row.get(16)?,
            lapses: row.get(17)?,
            last_review: row.get(18)?,
            created_at: row.get(19)?,
            tags: row
                .get::<_, Option<String>>(20)?
                .and_then(|s| serde_json::from_str(&s).ok()),
        })
    })
    .map_err(|e| e.to_string())
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
pub fn anki_delete_card(card_id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| e.to_string())?;
    let _ = conn.execute("UPDATE anki_reviews SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE card_id = ?", [&card_id]);
    let _ = conn.execute("UPDATE anki_srs_state SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&card_id]);
    if let Err(e) = conn.execute("UPDATE anki_cards SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&card_id]) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e.to_string());
    }
    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn anki_update_card(
    card_id: String,
    card: AnkiCard,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    conn.execute(
        "UPDATE anki_cards SET front = ?, back = ?, extra_note = ?, media_url = ?, validation_mode = ?, card_type = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![card.front, card.back, card.extra_note, card.media_url, card.validation_mode, card.card_type, card.tags.as_ref().and_then(|t| serde_json::to_string(t).ok()).unwrap_or_else(|| "[]".to_string()), card_id]
    ).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn anki_update_deck(
    deck_id: String,
    name: String,
    description: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    conn.execute(
        "UPDATE anki_decks SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![name, description, deck_id]
    ).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn anki_delete_deck(deck_id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("BEGIN TRANSACTION", [])
        .map_err(|e| e.to_string())?;
    let _ = conn.execute("UPDATE anki_decks SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&deck_id]);
    let _ = conn.execute("UPDATE anki_cards SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE deck_id = ?", [&deck_id]);
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

#[tauri::command]
pub fn anki_update_deck_settings(
    deck_id: String,
    settings: AnkiDeckSettings,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    // Check if exists
    let mut exists = false;
    if let Ok(mut stmt) = conn.prepare("SELECT id FROM anki_deck_settings WHERE deck_id = ?") {
        if stmt.exists([&deck_id]).unwrap_or(false) {
            exists = true;
        }
    }

    if exists {
        conn.execute(
            "UPDATE anki_deck_settings SET new_limit = ?, review_limit = ?, learning_steps = ?, relearning_steps = ?, fsrs_weights = ?, updated_at = CURRENT_TIMESTAMP WHERE deck_id = ?",
            params![settings.new_limit, settings.review_limit, settings.learning_steps, settings.relearning_steps, settings.fsrs_weights, deck_id]
        ).map_err(|e| e.to_string())?;
    } else {
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO anki_deck_settings (id, deck_id, new_limit, review_limit, learning_steps, relearning_steps, fsrs_weights) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![id, deck_id, settings.new_limit, settings.review_limit, settings.learning_steps, settings.relearning_steps, settings.fsrs_weights]
        ).map_err(|e| e.to_string())?;
    }

    Ok(true)
}
