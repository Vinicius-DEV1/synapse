use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_anki_deck_card_and_fsrs_review() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();

    // 1. Initial list empty
    let decks = AnkiRepository::get_decks(&db).unwrap();
    assert!(decks.is_empty());

    // 2. Create deck
    let deck_id = AnkiRepository::create_deck(&db, "Rust Deep Dive", Some("Memory & Safety"), Some("#f97316"), None).unwrap();
    assert!(!deck_id.is_empty());

    let decks = AnkiRepository::get_decks(&db).unwrap();
    assert_eq!(decks.len(), 1);
    assert_eq!(decks[0].name, "Rust Deep Dive");
    assert_eq!(decks[0].card_count, 0);

    // 3. Create card
    let card_id = AnkiRepository::create_card(
        &db,
        &deck_id,
        "What is the borrow checker?",
        "Compile-time static analysis enforcing memory safety rules without garbage collection.",
        Some("rust,memory"),
        Some("reading"),
        Some("Chapter 4 of Rust Book"),
    ).unwrap();
    assert!(!card_id.is_empty());

    let cards = AnkiRepository::get_deck_cards(&db, &deck_id).unwrap();
    assert_eq!(cards.len(), 1);
    assert_eq!(cards[0].front, "What is the borrow checker?");

    // 4. Check due cards
    let due = AnkiRepository::get_due_cards(&db, &deck_id).unwrap();
    assert_eq!(due.len(), 1);

    // 5. Check stats before review
    let stats = AnkiRepository::get_deck_stats(&db, &deck_id).unwrap();
    assert_eq!(stats.total, 1);
    assert_eq!(stats.novos, 1);

    // 6. Record review (Rating: Good = 3)
    let reviewed = AnkiRepository::record_card_review(&db, &card_id, 3).unwrap();
    assert!(reviewed);

    // Check stats after review
    let global_stats = AnkiRepository::get_global_anki_stats(&db).unwrap();
    assert_eq!(global_stats.total_cards, 1);
    assert_eq!(global_stats.total_reviews, 1);
    assert_eq!(global_stats.bom, 1);
    assert_eq!(global_stats.retention_rate, 100.0);

    // 7. Reset progress
    AnkiRepository::reset_deck_progress(&db, &deck_id).unwrap();
    let cards = AnkiRepository::get_deck_cards(&db, &deck_id).unwrap();
    assert_eq!(cards[0].reps, Some(0));
    assert_eq!(cards[0].state, Some("new".to_string()));
}
