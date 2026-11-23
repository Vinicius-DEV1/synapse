//! TipTap HTML <-> Typed Block AST parser and lossless serializer.
//! Keeps rich-text runs and interactive widget blocks separated cleanly so
//! native clients (Qt QML / Kotlin Compose) can mount real widget components inline.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NoteBlock {
    pub id: String,
    pub block_type: String,
    pub attrs: BTreeMap<String, String>,
    pub html: String,
    pub inner_html: String,
}

fn attr_value(tag_open: &str, name: &str) -> Option<String> {
    for quote in ['"', '\''] {
        let needle = format!("{}={}", name, quote);
        if let Some(pos) = tag_open.find(&needle) {
            let after = &tag_open[pos + needle.len()..];
            if let Some(end) = after.find(quote) {
                return Some(html_unescape(&after[..end]));
            }
        }
    }
    None
}

fn parse_all_data_attrs(tag_open: &str) -> BTreeMap<String, String> {
    let mut map = BTreeMap::new();
    let bytes = tag_open.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        while i < bytes.len() && (bytes[i].is_ascii_whitespace() || bytes[i] == b'<') {
            i += 1;
        }
        let name_start = i;
        while i < bytes.len()
            && !bytes[i].is_ascii_whitespace()
            && bytes[i] != b'='
            && bytes[i] != b'>'
            && bytes[i] != b'/'
        {
            i += 1;
        }
        let name = &tag_open[name_start..i];
        while i < bytes.len() && bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        if i < bytes.len() && bytes[i] == b'=' {
            i += 1;
            while i < bytes.len() && bytes[i].is_ascii_whitespace() {
                i += 1;
            }
            if i < bytes.len() && (bytes[i] == b'"' || bytes[i] == b'\'') {
                let q = bytes[i];
                i += 1;
                let val_start = i;
                while i < bytes.len() && bytes[i] != q {
                    i += 1;
                }
                let val = html_unescape(&tag_open[val_start..i]);
                if !name.is_empty() {
                    map.insert(name.to_string(), val);
                }
                if i < bytes.len() {
                    i += 1;
                }
            }
        } else if !name.is_empty() && name != "div" && name != "blockquote" && name != "pre" && name != "table" && name != "hr" {
            // Skip tag name or boolean attribute
            if i < bytes.len() {
                i += 1;
            }
        } else if i < bytes.len() {
            i += 1;
        }
    }
    map
}

fn html_unescape(s: &str) -> String {
    s.replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
}

fn html_escape_attr(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn find_matching_close(html: &str, open_end: usize, tag_name: &str) -> usize {
    let lower = html.to_ascii_lowercase();
    let open_pat = format!("<{}", tag_name);
    let close_pat = format!("</{}>", tag_name);
    let mut depth = 1usize;
    let mut pos = open_end;

    while pos < lower.len() {
        let next_open = lower[pos..].find(&open_pat).map(|o| pos + o);
        let next_close = lower[pos..].find(&close_pat).map(|c| pos + c);
        match (next_open, next_close) {
            (Some(o), Some(c)) if o < c => {
                // Ensure `<div` is followed by whitespace or `>` so `<divx` does not match.
                let after = lower.as_bytes().get(o + open_pat.len()).copied();
                if matches!(after, Some(b' ' | b'>' | b'/' | b'\n' | b'\t')) {
                    depth += 1;
                }
                pos = o + open_pat.len();
            }
            (_, Some(c)) => {
                depth -= 1;
                if depth == 0 {
                    return c + close_pat.len();
                }
                pos = c + close_pat.len();
            }
            _ => return html.len(),
        }
    }
    html.len()
}

fn detect_block_type(tag_name: &str, tag_open: &str) -> Option<&'static str> {
    if let Some(dt) = attr_value(tag_open, "data-type") {
        return match dt.as_str() {
            "question-block" | "questionBlock" => Some("questionBlock"),
            "habit-widget" | "habitWidget" => Some("habitWidget"),
            "focus-widget" | "focusWidget" => Some("focusWidget"),
            "alarm-widget" | "alarmWidget" => Some("alarmWidget"),
            "calendar-event-widget" | "calendarEventWidget" => Some("calendarEventWidget"),
            "file-widget" | "fileWidget" => Some("fileWidget"),
            "document-bundle" | "documentBundle" => Some("documentBundle"),
            "media-widget" | "mediaWidget" => Some("mediaWidget"),
            "scrap-widget" | "scrapWidget" => Some("scrapWidget"),
            "link-preview" | "linkPreview" => Some("linkPreview"),
            "link-group" | "linkGroup" => Some("linkGroup"),
            "toggle-block" | "toggleBlock" => Some("toggleBlock"),
            "blockquote-toggle" | "blockquoteToggle" => Some("blockquoteToggle"),
            "columnGroup" | "column-group" => Some("columnGroup"),
            "collectionBlock" | "collection-block" => Some("collectionBlock"),
            _ => None,
        };
    }
    match tag_name {
        "blockquote" if attr_value(tag_open, "data-color").is_some() => Some("colorBlockquote"),
        "pre" => Some("codeBlock"),
        "table" => Some("tableBlock"),
        _ => None,
    }
}

