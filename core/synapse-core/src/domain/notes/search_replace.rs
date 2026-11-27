//! Shared SEARCH/REPLACE parsing and application for Notes AI proposals.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct SearchReplaceBlock {
    pub search: String,
    pub replace: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SearchReplaceResult {
    pub success: bool,
    pub result: String,
    pub parsed_count: usize,
    pub replaced_count: usize,
    pub error: Option<String>,
}

/// Parses `<<<<<<< SEARCH ... ======= ... >>>>>>>` blocks from an AI response.
pub fn parse_search_replace_blocks(content: &str) -> Vec<SearchReplaceBlock> {
    // React skips its parser unless this exact literal marker occurs somewhere in the response.
    if !content.contains("<<<<<<< SEARCH") {
        return Vec::new();
    }

    let mut blocks = Vec::new();
    let mut pos = 0;
    while let Some((start, search_start)) = find_search_opening(content, pos) {
        let Some((separator, replace_start)) = find_search_separator(content, search_start) else {
            pos = start + 1;
            continue;
        };
        let search_end = if separator > search_start && content.as_bytes()[separator - 1] == b'\n' {
            separator - 1
        } else {
            separator
        };
        let Some(end_marker) = find_marker(content, replace_start, ">>>>>>>") else {
            pos = start + 1;
            continue;
        };
        let replace_end =
            if end_marker > replace_start && content.as_bytes()[end_marker - 1] == b'\n' {
                end_marker - 1
            } else {
                end_marker
            };

        blocks.push(SearchReplaceBlock {
            search: content[search_start..search_end].to_string(),
            replace: content[replace_start..replace_end].to_string(),
        });
        pos = end_marker + 7;
    }

    blocks
}

fn find_search_opening(content: &str, mut from: usize) -> Option<(usize, usize)> {
    while let Some(relative) = content.get(from..)?.find("<<<<<<<") {
        let start = from + relative;
        let after_marker = start + 7;
        let label_tail = content.get(after_marker..)?;
        if let Some(after_label) = label_tail
            .trim_start_matches(is_ecmascript_whitespace)
            .strip_prefix("SEARCH")
        {
            let label_end = content.len() - after_label.len();
            if let Some(body_start) = whitespace_terminated_line(content, label_end) {
                return Some((start, body_start));
            }
        }
        from = start + 1;
    }
    None
}

fn find_search_separator(content: &str, from: usize) -> Option<(usize, usize)> {
    let mut cursor = from;
    while let Some(start) = find_marker(content, cursor, "=======") {
        if let Some(body_start) = whitespace_terminated_line(content, start + 7) {
            return Some((start, body_start));
        }
        cursor = start + 1;
    }
    None
}

fn find_marker(content: &str, from: usize, marker: &str) -> Option<usize> {
    content
        .get(from..)?
        .find(marker)
        .map(|relative| from + relative)
}

fn whitespace_terminated_line(content: &str, from: usize) -> Option<usize> {
    let mut last_newline_end = None;
    for (offset, character) in content.get(from..)?.char_indices() {
        if !is_ecmascript_whitespace(character) {
            break;
        }
        if character == '\n' {
            last_newline_end = Some(from + offset + character.len_utf8());
        }
    }
    last_newline_end
}

/// Applies blocks with React-compatible exact, CRLF, trimmed-edge, and string-replacement behavior.
pub fn apply_search_replace(original: &str, blocks: &[SearchReplaceBlock]) -> SearchReplaceResult {
    if blocks.is_empty() {
        return SearchReplaceResult {
            success: true,
            result: original.to_string(),
            parsed_count: 0,
            replaced_count: 0,
            error: None,
        };
    }

    let mut current = original.to_string();
    let mut count = 0usize;

    for (i, block) in blocks.iter().enumerate() {
        if let Some(pos) = current.find(&block.search) {
            current = replace_once_js_compatible(&current, pos, &block.search, &block.replace);
            count += 1;
            continue;
        }

        let norm_curr = current.replace("\r\n", "\n");
        let norm_search = block.search.replace("\r\n", "\n");
        if let Some(pos) = norm_curr.find(&norm_search) {
            let mut next = norm_curr;
            next = replace_once_js_compatible(
                &next,
                pos,
                &norm_search,
                &block.replace.replace("\r\n", "\n"),
            );
            current = next;
            count += 1;
            continue;
        }

        let trimmed = block.search.trim_matches(is_ecmascript_whitespace);
        if !trimmed.is_empty() {
            if let Some(pos) = current.find(trimmed) {
                let replacement = block.replace.trim_matches(is_ecmascript_whitespace);
                current = replace_once_js_compatible(&current, pos, trimmed, replacement);
                count += 1;
                continue;
            }
        }

        return SearchReplaceResult {
            success: false,
            result: original.to_string(),
            parsed_count: blocks.len(),
            replaced_count: count,
            error: Some(format!(
                "Trecho de busca não encontrado no bloco #{}.",
                i + 1
            )),
        };
    }

    SearchReplaceResult {
        success: true,
        result: current,
        parsed_count: blocks.len(),
        replaced_count: count,
        error: None,
    }
}

fn is_ecmascript_whitespace(character: char) -> bool {
    matches!(
        character,
        '\u{0009}'..='\u{000D}'
            | '\u{0020}'
            | '\u{00A0}'
            | '\u{1680}'
            | '\u{2000}'..='\u{200A}'
            | '\u{2028}'
            | '\u{2029}'
            | '\u{202F}'
            | '\u{205F}'
            | '\u{3000}'
            | '\u{FEFF}'
    )
}

fn replace_once_js_compatible(
    current: &str,
    position: usize,
    search: &str,
    replacement: &str,
) -> String {
    let prefix = &current[..position];
    let suffix = &current[position + search.len()..];
    let replacement_chars: Vec<char> = replacement.chars().collect();
    let mut expanded = String::with_capacity(replacement.len());
    let mut index = 0;
    while index < replacement_chars.len() {
        if replacement_chars[index] == '$' && index + 1 < replacement_chars.len() {
            match replacement_chars[index + 1] {
                '$' => {
                    expanded.push('$');
                    index += 2;
                    continue;
                }
                '&' => {
                    expanded.push_str(search);
                    index += 2;
                    continue;
                }
                '`' => {
                    expanded.push_str(prefix);
                    index += 2;
                    continue;
                }
                '\'' => {
                    expanded.push_str(suffix);
                    index += 2;
                    continue;
                }
                _ => {}
            }
        }
        expanded.push(replacement_chars[index]);
        index += 1;
    }

    let mut result = String::with_capacity(prefix.len() + expanded.len() + suffix.len());
    result.push_str(prefix);
    result.push_str(&expanded);
    result.push_str(suffix);
    result
}

#[cfg(test)]
#[path = "search_replace/tests.rs"]
mod tests;
