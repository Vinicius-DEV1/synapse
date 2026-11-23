//! Surgical SEARCH/REPLACE patching and word-level HTML diffing for notes & AI prompts.

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
    pub replaced_count: usize,
    pub error: Option<String>,
}

/// Parses `<<<<<<< SEARCH ... ======= ... >>>>>>>` blocks from an AI response.
pub fn parse_search_replace_blocks(content: &str) -> Vec<SearchReplaceBlock> {
    let mut blocks = Vec::new();
    if !content.contains("<<<<<<< SEARCH") {
        return blocks;
    }

    let mut pos = 0;
    while let Some(rel_start) = content[pos..].find("<<<<<<< SEARCH") {
        let start = pos + rel_start;
        let Some(nl) = content[start..].find('\n') else {
            break;
        };
        let search_start = start + nl + 1;
        let Some(rel_sep) = content[search_start..].find("=======") else {
            break;
        };
        let sep = search_start + rel_sep;
        let search = content[search_start..sep]
            .strip_suffix('\n')
            .unwrap_or(&content[search_start..sep]);

        let Some(sep_nl) = content[sep..].find('\n') else {
            break;
        };
        let replace_start = sep + sep_nl + 1;
        let Some(rel_end) = content[replace_start..].find(">>>>>>>") else {
            break;
        };
        let end = replace_start + rel_end;
        let replace = content[replace_start..end]
            .strip_suffix('\n')
            .unwrap_or(&content[replace_start..end]);

        blocks.push(SearchReplaceBlock {
            search: search.to_string(),
            replace: replace.to_string(),
        });
        pos = end + 7;
    }

    blocks
}

/// Applies parsed SEARCH/REPLACE blocks sequentially with CRLF and trimmed-edge fallbacks.
pub fn apply_search_replace(original: &str, blocks: &[SearchReplaceBlock]) -> SearchReplaceResult {
    if blocks.is_empty() {
        return SearchReplaceResult {
            success: true,
            result: original.to_string(),
            replaced_count: 0,
            error: None,
        };
    }

    let mut current = original.to_string();
    let mut count = 0usize;

    for (i, block) in blocks.iter().enumerate() {
        if let Some(pos) = current.find(&block.search) {
            current.replace_range(pos..pos + block.search.len(), &block.replace);
            count += 1;
            continue;
        }

        let norm_curr = current.replace("\r\n", "\n");
        let norm_search = block.search.replace("\r\n", "\n");
        if let Some(pos) = norm_curr.find(&norm_search) {
            let mut next = norm_curr;
            next.replace_range(pos..pos + norm_search.len(), &block.replace.replace("\r\n", "\n"));
            current = next;
            count += 1;
            continue;
        }

        let trimmed = block.search.trim();
        if !trimmed.is_empty() {
            if let Some(pos) = current.find(trimmed) {
                current.replace_range(pos..pos + trimmed.len(), block.replace.trim());
                count += 1;
                continue;
            }
        }

        return SearchReplaceResult {
            success: false,
            result: original.to_string(),
            replaced_count: count,
            error: Some(format!("Trecho de busca não encontrado no bloco #{}.", i + 1)),
        };
    }

    SearchReplaceResult {
        success: true,
        result: current,
        replaced_count: count,
        error: None,
    }
}

fn escape_html(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// Computes an ordered word-level LCS diff rendered as `<del>` and `<ins>` spans.
pub fn compute_word_diff_html(old_text: &str, new_text: &str) -> String {
    if old_text == new_text {
        return escape_html(new_text);
    }
    let old_words: Vec<&str> = old_text.split_whitespace().collect();
    let new_words: Vec<&str> = new_text.split_whitespace().collect();

    if old_words.is_empty() {
        return format!(
            "<span style=\"background-color:rgba(16,185,129,0.25);color:#6ee7b7;padding:1px 3px;font-weight:bold;\">{}</span>",
            escape_html(new_text)
        );
    }
    if new_words.is_empty() {
        return format!(
            "<span style=\"background-color:rgba(244,63,94,0.25);color:#fda4af;text-decoration:line-through;padding:1px 3px;\">{}</span>",
            escape_html(old_text)
        );
    }

    let n = old_words.len();
    let m = new_words.len();
    // Guard memory for huge revisions by falling back cleanly when n*m exceeds 400k cells.
    if n * m > 400_000 {
        return escape_html(new_text);
    }

    let mut dp = vec![0usize; (n + 1) * (m + 1)];
    for i in (0..n).rev() {
        for j in (0..m).rev() {
            dp[i * (m + 1) + j] = if old_words[i] == new_words[j] {
                dp[(i + 1) * (m + 1) + (j + 1)] + 1
            } else {
                dp[(i + 1) * (m + 1) + j].max(dp[i * (m + 1) + (j + 1)])
            };
        }
    }

    let mut out = String::new();
    let (mut i, mut j) = (0usize, 0usize);
    while i < n || j < m {
        if i < n && j < m && old_words[i] == new_words[j] {
            out.push_str(&escape_html(old_words[i]));
            out.push(' ');
            i += 1;
            j += 1;
        } else if j < m && (i == n || dp[i * (m + 1) + (j + 1)] >= dp[(i + 1) * (m + 1) + j]) {
            out.push_str("<span style=\"background-color:rgba(16,185,129,0.25);color:#6ee7b7;padding:1px 3px;font-weight:bold;\">");
            out.push_str(&escape_html(new_words[j]));
            out.push_str("</span> ");
            j += 1;
        } else {
            out.push_str("<span style=\"background-color:rgba(244,63,94,0.25);color:#fda4af;text-decoration:line-through;padding:1px 3px;\">");
            out.push_str(&escape_html(old_words[i]));
            out.push_str("</span> ");
            i += 1;
        }
    }
    out.trim_end().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_and_applies_search_replace() {
        let ai_out = "<<<<<<< SEARCH\nhello world\n=======\nhello rust\n>>>>>>>";
        let blocks = parse_search_replace_blocks(ai_out);
        assert_eq!(blocks.len(), 1);
        let res = apply_search_replace("alpha\nhello world\nomega", &blocks);
        assert!(res.success);
        assert_eq!(res.replaced_count, 1);
        assert_eq!(res.result, "alpha\nhello rust\nomega");
    }

    #[test]
    fn computes_ordered_word_diff() {
        let diff = compute_word_diff_html("rust is fast", "rust is very fast");
        assert!(diff.contains("very"));
        assert!(diff.contains("6ee7b7"));
    }
}
