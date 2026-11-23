use super::models::Card;
use crate::error::Result;
use std::collections::{HashMap, HashSet};

pub fn get_due_cards(conn: &rusqlite::Connection, deck_id: &str) -> Result<Vec<Card>> {
    let mut stmt = conn.prepare("SELECT id, parent_id FROM anki_decks WHERE deleted_at IS NULL")?;
    let mut children_map: HashMap<String, Vec<String>> = HashMap::new();
    let rows = stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let pid: Option<String> = row.get(1)?;
        Ok((id, pid))
    })?;

    for r in rows {
        let (id, pid) = r?;
        if let Some(parent) = pid.filter(|s| !s.is_empty()) {
            children_map.entry(parent).or_default().push(id);
        }
    }

    let mut target_deck_ids = Vec::new();
    let mut seen_deck_ids = HashSet::new();
    if deck_id.trim().is_empty() {
        for (parent, children) in &children_map {
            if seen_deck_ids.insert(parent.clone()) {
                target_deck_ids.push(parent.clone());
            }
            for c in children {
                if seen_deck_ids.insert(c.clone()) {
                    target_deck_ids.push(c.clone());
                }
            }
        }
        let mut all_stmt = conn.prepare("SELECT id FROM anki_decks WHERE deleted_at IS NULL")?;
        let all_rows = all_stmt.query_map([], |row| row.get::<_, String>(0))?;
        for r in all_rows {
            let r = r?;
            if seen_deck_ids.insert(r.clone()) {
                target_deck_ids.push(r);
            }
        }
        // Also include any cards whose deck_id might not be in anki_decks
        let mut c_stmt =
            conn.prepare("SELECT DISTINCT deck_id FROM anki_cards WHERE deleted_at IS NULL")?;
        let c_rows = c_stmt.query_map([], |row| row.get::<_, String>(0))?;
        for r in c_rows {
            let r = r?;
            if seen_deck_ids.insert(r.clone()) {
                target_deck_ids.push(r);
            }
        }
    } else {
        fn collect(
            did: &str,
            map: &HashMap<String, Vec<String>>,
            out: &mut Vec<String>,
            seen: &mut HashSet<String>,
        ) {
            if !seen.insert(did.to_string()) {
                return;
            }
            out.push(did.to_string());
            if let Some(children) = map.get(did) {
                for c in children {
                    collect(c, map, out, seen);
                }
            }
        }
        collect(
            deck_id,
            &children_map,
            &mut target_deck_ids,
            &mut seen_deck_ids,
        );
    }

    if target_deck_ids.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = vec!["?"; target_deck_ids.len()].join(",");
    let sql = format!(
        "SELECT c.id, c.deck_id, c.front, c.back,
                COALESCE(c.tags, '') as tags,
                COALESCE(c.card_type, 'reading') as card_type,
                COALESCE(c.validation_mode, 'default') as validation_mode,
                COALESCE(c.extra_note, '') as extra_note,
                c.media_url,
                COALESCE(s.stability, 0) as stability, COALESCE(s.difficulty, 0) as difficulty,
                COALESCE(s.reps, 0) as reps, COALESCE(s.lapses, 0) as lapses,
                COALESCE(s.state, 'new') as state, s.due_date, c.created_at, c.updated_at,
                COALESCE(s.learning_steps, 0) as learning_steps
         FROM anki_cards c
         LEFT JOIN anki_srs_state s ON c.id = s.id
         WHERE c.deck_id IN ({}) AND c.deleted_at IS NULL
         ORDER BY CASE
           WHEN s.state IN ('learning', 'relearning') THEN 1
           WHEN s.state = 'review' AND datetime(s.due_date) <= datetime('now') THEN 2
           WHEN COALESCE(s.state, 'new') = 'new' OR COALESCE(s.reps, 0) = 0 THEN 3
           ELSE 4 END ASC, c.created_at ASC",
        placeholders
    );

    let params: Vec<&dyn rusqlite::ToSql> = target_deck_ids
        .iter()
        .map(|id| id as &dyn rusqlite::ToSql)
        .collect();
    let mut q_stmt = conn.prepare(&sql)?;
    let mut cards: Vec<Card> = q_stmt
        .query_map(&params[..], |row| {
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
                stability: row.get(9)?,
                difficulty: row.get(10)?,
                reps: row.get(11)?,
                lapses: row.get(12)?,
                state: row.get(13)?,
                due_date: row.get(14)?,
                created_at: row.get(15)?,
                updated_at: row.get(16)?,
                learning_steps: row.get(17)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    // If no due cards in current schedule, provide all cards in the deck for practice study
    if cards.is_empty() {
        let fallback_sql = format!(
            "SELECT c.id, c.deck_id, c.front, c.back,
                    COALESCE(c.tags, '') as tags,
                    COALESCE(c.card_type, 'reading') as card_type,
                    COALESCE(c.validation_mode, 'default') as validation_mode,
                    COALESCE(c.extra_note, '') as extra_note,
                    c.media_url,
                    COALESCE(s.stability, 0) as stability, COALESCE(s.difficulty, 0) as difficulty,
                    COALESCE(s.reps, 0) as reps, COALESCE(s.lapses, 0) as lapses,
                COALESCE(s.state, 'new') as state, s.due_date, c.created_at, c.updated_at,
                COALESCE(s.learning_steps, 0) as learning_steps
             FROM anki_cards c
             LEFT JOIN anki_srs_state s ON c.id = s.id
             WHERE c.deck_id IN ({}) AND c.deleted_at IS NULL
             ORDER BY c.created_at ASC",
            placeholders
        );
        let mut fb_stmt = conn.prepare(&fallback_sql)?;
        cards = fb_stmt
            .query_map(&params[..], |row| {
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
                    stability: row.get(9)?,
                    difficulty: row.get(10)?,
                    reps: row.get(11)?,
                    lapses: row.get(12)?,
                    state: row.get(13)?,
                    due_date: row.get(14)?,
                    created_at: row.get(15)?,
                    updated_at: row.get(16)?,
                    learning_steps: row.get(17)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
    }

    Ok(cards)
}
