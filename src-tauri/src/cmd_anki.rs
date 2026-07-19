use tauri::State;
use serde::{Deserialize, Serialize};
use crate::db::DbState;
use rusqlite::params;
use chrono::{Utc, Duration};

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
}

#[derive(Serialize, Deserialize)]
pub struct AnkiCardWithState {
    pub card: AnkiCard,
    pub state: i32,
    pub due_date: String,
}

#[tauri::command]
pub fn anki_get_decks(db_state: State<'_, DbState>) -> Result<Vec<AnkiDeck>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT id, name, description, parent_id FROM anki_decks ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let iter = stmt.query_map([], |row| {
        Ok(AnkiDeck {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            parent_id: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i { items.push(item); }
    }
    Ok(items)
}

#[tauri::command]
pub fn anki_create_deck(name: String, description: Option<String>, parent_id: Option<String>, db_state: State<'_, DbState>) -> Result<String, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO anki_decks (id, name, description, parent_id) VALUES (?, ?, ?, ?)",
        params![id, name, description.unwrap_or_default(), parent_id]
    ).map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub fn anki_save_card(card: AnkiCard, db_state: State<'_, DbState>) -> Result<String, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let id = if card.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { card.id.clone() };
    
    conn.execute("BEGIN TRANSACTION", []).map_err(|e| e.to_string())?;
    
    if let Err(e) = conn.execute(
        "INSERT INTO anki_cards (id, deck_id, front, back, extra_note, source_module, source_id, media_url, card_type, validation_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, card.deck_id, card.front, card.back, card.extra_note, card.source_module, card.source_id, card.media_url, card.card_type, card.validation_mode]
    ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e.to_string());
    }
    
    let now = Utc::now().to_rfc3339();
    if let Err(e) = conn.execute(
        "INSERT INTO anki_srs_state (id, due_date, stability, difficulty, state) VALUES (?, ?, ?, ?, ?)",
        params![id, now, 0.0, 0.0, 0]
    ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e.to_string());
    }
    
    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub fn anki_get_due_cards(deck_id: String, db_state: State<'_, DbState>) -> Result<Vec<AnkiCardWithState>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let now = Utc::now().to_rfc3339();
    
    let mut stmt = conn.prepare(
        "WITH RECURSIVE subdecks AS (
            SELECT id FROM anki_decks WHERE id = ? AND deleted_at IS NULL
            UNION ALL
            SELECT d.id FROM anki_decks d
            JOIN subdecks s ON d.parent_id = s.id
            WHERE d.deleted_at IS NULL
         )
         SELECT c.id, c.deck_id, c.front, c.back, c.extra_note, c.source_module, c.source_id, c.media_url, c.card_type, c.validation_mode, s.state, s.due_date 
         FROM anki_cards c JOIN anki_srs_state s ON c.id = s.id 
         WHERE c.deck_id IN (SELECT id FROM subdecks) AND s.due_date <= ? AND c.deleted_at IS NULL ORDER BY s.due_date ASC"
    ).map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([&deck_id, &now], |row| {
        Ok(AnkiCardWithState {
            card: AnkiCard {
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
            },
            state: row.get(10)?,
            due_date: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i { items.push(item); }
    }
    Ok(items)
}

#[tauri::command]
pub fn anki_review_card(card_id: String, rating: i32, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT stability, difficulty, state FROM anki_srs_state WHERE id = ?").map_err(|e| e.to_string())?;
    let (mut stability, mut difficulty, current_state): (f64, f64, String) = stmt.query_row([&card_id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))).unwrap_or((0.0, 0.0, "0".to_string()));
    
    let state_num = current_state.parse::<i32>().unwrap_or(0);
    let mut new_state = 2; // review
    
    if state_num == 0 {
        // New card
        match rating {
            1 => { stability = 0.5; difficulty = 8.0; new_state = 1; },
            2 => { stability = 1.0; difficulty = 6.0; },
            3 => { stability = 2.0; difficulty = 5.0; },
            _ => { stability = 4.0; difficulty = 4.0; },
        }
    } else {
        // Review or Learning
        match rating {
            1 => { stability *= 0.2; difficulty = (difficulty + 2.0).min(10.0); new_state = 1; },
            2 => { stability *= 1.2; difficulty = (difficulty + 1.0).min(10.0); },
            3 => { stability *= 2.5; difficulty = (difficulty - 0.5).max(1.0); },
            _ => { stability *= 3.5; difficulty = (difficulty - 2.0).max(1.0); },
        }
    }
    
    stability = stability.max(0.1);
    
    let now = Utc::now();
    let next_due = if rating == 1 {
        now + Duration::minutes(5)
    } else {
        now + Duration::seconds((stability * 86400.0) as i64)
    };
    
    let due_date_str = next_due.to_rfc3339();
    
    conn.execute("BEGIN TRANSACTION", []).map_err(|e| e.to_string())?;
    
    if let Err(e) = conn.execute(
        "UPDATE anki_srs_state SET due_date = ?, stability = ?, difficulty = ?, state = ?, reps = reps + 1, last_review = CURRENT_TIMESTAMP WHERE id = ?",
        params![due_date_str, stability, difficulty, new_state.to_string(), card_id]
    ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e.to_string());
    }
    
    let review_id = uuid::Uuid::new_v4().to_string();
    if let Err(e) = conn.execute(
        "INSERT INTO anki_reviews (id, card_id, rating) VALUES (?, ?, ?)",
        params![review_id, card_id, rating]
    ) {
        let _ = conn.execute("ROLLBACK", []);
        return Err(e.to_string());
    }
    
    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn anki_get_all_cards(deck_id: Option<String>, db_state: State<'_, DbState>) -> Result<Vec<AnkiCard>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut query = "SELECT id, deck_id, front, back, extra_note, source_module, source_id, media_url, card_type, validation_mode FROM anki_cards WHERE deleted_at IS NULL".to_string();
    let mut p: Vec<String> = Vec::new();
    
    if let Some(did) = deck_id {
        query = "WITH RECURSIVE subdecks AS (
            SELECT id FROM anki_decks WHERE id = ? AND deleted_at IS NULL
            UNION ALL
            SELECT d.id FROM anki_decks d
            JOIN subdecks s ON d.parent_id = s.id
            WHERE d.deleted_at IS NULL
         )
         SELECT id, deck_id, front, back, extra_note, source_module, source_id, media_url, card_type, validation_mode FROM anki_cards WHERE deleted_at IS NULL AND deck_id IN (SELECT id FROM subdecks)".to_string();
        p.push(did);
    }
    query.push_str(" ORDER BY created_at DESC");
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let params_iter = rusqlite::params_from_iter(p.iter());
    
    let iter = stmt.query_map(params_iter, |row| {
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
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i { items.push(item); }
    }
    Ok(items)
}

#[tauri::command]
pub fn anki_delete_card(card_id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute("BEGIN TRANSACTION", []).map_err(|e| e.to_string())?;
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
pub fn anki_update_card(card_id: String, card: AnkiCard, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute(
        "UPDATE anki_cards SET front = ?, back = ?, extra_note = ?, media_url = ?, validation_mode = ?, card_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![card.front, card.back, card.extra_note, card.media_url, card.validation_mode, card.card_type, card_id]
    ).map_err(|e| e.to_string())?;
    Ok(true)
}
