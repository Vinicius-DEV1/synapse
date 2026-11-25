use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};

use super::history;
use super::models::PageRecord;
use crate::error::{Result, SynapseError};

const PLAIN_TEXT_MARKER: &str = "<!--synapse-plain-text:v1-->";

pub fn is_plain_text_page_editable(page: &PageRecord) -> bool {
    page.is_locked == 0
        && page.encrypted_content.is_none()
        && page.crdt_state.is_none()
        && extract_plain_text(&page.content).is_some()
}

pub fn extract_plain_text(content: &str) -> Option<String> {
    let Some(marked_content) = content.strip_prefix(PLAIN_TEXT_MARKER) else {
        return (!content.contains('<')).then(|| content.to_owned());
    };
    if marked_content.is_empty() {
        return Some(String::new());
    }

    let mut paragraphs = Vec::new();
    for paragraph in marked_content.split("</p>") {
        if paragraph.is_empty() {
            continue;
        }
        let inner = paragraph.strip_prefix("<p>")?;
        if inner.contains('<') || inner.contains('>') {
            return None;
        }
        paragraphs.push(decode_html_entities(inner)?);
    }
    Some(paragraphs.join("\n"))
}

pub fn save_plain_text_page(
    conn: &mut Connection,
    page_id: &str,
    title: &str,
    content: &str,
    icon: &str,
) -> Result<bool> {
    let page_id = page_id.trim();
    let title = title.trim();
    if page_id.is_empty() || title.is_empty() {
        return Err(SynapseError::Validation(
            "Page ID and title cannot be empty".into(),
        ));
    }

    let tx = conn.transaction()?;
    let previous = tx
        .query_row(
            "SELECT content, encrypted_content, crdt_state, is_locked FROM pages \
             WHERE id = ?1 AND deleted_at IS NULL",
            params![page_id],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?.unwrap_or_default(),
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<i32>>(3)?.unwrap_or(0),
                ))
            },
        )
        .optional()?;
    let Some((previous_content, encrypted_content, crdt_state, is_locked)) = previous else {
        tx.commit()?;
        return Ok(false);
    };

    if is_locked != 0 || encrypted_content.is_some() || crdt_state.is_some() {
        return Err(SynapseError::Validation(
            "Protected or collaborative pages cannot be edited as plain text on Android".into(),
        ));
    }
    if extract_plain_text(&previous_content).is_none() {
        return Err(SynapseError::Validation(
            "This page uses rich content that the Android text editor cannot preserve".into(),
        ));
    }

    let saved_content = encode_plain_text(content);
    if !previous_content.is_empty() && previous_content != saved_content {
        history::record_page_history(&tx, page_id, &previous_content, None)?;
    }
    let now = Utc::now().to_rfc3339();
    let updated = tx.execute(
        "UPDATE pages SET title = ?1, content = ?2, icon = ?3, updated_at = ?4 \
         WHERE id = ?5 AND deleted_at IS NULL AND is_locked = 0 \
         AND encrypted_content IS NULL AND crdt_state IS NULL",
        params![title, saved_content, icon, now, page_id],
    )?;
    tx.commit()?;
    Ok(updated > 0)
}

fn encode_plain_text(content: &str) -> String {
    let paragraphs = content
        .split('\n')
        .map(|line| format!("<p>{}</p>", escape_html(line)))
        .collect::<String>();
    format!("{PLAIN_TEXT_MARKER}{paragraphs}")
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn decode_html_entities(value: &str) -> Option<String> {
    Some(super::block_ast::helpers::html_unescape(value))
}
