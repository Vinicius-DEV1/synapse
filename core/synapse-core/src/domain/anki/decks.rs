use super::models::{Deck, DeckStats, GlobalAnkiStats, HierarchicalDeck};
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;
use std::collections::{HashMap, HashSet};

pub fn get_decks(conn: &rusqlite::Connection) -> Result<Vec<Deck>> {
    let mut stmt = conn.prepare(
        "SELECT d.id, d.name, d.description, d.color, d.parent_id, 
                (SELECT count(*) FROM anki_cards c WHERE c.deck_id = d.id AND c.deleted_at IS NULL) as card_count 
         FROM anki_decks d 
         WHERE d.deleted_at IS NULL 
         ORDER BY d.name ASC",
    )?;

    let decks = stmt
        .query_map([], |row| {
            Ok(Deck {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                color: row.get(3)?,
                parent_id: row.get(4)?,
                card_count: row.get(5)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(decks)
}

pub fn get_hierarchical_decks(conn: &rusqlite::Connection) -> Result<Vec<HierarchicalDeck>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, color, parent_id FROM anki_decks WHERE deleted_at IS NULL ORDER BY name ASC",
    )?;

    struct RawDeck {
        id: String,
        name: String,
        description: Option<String>,
        color: Option<String>,
        parent_id: Option<String>,
    }

    let raw_decks: Vec<RawDeck> = stmt
        .query_map([], |row| {
            Ok(RawDeck {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                color: row.get(3)?,
                parent_id: row.get(4)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let mut stats_stmt = conn.prepare(
        "SELECT c.deck_id, 
                count(*) as total_cards, 
                COALESCE(SUM(CASE WHEN COALESCE(s.state, 'new') = 'new' OR COALESCE(s.reps, 0) = 0 THEN 1 ELSE 0 END), 0) as novos, 
                COALESCE(SUM(CASE WHEN s.state IN ('learning', 'relearning') THEN 1 ELSE 0 END), 0) as aprender, 
                COALESCE(SUM(CASE WHEN s.state = 'review' AND datetime(s.due_date) <= datetime('now') THEN 1 ELSE 0 END), 0) as revisar 
         FROM anki_cards c 
         LEFT JOIN anki_srs_state s ON c.id = s.id 
         WHERE c.deleted_at IS NULL 
         GROUP BY c.deck_id",
    )?;

    struct DeckStatRaw {
        total: i64,
        novos: i64,
        aprender: i64,
        revisar: i64,
    }

    let mut stats_map: HashMap<String, DeckStatRaw> = HashMap::new();
    let stats_rows = stats_stmt.query_map([], |row| {
        let deck_id: String = row.get(0)?;
        let stat = DeckStatRaw {
            total: row.get(1)?,
            novos: row.get(2)?,
            aprender: row.get(3)?,
            revisar: row.get(4)?,
        };
        Ok((deck_id, stat))
    })?;

    for r in stats_rows {
        let (did, st) = r?;
        stats_map.insert(did, st);
    }

    let all_ids: HashSet<String> = raw_decks.iter().map(|d| d.id.clone()).collect();
    let mut parent_to_children: HashMap<String, Vec<usize>> = HashMap::new();
    let mut root_indices = Vec::new();

    for (idx, d) in raw_decks.iter().enumerate() {
        match &d.parent_id {
            Some(pid) if !pid.is_empty() && all_ids.contains(pid) => {
                parent_to_children.entry(pid.clone()).or_default().push(idx);
            }
            _ => {
                root_indices.push(idx);
            }
        }
    }

    let mut result = Vec::new();

    fn traverse(
        current_idx: usize,
        depth: i32,
        raw_decks: &[RawDeck],
        parent_to_children: &HashMap<String, Vec<usize>>,
        stats_map: &HashMap<String, DeckStatRaw>,
        out: &mut Vec<HierarchicalDeck>,
    ) {
        let deck = &raw_decks[current_idx];
        let children = parent_to_children.get(&deck.id);
        let children_count = children.map(|c| c.len() as i32).unwrap_or(0);
        let has_children = children_count > 0;

        let (card_count, novos, aprender, revisar) = if let Some(st) = stats_map.get(&deck.id) {
            (st.total, st.novos, st.aprender, st.revisar)
        } else {
            (0, 0, 0, 0)
        };

        out.push(HierarchicalDeck {
            id: deck.id.clone(),
            name: deck.name.clone(),
            description: deck.description.clone(),
            color: deck.color.clone(),
            parent_id: deck.parent_id.clone(),
            depth,
            has_children,
            children_count,
            card_count,
            novos,
            aprender,
            revisar,
        });

        if let Some(child_indices) = children {
            for &child_idx in child_indices {
                traverse(child_idx, depth + 1, raw_decks, parent_to_children, stats_map, out);
            }
        }
    }

    for root_idx in root_indices {
        traverse(root_idx, 0, &raw_decks, &parent_to_children, &stats_map, &mut result);
    }

    Ok(result)
}

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
    fn collect(did: &str, map: &HashMap<String, Vec<String>>, out: &mut Vec<String>) {
        out.push(did.to_string());
        if let Some(children) = map.get(did) {
            for c in children {
                collect(c, map, out);
            }
        }
    }
    collect(deck_id, &children_map, &mut target_deck_ids);

    if target_deck_ids.is_empty() {
        return Ok(DeckStats { total: 0, novos: 0, aprender: 0, revisar: 0 });
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

    let params: Vec<&dyn rusqlite::ToSql> = target_deck_ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();
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
    let total_cards: i64 = conn
        .query_row(
            "SELECT count(*) FROM anki_cards WHERE deleted_at IS NULL",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

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
        .unwrap_or((0, 0, 0, 0, 0.0, 0.0));

    let (total_reviews, errei, dificil, bom, facil): (i64, i64, i64, i64, i64) = conn
        .query_row(
            "SELECT count(*), 
                    COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0), 
                    COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0), 
                    COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0), 
                    COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) 
             FROM anki_reviews",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .unwrap_or((0, 0, 0, 0, 0));

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

pub fn create_deck(
    conn: &rusqlite::Connection,
    name: &str,
    description: Option<&str>,
    color: Option<&str>,
    parent_id: Option<&str>,
) -> Result<String> {
    let trimmed_name = name.trim();
    if trimmed_name.is_empty() {
        return Err(SynapseError::Validation("Deck name cannot be empty".into()));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let desc = description.unwrap_or("").trim();
    let col = color.unwrap_or("#10b981").trim();
    let pid = parent_id.map(|s| s.trim()).filter(|s| !s.is_empty());

    conn.execute(
        "INSERT INTO anki_decks (id, name, description, color, parent_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![id, trimmed_name, desc, col, pid, now, now],
    )?;

    Ok(id)
}

pub fn update_deck(
    conn: &rusqlite::Connection,
    deck_id: &str,
    name: &str,
    description: Option<&str>,
    color: Option<&str>,
) -> Result<bool> {
    let trimmed_id = deck_id.trim();
    let trimmed_name = name.trim();
    if trimmed_id.is_empty() || trimmed_name.is_empty() {
        return Err(SynapseError::Validation("ID and name cannot be empty".into()));
    }

    let now = Utc::now().to_rfc3339();
    let desc = description.unwrap_or("").trim();
    let col = color.unwrap_or("#10b981").trim();

    let count = conn.execute(
        "UPDATE anki_decks SET name = ?, description = ?, color = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        params![trimmed_name, desc, col, now, trimmed_id],
    )?;

    Ok(count > 0)
}

pub fn delete_deck(conn: &rusqlite::Connection, deck_id: &str) -> Result<bool> {
    let trimmed_id = deck_id.trim();
    if trimmed_id.is_empty() {
        return Err(SynapseError::Validation("ID cannot be empty".into()));
    }

    let now = Utc::now().to_rfc3339();
    let count = conn.execute(
        "UPDATE anki_decks SET deleted_at = ? WHERE (id = ? OR parent_id = ?) AND deleted_at IS NULL",
        params![now, trimmed_id, trimmed_id],
    )?;

    Ok(count > 0)
}

pub fn reset_deck_progress(conn: &rusqlite::Connection, deck_id: &str) -> Result<bool> {
    let trimmed_id = deck_id.trim();
    if trimmed_id.is_empty() {
        return Err(SynapseError::Validation("ID cannot be empty".into()));
    }

    let now = Utc::now().to_rfc3339();
    let count = conn.execute(
        "UPDATE anki_srs_state SET reps = 0, lapses = 0, stability = 0.0, difficulty = 0.0, 
                state = 'new', due_date = ?, updated_at = ? 
         WHERE id IN (SELECT id FROM anki_cards WHERE deck_id = ?)",
        params![now, now, trimmed_id],
    )?;

    Ok(count > 0)
}
