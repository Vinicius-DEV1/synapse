//! Maps Qt UTF-16 cursor offsets back into balanced rich HTML fragments.

use super::entities::{decode_character_reference, html_escape_text};

type OpenTag = (String, String);

fn is_block_tag(name: &str) -> bool {
    matches!(
        name,
        "address"
            | "article"
            | "aside"
            | "blockquote"
            | "body"
            | "caption"
            | "center"
            | "dd"
            | "details"
            | "div"
            | "dl"
            | "dt"
            | "fieldset"
            | "figcaption"
            | "figure"
            | "footer"
            | "form"
            | "h1"
            | "h2"
            | "h3"
            | "h4"
            | "h5"
            | "h6"
            | "header"
            | "li"
            | "main"
            | "nav"
            | "ol"
            | "p"
            | "pre"
            | "section"
            | "table"
            | "td"
            | "th"
            | "tr"
            | "ul"
    )
}

fn is_void_tag(name: &str) -> bool {
    matches!(
        name,
        "area"
            | "base"
            | "br"
            | "col"
            | "embed"
            | "hr"
            | "img"
            | "input"
            | "link"
            | "meta"
            | "param"
            | "source"
            | "track"
            | "wbr"
    )
}

fn find_tag_end(html: &str, start: usize) -> Option<usize> {
    let mut quote = None;
    for (relative, byte) in html.as_bytes()[start + 1..].iter().enumerate() {
        match (*byte, quote) {
            (b'\'', None) => quote = Some(b'\''),
            (b'"', None) => quote = Some(b'"'),
            (b'\'', Some(b'\'')) | (b'"', Some(b'"')) => quote = None,
            (b'>', None) => return Some(start + relative + 2),
            _ => {}
        }
    }
    None
}

fn tag_name(inner: &str) -> Option<&str> {
    let trimmed = inner.trim_start();
    let name = trimmed
        .trim_start_matches('/')
        .trim_start()
        .split(|character: char| {
            character.is_ascii_whitespace() || character == '/' || character == '>'
        })
        .next()?;
    (!name.is_empty()
        && name
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b':')))
    .then_some(name)
}

fn close_tag(open_tags: &mut Vec<OpenTag>, name: &str) {
    if let Some(position) = open_tags
        .iter()
        .rposition(|(open_name, _)| open_name == name)
    {
        open_tags.truncate(position);
    }
}

fn complete_split(mut before: String, after: String, open_tags: &[OpenTag]) -> (String, String) {
    for (name, _) in open_tags.iter().rev() {
        before.push_str("</");
        before.push_str(name);
        before.push('>');
    }
    let has_open_label = open_tags.iter().any(|(name, _)| name == "label");
    let mut reopened = String::new();
    for (name, opening_tag) in open_tags {
        reopened.push_str(opening_tag);
        if name == "li" && !has_open_label && opening_tag.contains("data-type=\"taskItem\"") {
            if opening_tag.contains("data-checked=\"true\"") {
                reopened.push_str(
                    "<label><input type=\"checkbox\" checked=\"checked\"/><span></span></label>",
                );
            } else {
                reopened.push_str("<label><input type=\"checkbox\"/><span></span></label>");
            }
        }
    }
    reopened.push_str(&after);
    (before, reopened)
}

fn split_at(html: &str, byte_index: usize, open_tags: &[OpenTag]) -> (String, String) {
    complete_split(
        html[..byte_index].to_string(),
        html[byte_index..].to_string(),
        open_tags,
    )
}

fn split_inside_reference(
    html: &str,
    reference_start: usize,
    reference_end: usize,
    decoded: &str,
    requested_units: usize,
    open_tags: &[OpenTag],
) -> Option<(String, String)> {
    let mut units_before = 0usize;
    let characters: Vec<char> = decoded.chars().collect();
    for (index, character) in characters.iter().enumerate() {
        let character_units = character.len_utf16();
        if units_before < requested_units && units_before + character_units <= requested_units {
            units_before += character_units;
        } else {
            // If the offset lands inside a surrogate pair, move it to the prior scalar boundary.
            let before_reference: String = characters[..index].iter().collect();
            let after_reference: String = characters[index..].iter().collect();
            let mut before = html[..reference_start].to_string();
            before.push_str(&html_escape_text(&before_reference));
            let mut after = html_escape_text(&after_reference);
            after.push_str(&html[reference_end..]);
            return Some(complete_split(before, after, open_tags));
        }
    }
    None
}

