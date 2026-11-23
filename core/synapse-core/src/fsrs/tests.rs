use super::{Card, FsrsEngine, FsrsParameters, Rating, State};
use chrono::{Duration, Utc};

#[test]
fn initial_good_review_creates_a_review_card() {
    let mut params = FsrsParameters::default();
    params.learning_steps.clear();
    let engine = FsrsEngine::new(Some(params));
    let updated = engine.review(&Card::default(), Rating::Good, Utc::now());

    assert_eq!(updated.state, State::Review);
    assert!(updated.stability > 0.0);
    assert!((1.0..=10.0).contains(&updated.difficulty));
    assert!(updated.scheduled_days >= 1);
    assert_eq!(updated.reps, 1);
    assert_eq!(updated.lapses, 0);
}

#[test]
fn initial_again_review_enters_learning_steps() {
    let engine = FsrsEngine::new(None);
    let updated = engine.review(&Card::default(), Rating::Again, Utc::now());

    assert_eq!(updated.state, State::Learning);
    assert_eq!(updated.lapses, 0);
    assert_eq!(updated.learning_steps, 0);
    assert_eq!(updated.scheduled_days, 0);
}

#[test]
fn review_progression_increases_stability_after_success() {
    let mut params = FsrsParameters::default();
    params.learning_steps.clear();
    let engine = FsrsEngine::new(Some(params));
    let day0 = Utc::now();
    let card1 = engine.review(&Card::default(), Rating::Good, day0);
    let day3 = day0 + Duration::days(card1.scheduled_days as i64);
    let card2 = engine.review(&card1, Rating::Good, day3);

    assert!(card2.stability > card1.stability);
    assert!(card2.scheduled_days > card1.scheduled_days);
    assert_eq!(card2.reps, 2);
}
