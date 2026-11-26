//! HTML character reference decoding and escaping shared by Notes parsing paths.

pub(super) fn decode_character_reference(input: &str) -> Option<(usize, String)> {
    const MAX_CHARACTER_REFERENCE_NAME_BYTES: usize = 64;

    let bytes = input.as_bytes();
    if bytes.first() != Some(&b'&') {
        return None;
    }

    if bytes.get(1) == Some(&b'#') {
        return decode_numeric_reference(input);
    }

    let mut best_match: Option<(usize, (u32, u32))> = None;
    let mut end = 1usize;
    while end <= MAX_CHARACTER_REFERENCE_NAME_BYTES {
        let Some(byte) = bytes.get(end) else {
            break;
        };
        if !byte.is_ascii_alphanumeric() && *byte != b';' {
            break;
        }
        end += 1;
        if let Some(&(first, second)) = markup5ever::data::NAMED_ENTITIES.get(&input[1..end]) {
            if first != 0 {
                best_match = Some((end, (first, second)));
            }
        }
    }

    let (end, (first, second)) = best_match?;
    let mut decoded = String::new();
    decoded.push(char::from_u32(first)?);
    if second != 0 {
        decoded.push(char::from_u32(second)?);
    }
    Some((end, decoded))
}

fn decode_numeric_reference(input: &str) -> Option<(usize, String)> {
    let bytes = input.as_bytes();
    let mut cursor = 2usize;
    let radix = match bytes.get(cursor) {
        Some(b'x' | b'X') => {
            cursor += 1;
            16
        }
        _ => 10,
    };
    let digit_start = cursor;
    let mut value = 0u32;
    let mut overflowed = false;
    while let Some(byte) = bytes.get(cursor) {
        if !byte.is_ascii_hexdigit() || (radix == 10 && !byte.is_ascii_digit()) {
            break;
        }
        let digit = match *byte {
            b'0'..=b'9' => u32::from(byte - b'0'),
            b'a'..=b'f' => u32::from(byte - b'a' + 10),
            b'A'..=b'F' => u32::from(byte - b'A' + 10),
            _ => return None,
        };
        if let Some(next_value) = value
            .checked_mul(radix)
            .and_then(|current| current.checked_add(digit))
        {
            value = next_value;
        } else {
            overflowed = true;
        }
        cursor += 1;
    }
    if cursor == digit_start {
        return None;
    }

    if bytes.get(cursor) == Some(&b';') {
        cursor += 1;
    }

    let character = match value {
        _ if overflowed => char::REPLACEMENT_CHARACTER,
        0 | 0xD800..=0xDFFF | 0x110000..=u32::MAX => char::REPLACEMENT_CHARACTER,
        0x80..=0x9F => markup5ever::data::C1_REPLACEMENTS[(value - 0x80) as usize]
            .unwrap_or_else(|| char::from_u32(value).unwrap_or(char::REPLACEMENT_CHARACTER)),
        _ => char::from_u32(value).unwrap_or(char::REPLACEMENT_CHARACTER),
    };
    Some((cursor, character.to_string()))
}

pub(super) fn html_unescape(input: &str) -> String {
    html_unescape_with_context(input, false)
}

pub(super) fn html_unescape_attribute(input: &str) -> String {
    html_unescape_with_context(input, true)
}

fn html_unescape_with_context(input: &str, attribute_context: bool) -> String {
    let mut output = String::with_capacity(input.len());
    let mut cursor = 0usize;
    while cursor < input.len() {
        let Some(relative_ampersand) = input[cursor..].find('&') else {
            output.push_str(&input[cursor..]);
            break;
        };
        let ampersand = cursor + relative_ampersand;
        output.push_str(&input[cursor..ampersand]);
        let Some((reference_len, decoded)) = decode_character_reference(&input[ampersand..]) else {
            output.push('&');
            cursor = ampersand + 1;
            continue;
        };

        let reference_end = ampersand + reference_len;
        let has_semicolon = input.as_bytes().get(reference_end - 1) == Some(&b';');
        let next_character = input[reference_end..].chars().next();
        let ambiguous_attribute_suffix = attribute_context
            && !has_semicolon
            && next_character
                .is_some_and(|character| character.is_ascii_alphanumeric() || character == '=');
        if ambiguous_attribute_suffix {
            output.push('&');
            cursor = ampersand + 1;
        } else {
            output.push_str(&decoded);
            cursor = reference_end;
        }
    }
    output
}

pub(super) fn html_escape_text(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

pub(super) fn html_escape_attr(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}
