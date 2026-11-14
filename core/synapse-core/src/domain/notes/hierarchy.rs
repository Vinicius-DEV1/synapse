//! Hierarchical page navigation tree, cycle-safe move operations, and sibling reordering.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::{HashMap, HashSet};

use super::models::PageNode;
use crate::error::Result;

/// Constructs a depth-first flattened tree of pages with depth and children counts.
pub fn get_page_tree(conn: &Connection, filter: Option<&str>) -> Result<Vec<PageNode>> {
    let mut sql = String::from(
        "SELECT id, parent_id, title, icon, sort_order, is_pinned, pinned_order, updated_at \
         FROM pages WHERE deleted_at IS NULL ",
    );

    let mut param_values = Vec::new();
    if let Some(f) = filter {
        let trimmed = f.trim();
        if !trimmed.is_empty() {
            sql.push_str("AND title LIKE ?1 ");
            param_values.push(format!("%{}%", trimmed));
        }
    }

    sql.push_str("ORDER BY sort_order ASC, updated_at DESC");

    let mut stmt = conn.prepare(&sql)?;
    let mut rows = if param_values.is_empty() {
        stmt.query([])?
    } else {
        stmt.query(rusqlite::params_from_iter(param_values.iter()))?
    };

    struct RawPage {
        id: String,
        parent_id: Option<String>,
        title: String,
        icon: String,
        sort_order: i32,
        is_pinned: i32,
        pinned_order: f64,
        updated_at: Option<String>,
    }

    let mut all_pages = Vec::new();
    let mut all_ids = HashSet::new();

    while let Some(row) = rows.next()? {
        let p = RawPage {
            id: row.get(0)?,
            parent_id: row.get(1)?,
            title: row.get(2)?,
            icon: row.get(3)?,
            sort_order: row.get(4)?,
            is_pinned: row.get::<_, Option<i32>>(5)?.unwrap_or(0),
            pinned_order: row.get::<_, Option<f64>>(6)?.unwrap_or(0.0),
            updated_at: row.get(7)?,
        };
        all_ids.insert(p.id.clone());
        all_pages.push(p);
    }

    let mut parent_to_children: HashMap<String, Vec<usize>> = HashMap::new();
    let mut root_indices: Vec<usize> = Vec::new();

    for (idx, p) in all_pages.iter().enumerate() {
        match &p.parent_id {
            Some(pid) if all_ids.contains(pid) => {
                parent_to_children.entry(pid.clone()).or_default().push(idx);
            }
            _ => {
                root_indices.push(idx);
            }
        }
    }

    let mut result = Vec::new();

    fn traverse(
        idx: usize,
        depth: i32,
        all_pages: &[RawPage],
        parent_to_children: &HashMap<String, Vec<usize>>,
        result: &mut Vec<PageNode>,
    ) {
        let page = &all_pages[idx];
        let children = parent_to_children.get(&page.id);
        let children_count = children.map(|c| c.len()).unwrap_or(0);
        let has_children = children_count > 0;

        result.push(PageNode {
            id: page.id.clone(),
            parent_id: page.parent_id.clone(),
            title: page.title.clone(),
            icon: page.icon.clone(),
            sort_order: page.sort_order,
            is_pinned: page.is_pinned,
            pinned_order: page.pinned_order,
            updated_at: page.updated_at.clone(),
            depth,
            has_children,
            children_count,
        });

        if let Some(child_indices) = children {
            for &child_idx in child_indices {
                traverse(child_idx, depth + 1, all_pages, parent_to_children, result);
            }
        }
    }

    for root_idx in root_indices {
        traverse(root_idx, 0, &all_pages, &parent_to_children, &mut result);
    }

    Ok(result)
}

