pub mod cards;
pub mod decks;
pub mod models;
pub mod queue;
pub mod review;
pub mod settings;
mod study_cards;

#[cfg(test)]
mod tests;

pub use cards::*;
pub use decks::*;
pub use models::*;
pub use review::*;
pub use settings::*;

use crate::db::Database;
use crate::error::{Result, SynapseError};

pub struct AnkiRepository;

impl AnkiRepository {
    // --- Decks ---
    pub fn get_decks(db: &Database) -> Result<Vec<Deck>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        decks::get_decks(&conn)
    }

    pub fn get_decks_conn(conn: &rusqlite::Connection) -> Result<Vec<Deck>> {
        decks::get_decks(conn)
    }

    pub fn get_hierarchical_decks(db: &Database) -> Result<Vec<HierarchicalDeck>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        decks::get_hierarchical_decks(&conn)
    }

    pub fn get_hierarchical_decks_conn(
        conn: &rusqlite::Connection,
    ) -> Result<Vec<HierarchicalDeck>> {
        decks::get_hierarchical_decks(conn)
    }

    pub fn get_deck_stats(db: &Database, deck_id: &str) -> Result<DeckStats> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        decks::get_deck_stats(&conn, deck_id)
    }

    pub fn get_deck_stats_conn(conn: &rusqlite::Connection, deck_id: &str) -> Result<DeckStats> {
        decks::get_deck_stats(conn, deck_id)
    }

    pub fn get_global_anki_stats(db: &Database) -> Result<GlobalAnkiStats> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        decks::get_global_anki_stats(&conn)
    }

    pub fn get_global_anki_stats_conn(conn: &rusqlite::Connection) -> Result<GlobalAnkiStats> {
        decks::get_global_anki_stats(conn)
    }

    pub fn create_deck(
        db: &Database,
        name: &str,
        description: Option<&str>,
        color: Option<&str>,
        parent_id: Option<&str>,
    ) -> Result<String> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        decks::create_deck(&conn, name, description, color, parent_id)
    }

    pub fn create_deck_conn(
        conn: &rusqlite::Connection,
        name: &str,
        description: Option<&str>,
        color: Option<&str>,
        parent_id: Option<&str>,
    ) -> Result<String> {
        decks::create_deck(conn, name, description, color, parent_id)
    }

    pub fn update_deck(
        db: &Database,
        deck_id: &str,
        name: &str,
        description: Option<&str>,
        color: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        decks::update_deck(&conn, deck_id, name, description, color)
    }

    pub fn update_deck_conn(
        conn: &rusqlite::Connection,
        deck_id: &str,
        name: &str,
        description: Option<&str>,
        color: Option<&str>,
    ) -> Result<bool> {
        decks::update_deck(conn, deck_id, name, description, color)
    }

    pub fn delete_deck(db: &Database, deck_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        decks::delete_deck(&conn, deck_id)
    }

    pub fn delete_deck_conn(conn: &rusqlite::Connection, deck_id: &str) -> Result<bool> {
        decks::delete_deck(conn, deck_id)
    }

    pub fn reset_deck_progress(db: &Database, deck_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        decks::reset_deck_progress(&conn, deck_id)
    }

    pub fn reset_deck_progress_conn(conn: &rusqlite::Connection, deck_id: &str) -> Result<bool> {
        decks::reset_deck_progress(conn, deck_id)
    }

    // --- Cards ---
    pub fn get_deck_cards(db: &Database, deck_id: &str) -> Result<Vec<Card>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        cards::get_deck_cards(&conn, deck_id)
    }

    pub fn get_deck_cards_conn(conn: &rusqlite::Connection, deck_id: &str) -> Result<Vec<Card>> {
        cards::get_deck_cards(conn, deck_id)
    }

    pub fn get_due_cards(db: &Database, deck_id: &str) -> Result<Vec<Card>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        cards::get_due_cards(&conn, deck_id)
    }

    pub fn get_due_cards_conn(conn: &rusqlite::Connection, deck_id: &str) -> Result<Vec<Card>> {
        cards::get_due_cards(conn, deck_id)
    }

    pub fn get_study_queue(db: &Database, deck_id: &str) -> Result<Vec<Card>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        queue::get_study_queue(&conn, deck_id)
    }

    pub fn get_study_queue_conn(conn: &rusqlite::Connection, deck_id: &str) -> Result<Vec<Card>> {
        queue::get_study_queue(conn, deck_id)
    }

    pub fn get_due_cards_count(db: &Database) -> Result<i64> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        cards::get_due_cards_count(&conn)
    }

    pub fn get_due_cards_count_conn(conn: &rusqlite::Connection) -> Result<i64> {
        cards::get_due_cards_count(conn)
    }

    pub fn create_card(
        db: &Database,
        deck_id: &str,
        front: &str,
        back: &str,
        tags: Option<&str>,
        card_type: Option<&str>,
        extra_note: Option<&str>,
    ) -> Result<String> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        cards::create_card(&conn, deck_id, front, back, tags, card_type, extra_note)
    }

    pub fn create_card_conn(
        conn: &rusqlite::Connection,
        deck_id: &str,
        front: &str,
        back: &str,
        tags: Option<&str>,
        card_type: Option<&str>,
        extra_note: Option<&str>,
    ) -> Result<String> {
        cards::create_card(conn, deck_id, front, back, tags, card_type, extra_note)
    }

    pub fn update_card(
        db: &Database,
        card_id: &str,
        front: &str,
        back: &str,
        tags: Option<&str>,
        card_type: Option<&str>,
        extra_note: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        cards::update_card(&conn, card_id, front, back, tags, card_type, extra_note)
    }

    pub fn update_card_conn(
        conn: &rusqlite::Connection,
        card_id: &str,
        front: &str,
        back: &str,
        tags: Option<&str>,
        card_type: Option<&str>,
        extra_note: Option<&str>,
    ) -> Result<bool> {
        cards::update_card(conn, card_id, front, back, tags, card_type, extra_note)
    }

    pub fn delete_card(db: &Database, card_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        cards::delete_card(&conn, card_id)
    }

    pub fn delete_card_conn(conn: &rusqlite::Connection, card_id: &str) -> Result<bool> {
        cards::delete_card(conn, card_id)
    }

    pub fn move_cards_conn(
        conn: &rusqlite::Connection,
        card_ids: &[String],
        new_deck_id: &str,
    ) -> Result<bool> {
        cards::move_cards(conn, card_ids, new_deck_id)
    }

    // --- Review ---
    pub fn record_card_review(db: &Database, card_id: &str, rating: i32) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        review::record_card_review(&conn, card_id, rating)
    }

    pub fn record_card_review_conn(
        conn: &rusqlite::Connection,
        card_id: &str,
        rating: i32,
    ) -> Result<bool> {
        review::record_card_review(conn, card_id, rating)
    }

    // --- Settings & Due Counts ---
    pub fn get_deck_settings(db: &Database, deck_id: &str) -> Result<AnkiDeckSettings> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        settings::get_deck_settings(&conn, deck_id)
    }

    pub fn get_deck_settings_conn(
        conn: &rusqlite::Connection,
        deck_id: &str,
    ) -> Result<AnkiDeckSettings> {
        settings::get_deck_settings(conn, deck_id)
    }

    pub fn update_deck_settings(db: &Database, deck_id: &str, s: AnkiDeckSettings) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        settings::update_deck_settings(&conn, deck_id, s)
    }

    pub fn update_deck_settings_conn(
        conn: &rusqlite::Connection,
        deck_id: &str,
        s: AnkiDeckSettings,
    ) -> Result<bool> {
        settings::update_deck_settings(conn, deck_id, s)
    }

    pub fn get_total_due_count(db: &Database) -> Result<i64> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        settings::get_total_due_count(&conn)
    }

    pub fn get_total_due_count_conn(conn: &rusqlite::Connection) -> Result<i64> {
        settings::get_total_due_count(conn)
    }
}
