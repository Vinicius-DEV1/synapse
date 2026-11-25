//! Lossless block AST -> canonical TipTap HTML serializer and HTML cursor splitter.

use super::helpers::html_escape_attr;
use super::NoteBlock;

fn entity_utf16_len(entity: &str) -> usize {
    let Some(body) = entity
        .strip_prefix('&')
        .and_then(|value| value.strip_suffix(';'))
    else {
        return 1;
    };
    if let Some(decimal) = body.strip_prefix('#') {
        let (digits, radix) = decimal
            .strip_prefix('x')
            .or_else(|| decimal.strip_prefix('X'))
            .map(|hex| (hex, 16))
            .unwrap_or((decimal, 10));
        return u32::from_str_radix(digits, radix)
            .ok()
            .and_then(char::from_u32)
            .map(char::len_utf16)
            .unwrap_or(1);
    }
    1
}

/// Serializes edited blocks back to canonical TipTap HTML preserving all data-* attrs.
pub fn serialize_note_blocks(blocks: &[NoteBlock]) -> String {
    let mut out = String::new();
    for block in blocks {
        match block.block_type.as_str() {
            "richText" => {
                if !block.html.trim().is_empty() {
                    out.push_str(&block.html);
                }
            }
            "mermaidBlock" => {
                let code = block.attrs.get("code").cloned().unwrap_or_default();
                out.push_str("<pre><code class=\"language-mermaid\">");
                out.push_str(&html_escape_attr(&code));
                out.push_str("</code></pre>");
            }
            "codeBlock" => {
                let lang = block
                    .attrs
                    .get("language")
                    .or_else(|| block.attrs.get("data-language"))
                    .map(String::as_str)
                    .unwrap_or("plaintext")
                    .trim();
                let safe_lang = if lang.is_empty() { "plaintext" } else { lang };
                let code = block.attrs.get("code").cloned().unwrap_or_default();
                out.push_str(&format!(
                    "<pre><code class=\"language-{}\">{}</code></pre>",
                    html_escape_attr(safe_lang),
                    html_escape_attr(&code)
                ));
            }
            "blockquote" => {
                let color = block
                    .attrs
                    .get("data-color")
                    .or_else(|| block.attrs.get("color"))
                    .map(String::as_str)
                    .unwrap_or("default")
                    .trim();
                if color.is_empty() || color == "default" {
                    out.push_str("<blockquote>");
                } else {
                    let esc = html_escape_attr(color);
                    out.push_str(&format!(
                        "<blockquote data-color=\"{0}\" style=\"background-color: {0}15 !important; border-left-color: {0} !important;\">",
                        esc
                    ));
                }
                out.push_str(&block.inner_html);
                out.push_str("</blockquote>");
            }
            "imageBlock" => {
                out.push_str("<img");
                for (k, v) in &block.attrs {
                    if k == "_tag" {
                        continue;
                    }
                    out.push_str(&format!(" {}=\"{}\"", k, html_escape_attr(v)));
                }
                out.push_str("/>");
            }
            _ => {
                let tag = block
                    .attrs
                    .get("_tag")
                    .map(String::as_str)
                    .filter(|t| !t.is_empty())
                    .unwrap_or_else(|| match block.block_type.as_str() {
                        "focusWidget"
                        | "alarmWidget"
                        | "habitWidget"
                        | "calendarEventWidget"
                        | "mediaWidget" => "span",
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
                    out.push_str(&format!(" {}=\"{}\"", k, html_escape_attr(v)));
                }
                out.push('>');
                out.push_str(&block.inner_html);
                out.push_str("</");
                out.push_str(tag);
                out.push('>');
            }
        }
    }
    out
}

/// Splits rich HTML at a Qt UTF-16 text offset without breaking open tags.
pub fn split_rich_html_at_text_offset(html: &str, text_offset: usize) -> (String, String) {
    if text_offset == 0 {
        return (String::new(), html.to_string());
    }
    let void_tags = ["br", "img", "hr", "input", "meta", "link"];
    let mut open_tags: Vec<(String, String)> = Vec::new();
    let mut count = 0usize;
    let mut split_byte: Option<usize> = None;
    let bytes = html.as_bytes();
    let mut i = 0usize;

    while i < bytes.len() {
        if bytes[i] == b'<' {
            if let Some(rel_gt) = html[i..].find('>') {
                let tag_end = i + rel_gt + 1;
                let tag_str = &html[i..tag_end];
                let inner = tag_str.trim_start_matches('<').trim_end_matches('>').trim();
                if inner.starts_with('/') {
                    let name = inner[1..].trim().to_ascii_lowercase();
                    if let Some(pos) = open_tags.iter().rposition(|(n, _)| n == &name) {
                        open_tags.truncate(pos);
                    }
                } else if !inner.ends_with('/') && !inner.starts_with('!') {
                    let name = inner
                        .split(|c: char| c.is_ascii_whitespace())
                        .next()
                        .unwrap_or("")
                        .to_ascii_lowercase();
                    if !name.is_empty() && !void_tags.contains(&name.as_str()) {
                        open_tags.push((name, tag_str.to_string()));
                    }
                }
                i = tag_end;
                continue;
            }
        }
        if bytes[i] == b'&' {
            if let Some(rel_semi) = html[i..].find(';') {
                if rel_semi <= 10 && !html[i..i + rel_semi].contains('<') {
                    if count >= text_offset {
                        split_byte = Some(i);
                        break;
                    }
                    count += entity_utf16_len(&html[i..i + rel_semi + 1]);
                    i += rel_semi + 1;
                    continue;
                }
            }
        }
        if count >= text_offset {
            split_byte = Some(i);
            break;
        }
        let Some(ch) = html[i..].chars().next() else {
            break;
        };
        let ch_len = ch.len_utf8();
        count += ch.len_utf16();
        i += ch_len;
    }

    let Some(byte_idx) = split_byte else {
        return (html.to_string(), String::new());
    };

    let mut before = html[..byte_idx].to_string();
    for (name, _) in open_tags.iter().rev() {
        before.push_str(&format!("</{}>", name));
    }
    let mut after = String::new();
    for (_, open_tag) in &open_tags {
        after.push_str(open_tag);
    }
    after.push_str(&html[byte_idx..]);
    (before, after)
}
