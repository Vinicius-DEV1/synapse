//! Cross-note duplicate URL indexing and lookup for LinkPreview cards.

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::error::Result;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateLinkMatch {
    pub page_id: String,
    pub page_title: String,
    pub page_icon: String,
    pub count: usize,
}

/// Normalizes a URL for duplicate comparison across notes.
pub fn normalize_link_url(raw: &str) -> String {
    let trimmed = raw.trim();
    let without_proto = trimmed
        .strip_prefix("https://")
        .or_else(|| trimmed.strip_prefix("http://"))
        .unwrap_or(trimmed);
    let without_www = without_proto.strip_prefix("www.").unwrap_or(without_proto);
    without_www.trim_end_matches('/').to_string()
}

/// Finds all active pages referencing the given URL (optionally excluding `exclude_page_id`).
pub fn find_duplicate_links(
    conn: &Connection,
    url: &str,
    exclude_page_id: Option<&str>,
) -> Result<Vec<DuplicateLinkMatch>> {
    let needle = normalize_link_url(url);
    if needle.is_empty() {
        return Ok(Vec::new());
    }

    let mut stmt = conn.prepare(
        "SELECT id, title, icon, COALESCE(content, '') FROM pages WHERE deleted_at IS NULL",
    )?;
    let mut rows = stmt.query([])?;
    let mut matches = Vec::new();

    while let Some(row) = rows.next()? {
        let page_id: String = row.get(0)?;
        if exclude_page_id == Some(page_id.as_str()) {
            continue;
        }
        let title: String = row.get(1)?;
        let icon: String = row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "📄".to_string());
        let content: String = row.get(3)?;
        let count = content.matches(&needle).count();
        if count > 0 {
            matches.push(DuplicateLinkMatch {
                page_id,
                page_title: title,
                page_icon: icon,
                count,
            });
        }
    }

    Ok(matches)
}