/// Splits rich HTML at a Qt UTF-16 text offset without breaking entities or open tags.
pub fn split_rich_html_at_text_offset(html: &str, text_offset: usize) -> (String, String) {
    if text_offset == 0 {
        return (String::new(), html.to_string());
    }

    let mut open_tags: Vec<OpenTag> = Vec::new();
    let mut count = 0usize;
    let mut pending_block_separator = false;
    let bytes = html.as_bytes();
    let mut cursor = 0usize;

    while cursor < bytes.len() {
        if html[cursor..].starts_with("<!--") {
            cursor = html[cursor + 4..]
                .find("-->")
                .map(|end| cursor + 4 + end + 3)
                .unwrap_or(html.len());
            continue;
        }

        if bytes[cursor] == b'<' {
            if let Some(tag_end) = find_tag_end(html, cursor) {
                let raw_tag = &html[cursor..tag_end];
                let inner = raw_tag[1..raw_tag.len() - 1].trim();
                if inner.starts_with('!') || inner.starts_with('?') {
                    cursor = tag_end;
                    continue;
                }
                if let Some(raw_name) = tag_name(inner) {
                    let name = raw_name.to_ascii_lowercase();
                    if inner.starts_with('/') {
                        close_tag(&mut open_tags, &name);
                        if is_block_tag(&name) {
                            pending_block_separator = true;
                        }
                        cursor = tag_end;
                        continue;
                    }

                    if pending_block_separator && name != "meta" && name != "link" {
                        if count >= text_offset {
                            return split_at(html, cursor, &open_tags);
                        }
                        count += 1;
                        pending_block_separator = false;
                        if count >= text_offset {
                            return split_at(html, cursor, &open_tags);
                        }
                    } else if count >= text_offset && name != "meta" && name != "link" {
                        return split_at(html, cursor, &open_tags);
                    }

                    if matches!(name.as_str(), "br" | "img" | "hr" | "input") {
                        count += 1;
                        cursor = tag_end;
                        if count >= text_offset {
                            return split_at(html, cursor, &open_tags);
                        }
                        continue;
                    }
                    if name == "span"
                        && super::helpers::parse_all_data_attrs(raw_tag)
                            .contains_key("data-page-id")
                    {
                        // Page references are inline atoms in the canonical TipTap schema.
                        count += 1;
                    }
                    let self_closing = inner.ends_with('/');
                    if !is_void_tag(&name) && !self_closing {
                        open_tags.push((name, raw_tag.to_string()));
                    }
                    cursor = tag_end;
                    continue;
                }
            }
        }

        if pending_block_separator {
            if count >= text_offset {
                return split_at(html, cursor, &open_tags);
            }
            count += 1;
            pending_block_separator = false;
            if count >= text_offset {
                return split_at(html, cursor, &open_tags);
            }
        }
        if count >= text_offset {
            return split_at(html, cursor, &open_tags);
        }

        if bytes[cursor] == b'&' {
            if let Some((reference_len, decoded)) = decode_character_reference(&html[cursor..]) {
                let reference_end = cursor + reference_len;
                let remaining_units = text_offset - count;
                if decoded.encode_utf16().count() > remaining_units {
                    if let Some(split) = split_inside_reference(
                        html,
                        cursor,
                        reference_end,
                        &decoded,
                        remaining_units,
                        &open_tags,
                    ) {
                        return split;
                    }
                }
                count += decoded.encode_utf16().count();
                cursor = reference_end;
                continue;
            }
        }

        let character = html[cursor..]
            .chars()
            .next()
            .expect("cursor is inside the HTML string");
        count += character.len_utf16();
        cursor += character.len_utf8();
    }

    (html.to_string(), String::new())
}
