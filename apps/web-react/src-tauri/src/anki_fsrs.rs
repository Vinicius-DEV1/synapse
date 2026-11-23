use crate::db::DbState;
use synapse_core::domain::anki::AnkiRepository;
use tauri::State;

#[tauri::command]
pub async fn anki_review_card_fsrs(
    card_id: String,
    rating: i32,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            AnkiRepository::record_card_review_conn(conn, &card_id, rating)
                .map_err(|error| error.to_string())
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
            AnkiRepository::reset_deck_progress_conn(conn, &deck_id)
                .map_err(|error| error.to_string())
        })
        .await
}
