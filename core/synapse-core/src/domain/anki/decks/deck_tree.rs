use super::super::models::{Deck, HierarchicalDeck};
use crate::error::Result;
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
                traverse(
                    child_idx,
                    depth + 1,
                    raw_decks,
                    parent_to_children,
                    stats_map,
                    out,
                );
            }
        }
    }

    for root_idx in root_indices {
        traverse(
            root_idx,
            0,
            &raw_decks,
            &parent_to_children,
            &stats_map,
            &mut result,
        );
    }

    Ok(result)
}