/// Parses TipTap HTML into an ordered sequence of rich-text and live widget blocks.
pub fn parse_note_blocks(html: &str) -> Vec<NoteBlock> {
    let mut blocks = Vec::new();
    let mut rich_buf = String::new();
    let mut pos = 0usize;
    let mut idx = 0usize;

    let flush_rich = |buf: &mut String, out: &mut Vec<NoteBlock>, counter: &mut usize| {
        if !buf.trim().is_empty() {
            out.push(NoteBlock {
                id: format!("blk_{}", *counter),
                block_type: "richText".to_string(),
                attrs: BTreeMap::new(),
                html: buf.clone(),
                inner_html: buf.clone(),
            });
            *counter += 1;
        }
        buf.clear();
    };

    while pos < html.len() {
        let Some(rel_lt) = html[pos..].find('<') else {
            rich_buf.push_str(&html[pos..]);
            break;
        };
        let lt = pos + rel_lt;
        rich_buf.push_str(&html[pos..lt]);

        let Some(rel_gt) = html[lt..].find('>') else {
            rich_buf.push_str(&html[lt..]);
            break;
        };
        let gt = lt + rel_gt + 1;
        let tag_open = &html[lt..gt];

        let tag_name = tag_open[1..tag_open.len().saturating_sub(1)]
            .split(|c: char| c.is_whitespace() || c == '/')
            .next()
            .unwrap_or("")
            .to_ascii_lowercase();

        if let Some(block_type) = detect_block_type(&tag_name, tag_open) {
            flush_rich(&mut rich_buf, &mut blocks, &mut idx);
            let close_end = find_matching_close(html, gt, &tag_name);
            let full_html = html[lt..close_end].to_string();
            let close_tag = format!("</{}>", tag_name);
            let inner_end = full_html
                .to_ascii_lowercase()
                .rfind(&close_tag)
                .unwrap_or(full_html.len());
            let inner_start = tag_open.len().min(inner_end);
            blocks.push(NoteBlock {
                id: format!("blk_{}", idx),
                block_type: block_type.to_string(),
                attrs: parse_all_data_attrs(tag_open),
                inner_html: full_html[inner_start..inner_end].to_string(),
                html: full_html,
            });
            idx += 1;
            pos = close_end;
        } else {
            rich_buf.push_str(tag_open);
            pos = gt;
        }
    }

    flush_rich(&mut rich_buf, &mut blocks, &mut idx);
    if blocks.is_empty() {
        blocks.push(NoteBlock {
            id: "blk_0".to_string(),
            block_type: "richText".to_string(),
            attrs: BTreeMap::new(),
            html: "<p></p>".to_string(),
            inner_html: String::new(),
        });
    }
    blocks
}

/// Serializes edited blocks back to canonical TipTap HTML preserving all data-* attrs.
pub fn serialize_note_blocks(blocks: &[NoteBlock]) -> String {
    let mut out = String::new();
    for block in blocks {
        if block.block_type == "richText" {
            if !block.html.trim().is_empty() {
                out.push_str(&block.html);
            }
            continue;
        }
        let tag = match block.block_type.as_str() {
            "colorBlockquote" => "blockquote",
            "codeBlock" => "pre",
            "tableBlock" => "table",
            _ => "div",
        };
        if block.attrs.is_empty() && !block.html.trim().is_empty() {
            out.push_str(&block.html);
            continue;
        }
        out.push('<');
        out.push_str(tag);
        for (k, v) in &block.attrs {
            out.push(' ');
            out.push_str(k);
            out.push_str("=\"");
            out.push_str(&html_escape_attr(v));
            out.push('"');
        }
        out.push('>');
        out.push_str(&block.inner_html);
        out.push_str("</");
        out.push_str(tag);
        out.push('>');
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrips_mixed_rich_and_widget_blocks() {
        let html = "<p>Intro</p><div data-type=\"question-block\" data-battery-id=\"bat-1\" data-cached-title=\"Rust Quiz\"></div><p>Outro</p>";
        let blocks = parse_note_blocks(html);
        assert_eq!(blocks.len(), 3);
        assert_eq!(blocks[0].block_type, "richText");
        assert_eq!(blocks[1].block_type, "questionBlock");
        assert_eq!(blocks[1].attrs.get("data-battery-id").map(String::as_str), Some("bat-1"));
        assert_eq!(blocks[2].block_type, "richText");
        let serialized = serialize_note_blocks(&blocks);
        assert!(serialized.contains("data-battery-id=\"bat-1\""));
        assert!(serialized.contains("<p>Intro</p>"));
        assert!(serialized.contains("<p>Outro</p>"));
    }
}
