//! Low-level HTML attribute & tag matching utilities for the block AST parser/serializer.

use std::collections::BTreeMap;

pub(super) fn attr_value(tag_open: &str, name: &str) -> Option<String> {
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

pub(super) fn parse_all_data_attrs(tag_open: &str) -> BTreeMap<String, String> {
    let mut map = BTreeMap::new();
    let bytes = tag_open.as_bytes();
    let mut i = 0;
    while i < bytes.len() && (bytes[i].is_ascii_whitespace() || bytes[i] == b'<') {
        i += 1;
    }
    while i < bytes.len() && !bytes[i].is_ascii_whitespace() && bytes[i] != b'>' && bytes[i] != b'/'
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

/// Decodes numeric references and common named entities used by Notes HTML.
/// Supported names: amp, apos, bull, copy, euro, gt, hellip, ldquo, lsquo, lt,
/// mdash, nbsp, ndash, quot, rdquo, reg, rsquo and trade. Unknown names stay unchanged.
pub(in crate::domain::notes) fn html_unescape(s: &str) -> String {
    fn decode_entity(entity: &str) -> Option<char> {
        let body = entity.strip_prefix('&')?.strip_suffix(';')?;
        let character = match body {
            "quot" => '"',
            "apos" | "#39" => '\'',
            "amp" => '&',
            "lt" => '<',
            "gt" => '>',
            "nbsp" => '\u{00a0}',
            "copy" => '\u{00a9}',
            "reg" => '\u{00ae}',
            "trade" => '\u{2122}',
            "euro" => '\u{20ac}',
            "ndash" => '\u{2013}',
            "mdash" => '\u{2014}',
            "hellip" => '\u{2026}',
            "lsquo" => '\u{2018}',
            "rsquo" => '\u{2019}',
            "ldquo" => '\u{201c}',
            "rdquo" => '\u{201d}',
            "bull" => '\u{2022}',
            _ => {
                let numeric = body.strip_prefix('#')?;
                let (digits, radix) = numeric
                    .strip_prefix('x')
                    .or_else(|| numeric.strip_prefix('X'))
                    .map(|hex| (hex, 16))
                    .unwrap_or((numeric, 10));
                return u32::from_str_radix(digits, radix)
                    .ok()
                    .and_then(char::from_u32);
            }
        };
        Some(character)
    }

    let mut output = String::with_capacity(s.len());
    let mut cursor = 0usize;
    while cursor < s.len() {
        let Some(relative_ampersand) = s[cursor..].find('&') else {
            output.push_str(&s[cursor..]);
            break;
        };
        let ampersand = cursor + relative_ampersand;
        output.push_str(&s[cursor..ampersand]);
        let Some(relative_semicolon) = s[ampersand..].find(';') else {
            output.push_str(&s[ampersand..]);
            break;
        };
        let semicolon = ampersand + relative_semicolon;
        if semicolon - ampersand > 16 {
            output.push('&');
            cursor = ampersand + 1;
            continue;
        }
        let entity = &s[ampersand..=semicolon];
        if let Some(character) = decode_entity(entity) {
            output.push(character);
            cursor = semicolon + 1;
        } else {
            output.push_str(entity);
            cursor = semicolon + 1;
        }
    }
    output
}

pub(super) fn html_escape_attr(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

pub(super) fn find_matching_close(html: &str, open_end: usize, tag_name: &str) -> usize {
    let lower = html.to_ascii_lowercase();
    let open_pat = format!("<{}", tag_name);
    let close_pat = format!("</{}>", tag_name);
    let mut depth = 1usize;
    let mut pos = open_end;

    while pos < lower.len() {
        let next_open = lower[pos..].find(&open_pat);
        let next_close = lower[pos..].find(&close_pat);
        match (next_open, next_close) {
            (_, None) => return html.len(),
            (Some(o), Some(c)) if o < c => {
                let abs_o = pos + o;
                let after_name = abs_o + open_pat.len();
                let is_real_tag = lower
                    .as_bytes()
                    .get(after_name)
                    .map(|b| b.is_ascii_whitespace() || *b == b'>' || *b == b'/')
                    .unwrap_or(false);
                if is_real_tag {
                    let tag_end = lower[abs_o..].find('>').map(|e| abs_o + e + 1);
                    let self_closed = tag_end
                        .and_then(|te| lower[abs_o..te].trim_end().strip_suffix("/>"))
                        .is_some();
                    if !self_closed {
                        depth += 1;
                    }
                    pos = tag_end.unwrap_or(after_name);
                } else {
                    pos = after_name;
                }
            }
            (_, Some(c)) => {
                depth -= 1;
                let abs_c = pos + c + close_pat.len();
                if depth == 0 {
                    return abs_c;
                }
                pos = abs_c;
            }
        }
    }
    html.len()
}

pub(super) fn has_class_token(cls: &str, needle: &str) -> bool {
    cls.split_whitespace().any(|tok| tok == needle)
}

pub(super) fn detect_block_type(
    tag_name: &str,
    tag_open: &str,
    rest_html: &str,
) -> Option<&'static str> {
    if tag_name == "encrypted-image" {
        return Some("encryptedImage");
    }
    if tag_name == "img" {
        if let Some(src) = attr_value(tag_open, "src") {
            let is_supported_inline_data = src.starts_with("data:image/") && src.len() <= 2_700_000;
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
        return Some("codeBlock");
    }
    if tag_name == "blockquote" {
        return Some("blockquote");
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
            "link-preview" | "linkPreview" | "youtube-video" | "youtubeVideo" => {
                Some("linkPreview")
            }
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
            if has_class_token(&cls, "link-preview-block") || has_class_token(&cls, "youtube-video")
            {
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
            if has_class_token(&cls, "document-bundle")
                || has_class_token(&cls, "document-bundle-widget")
            {
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

pub(super) fn close_or_strip_open_paragraph(buf: &mut String) -> bool {
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
