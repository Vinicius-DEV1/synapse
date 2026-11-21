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

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct AnkiReviewRecord {
    pub id: String,
    pub card_id: String,
    pub rating: i32,
    pub reviewed_at: String,
    pub deleted_at: Option<String>,
    pub updated_at: Option<String>,
}

fn normalize_state_str(state: Option<String>) -> Option<String> {
    state.map(|s| match s.trim().to_lowercase().as_str() {
        "new" | "0" => "0".to_string(),
        "learning" | "1" => "1".to_string(),
        "review" | "2" => "2".to_string(),
        "relearning" | "3" => "3".to_string(),
        _ => "0".to_string(),
    })
}

fn map_card_to_anki_card(c: Card) -> AnkiCard {
    let parsed_tags = c.tags.as_ref().and_then(|t| {
        if t.trim().is_empty() {
            Some(Vec::new())
        } else {
            serde_json::from_str::<Vec<String>>(t).ok()
        }
    });
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
        state: normalize_state_str(c.state),
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
pub async fn anki_get_decks(db_state: State<'_, DbState>) -> Result<Vec<AnkiDeck>, String> {
    db_state
        .read(|conn| {
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
        })
        .await
}

#[tauri::command]
pub async fn anki_create_deck(
    name: String,
    description: Option<String>,
    parent_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<String, String> {
    db_state
        .write(move |conn| {
            let id = AnkiRepository::create_deck_conn(
                conn,
                &name,
                description.as_deref(),
                None,
                parent_id.as_deref(),
            )
            .map_err(|e| e.to_string())?;

            let _ =
                AnkiRepository::update_deck_settings_conn(conn, &id, AnkiDeckSettings::default());
            Ok(id)
        })
        .await
}

#[tauri::command]
pub async fn anki_get_deck_settings(
    deck_id: String,
    db_state: State<'_, DbState>,
) -> Result<AnkiDeckSettings, String> {
    db_state
        .read(move |conn| {
            AnkiRepository::get_deck_settings_conn(conn, &deck_id).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn anki_save_card(card: AnkiCard, db_state: State<'_, DbState>) -> Result<String, String> {
    db_state
        .write(move |conn| {
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
        })
        .await
}

#[tauri::command]
pub async fn anki_get_all_cards(
    deck_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<Vec<AnkiCard>, String> {
    db_state
        .read(move |conn| {
            let cards = match deck_id {
                Some(did) => {
                    AnkiRepository::get_due_cards_conn(conn, &did).map_err(|e| e.to_string())?
                }
                None => AnkiRepository::get_due_cards_conn(conn, "").map_err(|e| e.to_string())?,
            };
            Ok(cards.into_iter().map(map_card_to_anki_card).collect())
        })
        .await
}

#[tauri::command]
pub async fn anki_get_card(card_id: String, db_state: State<'_, DbState>) -> Result<AnkiCard, String> {
    db_state
        .read(move |conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT c.id, c.deck_id, c.front, c.back, c.tags, c.card_type, c.validation_mode, c.extra_note, c.media_url, c.created_at,
                            s.stability, s.difficulty, s.elapsed_days, s.scheduled_days, s.reps, s.lapses, s.state, s.due_date, s.last_review
                     FROM anki_cards c
                     LEFT JOIN anki_srs_state s ON c.id = s.id
                     WHERE c.id = ? AND c.deleted_at IS NULL",
                )
                .map_err(|e| e.to_string())?;

            let anki_card = stmt
                .query_row([&card_id], |row| {
                    let tags_raw: Option<String> = row.get(4)?;
                    let parsed_tags = tags_raw.as_ref().and_then(|t| {
                        if t.trim().is_empty() {
                            Some(Vec::new())
                        } else {
                            serde_json::from_str::<Vec<String>>(t).ok()
                        }
                    });
                    let raw_state: Option<String> = row.get(16).ok().flatten();
                    Ok(AnkiCard {
                        id: row.get(0)?,
                        deck_id: row.get(1)?,
                        front: row.get(2)?,
                        back: row.get(3)?,
                        tags: parsed_tags,
                        card_type: row
                            .get::<_, Option<String>>(5)?
                            .unwrap_or_else(|| "reading".to_string()),
                        validation_mode: row
                            .get::<_, Option<String>>(6)?
                            .unwrap_or_else(|| "default".to_string()),
                        extra_note: row.get(7)?,
                        media_url: row.get(8)?,
                        source_module: None,
                        source_id: None,
                        created_at: row.get(9)?,
                        stability: row.get(10).ok().flatten(),
                        difficulty: row.get(11).ok().flatten(),
                        elapsed_days: row.get(12).ok().flatten(),
                        scheduled_days: row.get(13).ok().flatten(),
                        reps: row.get(14).ok().flatten(),
                        lapses: row.get(15).ok().flatten(),
                        state: normalize_state_str(raw_state),
                        due_date: row.get(17).ok().flatten(),
                        last_review: row.get(18).ok().flatten(),
                    })
                })
                .map_err(|e| e.to_string())?;

            Ok(anki_card)
        })
        .await
}

#[tauri::command]
pub async fn anki_get_reviews(
    db_state: State<'_, DbState>,
) -> Result<Vec<AnkiReviewRecord>, String> {
    db_state
        .read(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, card_id, rating, COALESCE(review_time, created_at) as reviewed_at, deleted_at, updated_at
                     FROM anki_reviews
                     WHERE deleted_at IS NULL
                     ORDER BY reviewed_at DESC",
                )
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map([], |row| {
                    Ok(AnkiReviewRecord {
                        id: row.get(0)?,
                        card_id: row.get(1)?,
                        rating: row.get(2)?,
                        reviewed_at: row
                            .get::<_, Option<String>>(3)?
                            .unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
                        deleted_at: row.get(4).ok().flatten(),
                        updated_at: row.get(5).ok().flatten(),
                    })
                })
                .map_err(|e| e.to_string())?;

            let mut list = Vec::new();
            for r in rows.flatten() {
                list.push(r);
            }
            Ok(list)
        })
        .await
}

#[tauri::command]
pub async fn anki_move_cards(
    card_ids: Vec<String>,
    new_deck_id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    if card_ids.is_empty() || new_deck_id.trim().is_empty() {
        return Ok(true);
    }
    db_state
        .write(move |conn| {
            let now = chrono::Utc::now().to_rfc3339();
            for cid in card_ids {
                conn.execute(
                    "UPDATE anki_cards SET deck_id = ?1, updated_at = ?2 WHERE id = ?3",
                    rusqlite::params![new_deck_id, now, cid],
                )
                .map_err(|e| e.to_string())?;
            }
            Ok(true)
        })
        .await
}

#[tauri::command]
pub async fn anki_delete_card(
    card_id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| AnkiRepository::delete_card_conn(conn, &card_id).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn anki_update_card(
    card_id: String,
    card: AnkiCard,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
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
        })
        .await
}

#[tauri::command]
pub async fn anki_update_deck(
    deck_id: String,
    name: String,
    description: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            AnkiRepository::update_deck_conn(conn, &deck_id, &name, description.as_deref(), None)
                .map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn anki_delete_deck(
    deck_id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| AnkiRepository::delete_deck_conn(conn, &deck_id).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn anki_update_deck_settings(
    deck_id: String,
    settings: AnkiDeckSettings,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            AnkiRepository::update_deck_settings_conn(conn, &deck_id, settings)
                .map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn anki_get_total_due_count(db_state: State<'_, DbState>) -> Result<i64, String> {
    db_state
        .read(|conn| AnkiRepository::get_total_due_count_conn(conn).map_err(|e| e.to_string()))
        .await
}
