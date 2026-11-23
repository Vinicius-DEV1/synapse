//! Shared Anki review queue ordering and deck limits.

use chrono::{DateTime, NaiveDateTime, Utc};

use super::cards;
use super::models::Card;
use super::settings;
use crate::error::{Result, SynapseError};

#[derive(Clone, Copy)]
enum TimestampField {
    DueDate,
    CreatedAt,
}

pub fn get_study_queue(conn: &rusqlite::Connection, deck_id: &str) -> Result<Vec<Card>> {
    let mut new_cards = Vec::new();
    let mut learning_cards = Vec::new();
    let mut review_cards = Vec::new();
    let now = Utc::now();

    for card in cards::get_due_cards(conn, deck_id)? {
        let state = card.state.as_deref().unwrap_or("new").to_ascii_lowercase();
        match state.as_str() {
            "1" | "learning" | "3" | "relearning" => {
                if timestamp_is_due(card.due_date.as_deref(), now)? {
                    learning_cards.push(card);
                }
            }
            "2" | "review" => {
                if timestamp_is_due(card.due_date.as_deref(), now)? {
                    review_cards.push(card);
                }
            }
            _ => new_cards.push(card),
        }
    }

    sort_by_timestamp(&mut learning_cards, TimestampField::DueDate)?;
    sort_by_timestamp(&mut review_cards, TimestampField::DueDate)?;
    sort_by_timestamp(&mut new_cards, TimestampField::CreatedAt)?;

    let deck_settings = settings::get_deck_settings(conn, deck_id)?;
    review_cards.truncate(deck_settings.review_limit.max(0) as usize);
    new_cards.truncate(deck_settings.new_limit.max(0) as usize);

    learning_cards.extend(review_cards);
    learning_cards.extend(new_cards);
    Ok(learning_cards)
}

fn timestamp_is_due(value: Option<&str>, now: DateTime<Utc>) -> Result<bool> {
    let Some(value) = value else {
        return Ok(false);
    };
    Ok(parse_timestamp(value)? <= now)
}

fn timestamp_key(value: Option<&str>) -> Result<i64> {
    value
        .map(|value| parse_timestamp(value).map(|date| date.timestamp_millis()))
        .transpose()
        .map(|value| value.unwrap_or(i64::MAX))
}

fn sort_by_timestamp(cards: &mut Vec<Card>, field: TimestampField) -> Result<()> {
    let mut keyed = cards
        .drain(..)
        .map(|card| {
            let timestamp = match field {
                TimestampField::DueDate => card.due_date.as_deref(),
                TimestampField::CreatedAt => card.created_at.as_deref(),
            };
            let key = timestamp_key(timestamp)?;
            Ok((key, card))
        })
        .collect::<Result<Vec<_>>>()?;
    keyed.sort_by_key(|(timestamp, _)| *timestamp);
    cards.extend(keyed.into_iter().map(|(_, card)| card));
    Ok(())
}

fn parse_timestamp(value: &str) -> Result<DateTime<Utc>> {
    if let Ok(date) = DateTime::parse_from_rfc3339(value) {
        return Ok(date.with_timezone(&Utc));
    }
    for format in ["%Y-%m-%d %H:%M:%S%.f", "%Y-%m-%dT%H:%M:%S%.f"] {
        if let Ok(date) = NaiveDateTime::parse_from_str(value, format) {
            return Ok(date.and_utc());
        }
    }
    Err(SynapseError::Validation(format!(
        "Invalid Anki timestamp: {value}"
    )))
}
