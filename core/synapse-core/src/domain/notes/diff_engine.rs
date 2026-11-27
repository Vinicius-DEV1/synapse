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
    use super::compute_word_diff_html;

    #[test]
    fn computes_ordered_word_diff() {
        let diff = compute_word_diff_html("rust is fast", "rust is very fast");
        assert!(diff.contains("very"));
        assert!(diff.contains("6ee7b7"));
    }
}
