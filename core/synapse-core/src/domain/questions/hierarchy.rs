//! Quiz battery hierarchy tree builder, cycle-safe parent mover, and descendant aggregators.

use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BatteryTreeSummary {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub direct_question_count: i64,
    pub direct_answered_count: i64,
    pub direct_correct_count: i64,
    pub total_descendant_questions_count: i64,
    pub total_descendant_answered_count: i64,
    pub total_descendant_correct_count: i64,
    pub aggregate_accuracy_rate: i64,
    pub children: Vec<BatteryTreeSummary>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AvailableParentOption {
    pub id: String,
    pub title: String,
    pub depth: usize,
}

#[derive(Clone)]
struct FlatBatteryRow {
    id: String,
    parent_id: Option<String>,
    title: String,
    description: Option<String>,
    sort_order: i32,
    question_count: i64,
    answered_count: i64,
    correct_count: i64,
}

fn load_flat_batteries(conn: &Connection) -> Result<Vec<FlatBatteryRow>> {
    let mut stmt = conn.prepare(
        "SELECT b.id, b.parent_id, b.title, b.description, COALESCE(b.sort_order, 0),
                (SELECT COUNT(*) FROM quiz_questions q WHERE q.battery_id = b.id AND q.deleted_at IS NULL),
                (SELECT COUNT(DISTINCT a.question_id) FROM quiz_attempts a
                 JOIN quiz_questions q ON q.id = a.question_id
                 WHERE q.battery_id = b.id AND q.deleted_at IS NULL AND a.deleted_at IS NULL),
                (SELECT COUNT(DISTINCT a.question_id) FROM quiz_attempts a
                 JOIN quiz_questions q ON q.id = a.question_id
                 WHERE q.battery_id = b.id AND q.deleted_at IS NULL AND a.deleted_at IS NULL
                   AND a.id = (SELECT a2.id FROM quiz_attempts a2 WHERE a2.question_id = q.id AND a2.deleted_at IS NULL ORDER BY a2.created_at DESC LIMIT 1)
                   AND a.is_correct = 1)
         FROM quiz_batteries b
         WHERE b.deleted_at IS NULL
         ORDER BY COALESCE(b.sort_order, 0) ASC, b.created_at DESC",
    )?;
    let iter = stmt.query_map([], |row| {
        Ok(FlatBatteryRow {
            id: row.get(0)?,
            parent_id: row.get::<_, Option<String>>(1)?.filter(|s| !s.trim().is_empty()),
            title: row.get(2)?,
            description: row.get(3)?,
            sort_order: row.get(4)?,
            question_count: row.get(5)?,
            answered_count: row.get(6)?,
            correct_count: row.get(7)?,
        })
    })?;
    let mut out = Vec::new();
    for r in iter {
        out.push(r?);
    }
    Ok(out)
}

fn build_children_recursive(
    parent_id: Option<&str>,
    by_parent: &HashMap<Option<String>, Vec<FlatBatteryRow>>,
    visited: &mut HashSet<String>,
) -> Vec<BatteryTreeSummary> {
    let key = parent_id.map(ToOwned::to_owned);
    let Some(rows) = by_parent.get(&key) else {
        return Vec::new();
    };
    let mut nodes = Vec::new();
    for r in rows {
        if !visited.insert(r.id.clone()) {
            continue;
        }
        let children = build_children_recursive(Some(&r.id), by_parent, visited);
        let mut total_q = r.question_count;
        let mut total_ans = r.answered_count;
        let mut total_ok = r.correct_count;
        for c in &children {
            total_q += c.total_descendant_questions_count;
            total_ans += c.total_descendant_answered_count;
            total_ok += c.total_descendant_correct_count;
        }
        let acc = if total_ans > 0 {
            ((total_ok as f64 / total_ans as f64) * 100.0).round() as i64
        } else {
            0
        };
        nodes.push(BatteryTreeSummary {
            id: r.id.clone(),
            parent_id: r.parent_id.clone(),
            title: r.title.clone(),
            description: r.description.clone(),
            sort_order: r.sort_order,
            direct_question_count: r.question_count,
            direct_answered_count: r.answered_count,
            direct_correct_count: r.correct_count,
            total_descendant_questions_count: total_q,
            total_descendant_answered_count: total_ans,
            total_descendant_correct_count: total_ok,
            aggregate_accuracy_rate: acc,
            children,
        });
    }
    nodes
}

/// Builds the full recursive quiz battery hierarchy with bottom-up rollups.
pub fn build_battery_tree(conn: &Connection) -> Result<Vec<BatteryTreeSummary>> {
    let flat = load_flat_batteries(conn)?;
    let existing_ids: HashSet<String> = flat.iter().map(|b| b.id.clone()).collect();
    let mut by_parent: HashMap<Option<String>, Vec<FlatBatteryRow>> = HashMap::new();
    for mut row in flat {
        if let Some(ref pid) = row.parent_id {
            if !existing_ids.contains(pid) {
                row.parent_id = None;
            }
        }
        by_parent.entry(row.parent_id.clone()).or_default().push(row);
    }
    let mut visited = HashSet::new();
    Ok(build_children_recursive(None, &by_parent, &mut visited))
}

/// Lists valid non-cyclical target parent batteries for moving a battery.
pub fn get_available_parent_options(
    conn: &Connection,
    moving_battery_id: Option<&str>,
) -> Result<Vec<AvailableParentOption>> {
    let tree = build_battery_tree(conn)?;
    let mut out = Vec::new();
    fn walk(
        nodes: &[BatteryTreeSummary],
        depth: usize,
        skip_id: Option<&str>,
        out: &mut Vec<AvailableParentOption>,
    ) {
        for n in nodes {
            if skip_id == Some(n.id.as_str()) {
                continue;
            }
            out.push(AvailableParentOption {
                id: n.id.clone(),
                title: n.title.clone(),
                depth,
            });
            walk(&n.children, depth + 1, skip_id, out);
        }
    }
    walk(&tree, 0, moving_battery_id, &mut out);
    Ok(out)
}

/// Moves a battery under `new_parent_id` (or root if None), rejecting self/descendant cycles.
pub fn move_quiz_battery(
    conn: &Connection,
    battery_id: &str,
    new_parent_id: Option<&str>,
) -> Result<bool> {
    let bid = battery_id.trim();
    if bid.is_empty() {
        return Err(SynapseError::Validation("Battery ID cannot be empty".into()));
    }
    let target = new_parent_id.map(str::trim).filter(|s| !s.is_empty());
    if target == Some(bid) {
        return Err(SynapseError::Validation("Cannot move battery inside itself".into()));
    }
    if let Some(pid) = target {
        let valid = get_available_parent_options(conn, Some(bid))?;
        if !valid.iter().any(|o| o.id == pid) {
            return Err(SynapseError::Validation(
                "Target parent would create a cycle or does not exist".into(),
            ));
        }
    }
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE quiz_batteries SET parent_id = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![target, now, bid],
    )?;
    Ok(rows > 0)
}

/// Creates a sub-battery linked to an optional `parent_id`.
pub fn create_child_quiz_battery(
    conn: &Connection,
    parent_id: Option<&str>,
    title: &str,
    description: Option<&str>,
) -> Result<String> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(SynapseError::Validation("Battery title cannot be empty".into()));
    }
    let pid = parent_id.map(str::trim).filter(|s| !s.is_empty());
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let desc = description.unwrap_or("").trim();
    conn.execute(
        "INSERT INTO quiz_batteries (id, parent_id, title, description, layout, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'sequential', 0, ?5, ?5)",
        params![id, pid, trimmed, desc, now],
    )?;
    Ok(id)
}
