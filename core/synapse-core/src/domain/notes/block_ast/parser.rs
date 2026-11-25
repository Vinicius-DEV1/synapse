//! TipTap HTML -> NoteBlock sequence parser.

use std::collections::BTreeMap;

use super::super::html_normalizer::normalize_tiptap_rich_html;
use super::helpers::{
    attr_value, close_or_strip_open_paragraph, detect_block_type, find_matching_close,
    html_unescape, parse_all_data_attrs,
};
use super::NoteBlock;

fn extract_code_block_attrs(attrs: &mut BTreeMap<String, String>, inner_str: &str) {
    let trimmed = inner_str.trim();
    if let Some(code_start) = trimmed.find("<code") {
        if let Some(gt_rel) = trimmed[code_start..].find('>') {
            let open_tag = &trimmed[code_start..code_start + gt_rel + 1];
            if !attrs.contains_key("data-language") {
                if let Some(cls) = attr_value(open_tag, "class") {
                    if let Some(lang) = cls
                        .split_whitespace()
                        .find_map(|tok| tok.strip_prefix("language-"))
                    {
                        if !lang.is_empty() {
                            attrs.insert("language".to_string(), lang.to_string());
                        }
                    }
                }
            } else if let Some(lang) = attrs.get("data-language").cloned() {
                attrs.insert("language".to_string(), lang);
            }
            let body_start = code_start + gt_rel + 1;
            let body_end = trimmed.rfind("</code>").unwrap_or(trimmed.len());
            if body_end >= body_start {
                attrs.insert(
                    "code".to_string(),
                    html_unescape(&trimmed[body_start..body_end]),
                );
                return;
            }
        }
    }
    attrs.insert("code".to_string(), html_unescape(trimmed));
}

/// Parses TipTap HTML into an ordered sequence of rich-text and live widget blocks.
pub fn parse_note_blocks(html: &str) -> Vec<NoteBlock> {
    let mut blocks = Vec::new();
    let mut rich_buf = String::new();
    let mut pos = 0usize;
    let mut idx = 0usize;

    let flush_rich = |buf: &mut String, out: &mut Vec<NoteBlock>, counter: &mut usize| {
        let trimmed = buf.trim();
        if !trimmed.is_empty()
            && trimmed != "<p></p>"
            && trimmed != "<p><br></p>"
            && trimmed != "<p><br/></p>"
        {
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

            if block_type == "mermaidBlock" || block_type == "codeBlock" {
                extract_code_block_attrs(&mut attrs, &inner_str);
            } else if matches!(
                block_type,
                "toggleBlock" | "blockquoteToggle" | "collectionBlock" | "blockquote"
            ) && !inner_str.trim().is_empty()
            {
                inner_str = normalize_tiptap_rich_html(&inner_str);
            }
            if block_type == "blockquote" && !attrs.contains_key("color") {
                if let Some(dc) = attrs.get("data-color").cloned() {
                    attrs.insert("color".to_string(), dc);
                }
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
