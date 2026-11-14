use crate::db::DbState;
use synapse_core::domain::anki::{AnkiDeckSettings, AnkiRepository, Card};
use tauri::State;

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct AnkiDeck {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, Default)]
#[serde(default)]
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

fn map_card_to_anki_card(c: Card) -> AnkiCard {
    let parsed_tags = c.tags.as_ref().and_then(|t| serde_json::from_str::<Vec<String>>(t).ok());
    AnkiCard {
        id: c.id,
        deck_id: c.deck_id,
        front: c.front,
        back: c.back,
        extra_note: c.extra_note,
        source_module: None,
        source_id: None,
        media_url: c.media_url,
        card_type: c.card_type.unwrap_or_else(|| "reading".to_string()),
        validation_mode: c.validation_mode.unwrap_or_else(|| "default".to_string()),
        tags: parsed_tags,
        due_date: c.due_date,
        state: c.state,
        stability: c.stability,
        difficulty: c.difficulty,
        elapsed_days: None,
        scheduled_days: None,
        reps: c.reps,
        lapses: c.lapses,
        last_review: None,
        created_at: c.created_at,
    }
}

#[tauri::command]
pub fn anki_get_decks(db_state: State<'_, DbState>) -> Result<Vec<AnkiDeck>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let decks = AnkiRepository::get_decks_conn(conn).map_err(|e| e.to_string())?;
    Ok(decks
        .into_iter()
        .map(|d| AnkiDeck {
            id: d.id,
            name: d.name,
            description: d.description,
            parent_id: d.parent_id,
        })
        .collect())
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
    let id = AnkiRepository::create_deck_conn(conn, &name, description.as_deref(), None, parent_id.as_deref())
        .map_err(|e| e.to_string())?;

    // Default settings
    let _ = AnkiRepository::update_deck_settings_conn(conn, &id, AnkiDeckSettings::default());
    Ok(id)
}

#[tauri::command]
pub fn anki_get_deck_settings(
    deck_id: String,
    db_state: State<'_, DbState>,
) -> Result<AnkiDeckSettings, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    AnkiRepository::get_deck_settings_conn(conn, &deck_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn anki_save_card(card: AnkiCard, db_state: State<'_, DbState>) -> Result<String, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let tags_json = card.tags.as_ref().and_then(|t| serde_json::to_string(t).ok());

    if card.id.is_empty() {
        AnkiRepository::create_card_conn(
            conn,
            &card.deck_id,
            &card.front,
            &card.back,
            tags_json.as_deref(),
            Some(&card.card_type),
            card.extra_note.as_deref(),
        )
        .map_err(|e| e.to_string())
    } else {
        AnkiRepository::update_card_conn(
            conn,
            &card.id,
            &card.front,
            &card.back,
            tags_json.as_deref(),
            Some(&card.card_type),
            card.extra_note.as_deref(),
        )
        .map_err(|e| e.to_string())?;
        Ok(card.id)
    }
}

#[tauri::command]
pub fn anki_get_all_cards(
    deck_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<Vec<AnkiCard>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let cards = match deck_id {
        Some(did) => AnkiRepository::get_due_cards_conn(conn, &did).map_err(|e| e.to_string())?,
        None => AnkiRepository::get_due_cards_conn(conn, "").map_err(|e| e.to_string())?,
    };
    Ok(cards.into_iter().map(map_card_to_anki_card).collect())
}

#[tauri::command]
pub fn anki_get_card(card_id: String, db_state: State<'_, DbState>) -> Result<AnkiCard, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let mut stmt = conn
        .prepare("SELECT id, deck_id, front, back, tags, card_type, validation_mode, extra_note, media_url, created_at FROM anki_cards WHERE id = ? AND deleted_at IS NULL")
        .map_err(|e| e.to_string())?;

    let card = stmt
        .query_row([&card_id], |row| {
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
                stability: None,
                difficulty: None,
                reps: None,
                lapses: None,
                state: None,
                due_date: None,
                created_at: row.get(9)?,
                updated_at: None,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(map_card_to_anki_card(card))
}

#[tauri::command]
pub fn anki_delete_card(card_id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    AnkiRepository::delete_card_conn(conn, &card_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn anki_update_card(
    card_id: String,
    card: AnkiCard,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let tags_json = card.tags.as_ref().and_then(|t| serde_json::to_string(t).ok());
    AnkiRepository::update_card_conn(
        conn,
        &card_id,
        &card.front,
        &card.back,
        tags_json.as_deref(),
        Some(&card.card_type),
        card.extra_note.as_deref(),
    )
    .map_err(|e| e.to_string())
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
    AnkiRepository::update_deck_conn(conn, &deck_id, &name, description.as_deref(), None)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn anki_delete_deck(deck_id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    AnkiRepository::delete_deck_conn(conn, &deck_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn anki_update_deck_settings(
    deck_id: String,
    settings: AnkiDeckSettings,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    AnkiRepository::update_deck_settings_conn(conn, &deck_id, settings).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn anki_get_total_due_count(db_state: State<'_, DbState>) -> Result<i64, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    AnkiRepository::get_total_due_count_conn(conn).map_err(|e| e.to_string())
}
