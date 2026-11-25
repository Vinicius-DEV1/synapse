//! TipTap HTML <-> Typed Block AST parser and lossless serializer.
//! Keeps rich-text runs and interactive widget blocks separated cleanly so
//! native clients (Qt QML / Kotlin Compose) can mount real widget components inline.

use super::html_normalizer::normalize_tiptap_rich_html;
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
    // Skip leading `<tagName` before parsing attributes so a tag name without `=`
    // never consumes the first character of the first attribute.
    while i < bytes.len() && (bytes[i].is_ascii_whitespace() || bytes[i] == b'<') {
        i += 1;
    }
    while i < bytes.len()
        && !bytes[i].is_ascii_whitespace()
        && bytes[i] != b'>'
        && bytes[i] != b'/'
    {
        i += 1;
    }
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
                let after = lower.as_bytes().get(o + open_pat.len()).copied();
                if matches!(after, Some(b' ' | b'>' | b'/' | b'\n' | b'\t')) {
                    let close_angle = lower[o..].find('>').map(|g| o + g).unwrap_or(lower.len());
                    let is_self_closing = lower[o..close_angle].trim_end().ends_with('/');
                    if !is_self_closing {
                        depth += 1;
                    }
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

fn has_class_token(cls: &str, token: &str) -> bool {
    cls.split_whitespace().any(|t| t == token)
}

fn detect_block_type(tag_name: &str, tag_open: &str, rest_html: &str) -> Option<&'static str> {
    if tag_name == "encrypted-image" {
        return Some("encryptedImage");
    }
    if tag_name == "img" {
        if let Some(src) = attr_value(tag_open, "src") {
            let is_supported_inline_data =
                src.starts_with("data:image/") && src.len() <= 2_700_000;
            if !is_supported_inline_data {
                return Some("imageBlock");
            }
        }
    }
    if tag_name == "pre" {
        let probe_end = rest_html.len().min(160);
        let prefix = rest_html[..probe_end].to_ascii_lowercase();
        if prefix.contains("language-mermaid") {
            return Some("mermaidBlock");
        }
    }
    if let Some(dt) = attr_value(tag_open, "data-type") {
        let matched = match dt.as_str() {
            "question-block" | "questionBlock" => Some("questionBlock"),
            "habit-widget" | "habitWidget" => Some("habitWidget"),
            "focus-widget" | "focusWidget" => Some("focusWidget"),
            "alarm-widget" | "alarmWidget" => Some("alarmWidget"),
            "calendar-event-widget" | "calendarEventWidget" => Some("calendarEventWidget"),
            "file-widget" | "fileWidget" => Some("fileWidget"),
            "document-bundle" | "documentBundle" => Some("documentBundle"),
            "media-widget" | "mediaWidget" => Some("mediaWidget"),
            "scrap-widget" | "scrapWidget" => Some("scrapWidget"),
            "link-preview" | "linkPreview" | "youtube-video" | "youtubeVideo" => Some("linkPreview"),
            "link-group" | "linkGroup" => Some("linkGroup"),
            "toggle-block" | "toggleBlock" => Some("toggleBlock"),
            "blockquote-toggle" | "blockquoteToggle" => Some("blockquoteToggle"),
            "columnGroup" | "column-group" => Some("columnGroup"),
            "encrypted-image" | "encryptedImage" => Some("encryptedImage"),
            "mermaid" | "mermaidBlock" => Some("mermaidBlock"),
            "groupBlock" | "group-block" | "collectionBlock" | "collection-block" => {
                Some("collectionBlock")
            }
            _ => None,
        };
        if matched.is_some() {
            return matched;
        }
    }
    if tag_name == "div" || tag_name == "span" {
        if let Some(cls) = attr_value(tag_open, "class") {
            if has_class_token(&cls, "link-preview-block") || has_class_token(&cls, "youtube-video") {
                return Some("linkPreview");
            }
            if has_class_token(&cls, "link-group-block") {
                return Some("linkGroup");
            }
            if has_class_token(&cls, "toggle-block") {
                return Some("toggleBlock");
            }
            if has_class_token(&cls, "blockquote-toggle") {
                return Some("blockquoteToggle");
            }
            if has_class_token(&cls, "scrap-widget-block") {
                return Some("scrapWidget");
            }
            if has_class_token(&cls, "group-collection") {
                return Some("collectionBlock");
            }
            if has_class_token(&cls, "question-block") {
                return Some("questionBlock");
            }
            if has_class_token(&cls, "document-bundle") || has_class_token(&cls, "document-bundle-widget") {
                return Some("documentBundle");
            }
            if has_class_token(&cls, "file-widget") {
                return Some("fileWidget");
            }
            if has_class_token(&cls, "habit-widget") {
                return Some("habitWidget");
            }
            if has_class_token(&cls, "focus-widget") {
                return Some("focusWidget");
            }
            if has_class_token(&cls, "alarm-widget") {
                return Some("alarmWidget");
            }
            if has_class_token(&cls, "calendar-event-widget") {
                return Some("calendarEventWidget");
            }
            if has_class_token(&cls, "media-widget") {
                return Some("mediaWidget");
            }
            if has_class_token(&cls, "column-group") {
                return Some("columnGroup");
            }
        }
        if attr_value(tag_open, "url").is_some() {
            return Some("linkPreview");
        }
    }
    None
}

