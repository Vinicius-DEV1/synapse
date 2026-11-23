use super::super::models::{DeckStats, GlobalAnkiStats};
use crate::error::Result;
use std::collections::{HashMap, HashSet};

pub fn get_deck_stats(conn: &rusqlite::Connection, deck_id: &str) -> Result<DeckStats> {
    // Collect target deck and its descendants
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
        &mut HashSet::new(),
    );

    if target_deck_ids.is_empty() {
        return Ok(DeckStats {
            total: 0,
            novos: 0,
            aprender: 0,
            revisar: 0,
        });
    }

    let placeholders = vec!["?"; target_deck_ids.len()].join(",");
    let sql = format!(
        "SELECT count(*) as total,
                COALESCE(SUM(CASE WHEN COALESCE(s.state, 'new') = 'new' OR COALESCE(s.reps, 0) = 0 THEN 1 ELSE 0 END), 0) as novos,
                COALESCE(SUM(CASE WHEN s.state IN ('learning', 'relearning') THEN 1 ELSE 0 END), 0) as aprender,
                COALESCE(SUM(CASE WHEN s.state = 'review' AND datetime(s.due_date) <= datetime('now') THEN 1 ELSE 0 END), 0) as revisar
         FROM anki_cards c
         LEFT JOIN anki_srs_state s ON c.id = s.id
         WHERE c.deck_id IN ({}) AND c.deleted_at IS NULL",
        placeholders
    );

    let params: Vec<&dyn rusqlite::ToSql> = target_deck_ids
        .iter()
        .map(|id| id as &dyn rusqlite::ToSql)
        .collect();
    let stats = conn.query_row(&sql, &params[..], |row| {
        Ok(DeckStats {
            total: row.get(0)?,
            novos: row.get(1)?,
            aprender: row.get(2)?,
            revisar: row.get(3)?,
        })
    })?;

    Ok(stats)
}

pub fn get_global_anki_stats(conn: &rusqlite::Connection) -> Result<GlobalAnkiStats> {
    let total_cards: i64 = conn.query_row(
        "SELECT count(*) FROM anki_cards WHERE deleted_at IS NULL",
        [],
        |r| r.get(0),
    )?;

    let (novos, aprendendo, maduros, jovens, avg_stability, avg_difficulty): (i64, i64, i64, i64, f64, f64) = conn
        .query_row(
            "SELECT
                COALESCE(SUM(CASE WHEN reps = 0 OR state = 'new' THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN state IN ('learning', 'relearning') THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN state = 'review' AND stability >= 21.0 THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN state = 'review' AND stability < 21.0 THEN 1 ELSE 0 END), 0),
                COALESCE(AVG(stability), 0.0),
                COALESCE(AVG(difficulty), 0.0)
             FROM anki_srs_state WHERE deleted_at IS NULL",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
        )
        ?;

    let (total_reviews, errei, dificil, bom, facil): (i64, i64, i64, i64, i64) = conn.query_row(
        "SELECT count(*),
                    COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0)
             FROM anki_reviews WHERE deleted_at IS NULL",
        [],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
    )?;

    let retention_rate = if total_reviews > 0 {
        ((bom + facil) as f64 * 100.0) / (total_reviews as f64)
    } else {
        90.0
    };

    Ok(GlobalAnkiStats {
        total_cards,
        novos,
        aprendendo,
        maduros,
        jovens,
        avg_stability,
        avg_difficulty,
        total_reviews,
        errei,
        dificil,
        bom,
        facil,
        retention_rate,
    })
}
