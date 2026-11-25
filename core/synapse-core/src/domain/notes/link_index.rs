//! Canonical URL normalization, LinkEntity defaults, and cross-note duplicate URL indexing.

use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use crate::error::Result;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateLinkMatch {
    pub page_id: String,
    pub page_title: String,
    pub page_icon: String,
    pub count: usize,
}

const TRACKING_PARAMS: &[&str] = &[
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "utm_reader",
    "gclid",
    "dclid",
    "_ga",
    "_gl",
    "fbclid",
    "igshid",
    "msclkid",
    "mc_eid",
    "mc_cid",
    "yclid",
    "si",
    "ref",
    "ref_src",
    "source",
    "feature",
    "spm",
    "from",
    "ab_channel",
    "t",
    "time_continue",
];

fn is_valid_id_token(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 128
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}

fn is_host_or_sub(host: &str, domain: &str) -> bool {
    host == domain || host.ends_with(&format!(".{}", domain))
}

/// Canonicalizes HTTP(S) URLs for consistent LinkPreview vault entities across React Web & Native clients.
pub fn canonical_link_url(raw: &str) -> Option<String> {
    if raw.is_empty() || raw.len() > 4096 || raw != raw.trim() {
        return None;
    }
    let lower_scheme = raw.get(..8).unwrap_or(raw).to_ascii_lowercase();
    let (scheme, after_scheme) = if lower_scheme.starts_with("https://") {
        ("https", &raw[8..])
    } else if lower_scheme.starts_with("http://") {
        ("http", &raw[7..])
    } else {
        return None;
    };
    let _ = scheme;

    let (before_frag, frag) = match after_scheme.find('#') {
        Some(idx) => (&after_scheme[..idx], Some(&after_scheme[idx + 1..])),
        None => (after_scheme, None),
    };
    let (authority_path, query_str) = match before_frag.find('?') {
        Some(idx) => (&before_frag[..idx], Some(&before_frag[idx + 1..])),
        None => (before_frag, None),
    };
    let (raw_host, raw_path) = match authority_path.find('/') {
        Some(idx) => (&authority_path[..idx], &authority_path[idx..]),
        None => (authority_path, ""),
    };
    let host = raw_host
        .split('@')
        .next_back()?
        .split(':')
        .next()?
        .to_ascii_lowercase();
    if host.is_empty() || host.bytes().any(|b| b.is_ascii_whitespace()) {
        return None;
    }

    let mut query_map: BTreeMap<String, Vec<String>> = BTreeMap::new();
    if let Some(qs) = query_str {
        for pair in qs.split('&').filter(|s| !s.is_empty()) {
            let (k, v) = pair.split_once('=').unwrap_or((pair, ""));
            if !TRACKING_PARAMS.contains(&k.to_ascii_lowercase().as_str()) {
                query_map
                    .entry(k.to_string())
                    .or_default()
                    .push(v.to_string());
            }
        }
    }

    if host == "youtu.be" {
        let vid = raw_path
            .trim_start_matches('/')
            .split('/')
            .next()
            .unwrap_or("");
        if is_valid_id_token(vid) {
            return Some(format!("https://www.youtube.com/watch?v={}", vid));
        }
    } else if is_host_or_sub(&host, "youtube.com") {
        if let Some(vid) = query_map.get("v").and_then(|v| v.first()) {
            if is_valid_id_token(vid) {
                return Some(format!("https://www.youtube.com/watch?v={}", vid));
            }
        }
        let mut parts = raw_path.trim_start_matches('/').split('/');
        if let (Some(kind), Some(id)) = (parts.next(), parts.next()) {
            if matches!(
                kind.to_ascii_lowercase().as_str(),
                "embed" | "shorts" | "v" | "live"
            ) && is_valid_id_token(id)
            {
                return Some(format!("https://www.youtube.com/watch?v={}", id));
            }
        }
    }

    if (host == "youtu.be" || is_host_or_sub(&host, "youtube.com"))
        && query_map
            .get("list")
            .and_then(|v| v.first())
            .map(|id| is_valid_id_token(id))
            .unwrap_or(false)
    {
        if let Some(pid) = query_map.get("list").and_then(|v| v.first()) {
            return Some(format!("https://www.youtube.com/playlist?list={}", pid));
        }
    }

    let canonical_host = host.strip_prefix("www.").unwrap_or(&host).to_string();
    if is_host_or_sub(&host, "vimeo.com") {
        if let Some(last) = raw_path
            .trim_matches('/')
            .split('/')
            .find(|seg| !seg.is_empty() && seg.bytes().all(|b| b.is_ascii_digit()))
        {
            return Some(format!("https://vimeo.com/{}", last));
        }
    }

    let mut path = raw_path.to_string();
    while path.contains("//") {
        path = path.replace("//", "/");
    }
    if path == "/" {
        path.clear();
    } else if path.len() > 1 && path.ends_with('/') {
        path.pop();
    }

    let mut out = format!("https://{}{}", canonical_host, path);
    if !query_map.is_empty() {
        out.push('?');
        let mut first = true;
        for (k, vals) in query_map {
            for v in vals {
                if !first {
                    out.push('&');
                }
                first = false;
                out.push_str(&k);
                if !v.is_empty() {
                    out.push('=');
                    out.push_str(&v);
                }
            }
        }
    }
    if let Some(f) = frag.filter(|s| s.starts_with('/')) {
        out.push('#');
        out.push_str(f);
    }
    Some(out)
}

/// Builds the default LinkEntity JSON payload synced between React & Desktop Qt.
pub fn build_default_link_entity_json(
    canonical_url: &str,
    original_url: &str,
) -> serde_json::Value {
    let domain = canonical_url
        .split("://")
        .nth(1)
        .unwrap_or("")
        .split('/')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    let now = Utc::now().to_rfc3339();
    serde_json::json!({
        "canonicalUrl": canonical_url,
        "originalUrl": original_url,
        "title": null,
        "channel": null,
        "domain": domain,
        "notes": "",
        "color": "default",
        "watched": false,
        "watching": false,
        "scrapId": null,
        "scrapStatus": null,
        "scrapLocalPath": null,
        "scrapDriveFileId": null,
        "scrapFileSize": null,
        "scrapCreatedAt": null,
        "aiSummary": null,
        "aiSummaryCreatedAt": null,
        "aiSummaryModel": null,
        "firstSeenAt": now,
        "lastReferencedAt": now,
        "orphanedAt": null
    })
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
        let icon: String = row
            .get::<_, Option<String>>(2)?
            .unwrap_or_else(|| "📄".to_string());
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonicalizes_youtube_vimeo_and_strips_tracking_params() {
        assert_eq!(
            canonical_link_url("https://youtu.be/dQw4w9WgXcQ?si=123").as_deref(),
            Some("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        );
        assert_eq!(
            canonical_link_url("http://www.example.com/docs/?utm_source=x&b=2&a=1").as_deref(),
            Some("https://example.com/docs?a=1&b=2")
        );
    }
}