/// Moves a page to a new parent with strict cycle detection.
pub fn move_page(conn: &Connection, page_id: &str, new_parent_id: Option<&str>) -> Result<bool> {
    let norm_id = page_id.trim();
    if norm_id.is_empty() {
        return Ok(false);
    }

    let norm_parent = new_parent_id.map(|s| s.trim()).filter(|s| !s.is_empty());

    if let Some(parent) = norm_parent {
        if parent == norm_id {
            return Ok(false); // cannot be parent of itself
        }
    }

    let page_exists: Option<String> = conn
        .query_row(
            "SELECT id FROM pages WHERE id = ?1 AND deleted_at IS NULL",
            params![norm_id],
            |r| r.get(0),
        )
        .optional()?;
    if page_exists.is_none() {
        return Ok(false);
    }

    if let Some(parent) = norm_parent {
        // Verify parent exists and is not deleted
        let parent_exists: Option<String> = conn
            .query_row(
                "SELECT id FROM pages WHERE id = ?1 AND deleted_at IS NULL",
                params![parent],
                |r| r.get(0),
            )
            .optional()?;
        if parent_exists.is_none() {
            return Ok(false);
        }

        // Cycle detection: check if new_parent is a descendant of page_id
        let is_descendant: Option<String> = conn
            .query_row(
                "WITH RECURSIVE descendants(id) AS (\
                     SELECT id FROM pages WHERE id = ?1 AND deleted_at IS NULL \
                     UNION \
                     SELECT child.id FROM pages AS child \
                     JOIN descendants AS parent ON child.parent_id = parent.id \
                     WHERE child.deleted_at IS NULL\
                 ) SELECT id FROM descendants WHERE id = ?2",
                params![norm_id, parent],
                |r| r.get(0),
            )
            .optional()?;

        if is_descendant.is_some() {
            return Ok(false);
        }
    }

    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE pages SET parent_id = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![norm_parent, now, norm_id],
    )?;
    Ok(rows > 0)
}

/// Reorders sibling pages under a parent.
pub fn reorder_pages(
    conn: &Connection,
    parent_id: Option<&str>,
    page_ids: &[String],
) -> Result<bool> {
    let norm_parent = parent_id.map(|s| s.trim()).filter(|s| !s.is_empty());

    if let Some(parent) = norm_parent {
        let parent_exists: Option<String> = conn
            .query_row(
                "SELECT id FROM pages WHERE id = ?1 AND deleted_at IS NULL",
                params![parent],
                |r| r.get(0),
            )
            .optional()?;
        if parent_exists.is_none() {
            return Ok(false);
        }
    }

    let mut stmt = if norm_parent.is_some() {
        conn.prepare("SELECT id FROM pages WHERE parent_id = ?1 AND deleted_at IS NULL")?
    } else {
        conn.prepare("SELECT id FROM pages WHERE parent_id IS NULL AND deleted_at IS NULL")?
    };

    let mut sibling_rows = if let Some(parent) = norm_parent {
        stmt.query(params![parent])?
    } else {
        stmt.query([])?
    };

    let mut sibling_ids = HashSet::new();
    while let Some(r) = sibling_rows.next()? {
        let id: String = r.get(0)?;
        sibling_ids.insert(id);
    }

    if page_ids.len() != sibling_ids.len() {
        return Ok(false);
    }

    let mut seen = HashSet::new();
    for pid in page_ids {
        let trimmed = pid.trim();
        if trimmed.is_empty() || !sibling_ids.contains(trimmed) || !seen.insert(trimmed) {
            return Ok(false);
        }
    }

    let now = Utc::now().to_rfc3339();
    for (sort_order, pid) in page_ids.iter().enumerate() {
        if let Some(parent) = norm_parent {
            conn.execute(
                "UPDATE pages SET sort_order = ?1, updated_at = ?2 WHERE id = ?3 AND parent_id = ?4 AND deleted_at IS NULL",
                params![sort_order as i32, now, pid, parent],
            )?;
        } else {
            conn.execute(
                "UPDATE pages SET sort_order = ?1, updated_at = ?2 WHERE id = ?3 AND parent_id IS NULL AND deleted_at IS NULL",
                params![sort_order as i32, now, pid],
            )?;
        }
    }
    Ok(true)
}