/// Cleans up an unclosed `<p>` in `rich_buf` before splitting out an inline widget.
/// Returns `true` if `rich_buf` was inside an unclosed `<p>...</p>`.
fn close_or_strip_open_paragraph(buf: &mut String) -> bool {
    let last_p_open = buf.rfind("<p>").or_else(|| buf.rfind("<p "));
    let last_p_close = buf.rfind("</p>");
    let is_inside_p = match (last_p_open, last_p_close) {
        (Some(o), Some(c)) => o > c,
        (Some(_), None) => true,
        _ => false,
    };
    if !is_inside_p {
        return false;
    }
    if let Some(open_idx) = last_p_open {
        if let Some(rel_gt) = buf[open_idx..].find('>') {
            let after_open = open_idx + rel_gt + 1;
            let trailing = buf[after_open..].trim();
            if trailing.is_empty() || trailing == "<br>" || trailing == "<br/>" {
                buf.truncate(open_idx);
            } else {
                buf.push_str("</p>");
            }
        }
    }
    true
}

/// Parses TipTap HTML into an ordered sequence of rich-text and live widget blocks.
pub fn parse_note_blocks(html: &str) -> Vec<NoteBlock> {
    let mut blocks = Vec::new();
    let mut rich_buf = String::new();
    let mut pos = 0usize;
    let mut idx = 0usize;

    let flush_rich = |buf: &mut String, out: &mut Vec<NoteBlock>, counter: &mut usize| {
        let trimmed = buf.trim();
        if !trimmed.is_empty() && trimmed != "<p></p>" && trimmed != "<p><br></p>" && trimmed != "<p><br/></p>" {
            let normalized = normalize_tiptap_rich_html(buf);
            out.push(NoteBlock {
                id: format!("blk_{}", *counter),
                block_type: "richText".to_string(),
                attrs: BTreeMap::new(),
                html: normalized.clone(),
                inner_html: normalized,
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

        if let Some(block_type) = detect_block_type(&tag_name, tag_open, &html[gt..]) {
            let was_in_p = close_or_strip_open_paragraph(&mut rich_buf);
            flush_rich(&mut rich_buf, &mut blocks, &mut idx);

            let is_void_tag = tag_name == "img" || tag_name == "hr" || tag_name == "br";
            let is_self_closing = is_void_tag
                || tag_open[..tag_open.len().saturating_sub(1)]
                    .trim_end()
                    .ends_with('/');
            let close_end = if is_self_closing {
                gt
            } else {
                find_matching_close(html, gt, &tag_name)
            };
            let full_html = html[lt..close_end].to_string();
            let close_tag = format!("</{}>", tag_name);
            let inner_end = if is_self_closing {
                tag_open.len()
            } else {
                full_html
                    .to_ascii_lowercase()
                    .rfind(&close_tag)
                    .unwrap_or(full_html.len())
            };
            let inner_start = tag_open.len().min(inner_end);
            let mut attrs = parse_all_data_attrs(tag_open);
            attrs.insert("_tag".to_string(), tag_name);
            let mut inner_str = full_html[inner_start..inner_end].to_string();
            if block_type == "mermaidBlock" {
                let stripped = inner_str
                    .trim()
                    .strip_prefix("<code class=\"language-mermaid\">")
                    .or_else(|| inner_str.trim().strip_prefix("<code class='language-mermaid'>"))
                    .unwrap_or(inner_str.trim());
                let raw_code = stripped.strip_suffix("</code>").unwrap_or(stripped);
                attrs.insert("code".to_string(), html_unescape(raw_code));
            } else if matches!(block_type, "toggleBlock" | "blockquoteToggle" | "collectionBlock")
                && !inner_str.trim().is_empty()
            {
                inner_str = normalize_tiptap_rich_html(&inner_str);
            }
            blocks.push(NoteBlock {
                id: format!("blk_{}", idx),
                block_type: block_type.to_string(),
                attrs,
                inner_html: inner_str,
                html: full_html,
            });
            idx += 1;
            pos = close_end;

            if was_in_p {
                let rest = &html[pos..];
                let ws_len = rest.len() - rest.trim_start().len();
                let after_ws = &rest[ws_len..];
                if after_ws.starts_with("</p>") {
                    pos += ws_len + 4;
                } else if after_ws.starts_with("<br></p>") {
                    pos += ws_len + 8;
                } else if after_ws.starts_with("<br/></p>") {
                    pos += ws_len + 9;
                } else {
                    rich_buf.push_str("<p>");
                }
            }
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
            html: "<p><br/></p>".to_string(),
            inner_html: "<p><br/></p>".to_string(),
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
        if block.block_type == "mermaidBlock" {
            let code = block.attrs.get("code").cloned().unwrap_or_default();
            out.push_str("<pre><code class=\"language-mermaid\">");
            out.push_str(&html_escape_attr(&code));
            out.push_str("</code></pre>");
            continue;
        }
        if block.block_type == "imageBlock" {
            out.push_str("<img");
            for (k, v) in &block.attrs {
                if k == "_tag" {
                    continue;
                }
                out.push(' ');
                out.push_str(k);
                out.push_str("=\"");
                out.push_str(&html_escape_attr(v));
                out.push('"');
            }
            out.push_str("/>");
            continue;
        }
        let tag = block
            .attrs
            .get("_tag")
            .map(String::as_str)
            .filter(|t| !t.is_empty())
            .unwrap_or_else(|| match block.block_type.as_str() {
                "focusWidget" | "alarmWidget" | "habitWidget" | "calendarEventWidget" | "mediaWidget" => "span",
                "encryptedImage" => "encrypted-image",
                _ => "div",
            });
        if block.attrs.is_empty() && !block.html.trim().is_empty() {
            out.push_str(&block.html);
            continue;
        }
        out.push('<');
        out.push_str(tag);
        for (k, v) in &block.attrs {
            if k == "_tag" {
                continue;
            }
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

    #[test]
    fn parses_class_based_and_paragraph_wrapped_inline_widgets() {
        let html = "<p> Antes <span class=\"habit-widget\" data-type=\"habit-widget\" data-habit-id=\"h-1\" data-title=\"Leitura\"></span></p><div class=\"link-preview-block\" url=\"https://rust-lang.org\" title=\"Rust\"></div><div class=\"toggle-block\" data-title=\"Detalhes\" data-is-open=\"true\"><p>Corpo</p></div><div class=\"scrap-widget-block\" id=\"sc-1\" url=\"https://example.com\"></div>";
        let blocks = parse_note_blocks(html);
        assert_eq!(blocks.len(), 5);
        assert_eq!(blocks[0].block_type, "richText");
        assert!(blocks[0].html.contains("Antes"));
        assert_eq!(blocks[1].block_type, "habitWidget");
        assert_eq!(blocks[2].block_type, "linkPreview");
        assert_eq!(blocks[2].attrs.get("url").map(String::as_str), Some("https://rust-lang.org"));
        assert_eq!(blocks[3].block_type, "toggleBlock");
        assert_eq!(blocks[3].attrs.get("data-title").map(String::as_str), Some("Detalhes"));
        assert_eq!(blocks[4].block_type, "scrapWidget");
    }
}
