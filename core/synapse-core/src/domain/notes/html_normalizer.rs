//! Normalizes TipTap (`editor.getHTML()`) rich-text HTML slices into canonical HTML
//! supported losslessly by Desktop Qt's `QTextDocument` rich visual editor.

fn get_attr(tag_open: &str, attr_name: &str) -> Option<String> {
    for q in ['"', '\''] {
        let pat = format!("{}={}", attr_name, q);
        if let Some(pos) = tag_open.find(&pat) {
            let start = pos + pat.len();
            if let Some(end) = tag_open[start..].find(q) {
                return Some(tag_open[start..start + end].to_string());
            }
        }
    }
    None
}

fn is_valid_hex_color(s: &str) -> bool {
    let bytes = s.as_bytes();
    bytes.len() == 7 && bytes[0] == b'#' && bytes[1..].iter().all(|b| b.is_ascii_hexdigit())
}

fn is_safe_rich_href(href: &str) -> bool {
    let trimmed = href.trim();
    if trimmed.is_empty() || trimmed.bytes().any(|b| b.is_ascii_whitespace()) {
        return false;
    }
    let lower = trimmed.to_ascii_lowercase();
    (lower.starts_with("https://") && trimmed.len() > 8)
        || (lower.starts_with("http://") && trimmed.len() > 7)
        || (lower.starts_with("mailto:") && trimmed[7..].contains('@'))
        || lower.starts_with("synapse-page:/")
}

fn clean_table_cell_tag(tag_name: &str, tag_open: &str) -> String {
    let mut out = String::from("<");
    out.push_str(tag_name);
    for span_attr in ["colspan", "rowspan"] {
        if let Some(val) = get_attr(tag_open, span_attr) {
            if let Ok(n) = val.parse::<u32>() {
                if (2..=99).contains(&n) {
                    out.push(' ');
                    out.push_str(span_attr);
                    out.push_str("=\"");
                    out.push_str(&val);
                    out.push('"');
                }
            }
        }
    }
    if let Some(bg) = get_attr(tag_open, "data-bg-color") {
        let clean_bg = bg.trim();
        if clean_bg.starts_with("rgba(") {
            out.push_str(" data-bg-color=\"");
            out.push_str(clean_bg);
            out.push_str("\" style=\"background-color: ");
            out.push_str(clean_bg);
            out.push_str(" !important;\"");
        }
    }
    out.push('>');
    out
}

fn clean_img_tag(tag_open: &str) -> String {
    let Some(src) = get_attr(tag_open, "src") else {
        return String::new();
    };
    let mut out = format!("<img src=\"{}\"", src);
    for dim in ["width", "height"] {
        if let Some(v) = get_attr(tag_open, dim) {
            let digits: String = v.chars().take_while(|c| c.is_ascii_digit()).collect();
            if let Ok(n) = digits.parse::<u32>() {
                if (1..=4096).contains(&n) {
                    out.push_str(&format!(" {}=\"{}\"", dim, n));
                }
            }
        }
    }
    for attr in ["alt", "title", "data-caption"] {
        if let Some(v) = get_attr(tag_open, attr) {
            if !v.is_empty() && v.len() <= 512 {
                out.push_str(&format!(" {}=\"{}\"", attr, v));
            }
        }
    }
    if let Some(align) = get_attr(tag_open, "data-align") {
        if matches!(align.as_str(), "left" | "center" | "right") {
            out.push_str(&format!(" data-align=\"{}\"", align));
        }
    }
    out.push_str("/>");
    out
}

fn strip_colgroup_blocks(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut pos = 0usize;
    let lower = html.to_ascii_lowercase();
    while let Some(rel) = lower[pos..].find("<colgroup") {
        let start = pos + rel;
        out.push_str(&html[pos..start]);
        if let Some(end_rel) = lower[start..].find("</colgroup>") {
            pos = start + end_rel + 11;
        } else if let Some(gt) = lower[start..].find('>') {
            pos = start + gt + 1;
        } else {
            pos = html.len();
        }
    }
    out.push_str(&html[pos..]);
    out
}

fn ensure_table_structure(html: &str) -> String {
    let mut s = html
        .replace("<table><tr>", "<table><tbody><tr>")
        .replace("</tr></table>", "</tr></tbody></table>");
    let mut out = String::with_capacity(s.len() + 32);
    let mut pos = 0usize;
    while let Some(rel) = s[pos..].find("<p>") {
        let p_start = pos + rel;
        out.push_str(&s[pos..p_start]);
        let body_start = p_start + 3;
        if let Some(close_rel) = s[body_start..].find("</p>") {
            let inner = &s[body_start..body_start + close_rel];
            if inner.trim().is_empty() && !inner.contains('<') {
                out.push_str("<p><br/></p>");
            } else {
                let mut plain = String::new();
                let mut in_tag = false;
                for ch in inner.chars() {
                    if ch == '<' {
                        in_tag = true;
                    } else if ch == '>' {
                        in_tag = false;
                    } else if !in_tag {
                        plain.push(ch);
                    }
                }
                let decoded = plain.replace("&nbsp;", " ");
                if decoded.contains("  ") || decoded.starts_with(' ') || decoded.ends_with(' ') {
                    out.push_str("<p style=\"white-space:pre-wrap\">");
                    out.push_str(&inner.replace("&nbsp;", " "));
                    out.push_str("</p>");
                } else {
                    out.push_str("<p>");
                    out.push_str(inner);
                    out.push_str("</p>");
                }
            }
            pos = body_start + close_rel + 4;
        } else {
            out.push_str(&s[p_start..]);
            s = String::new();
            pos = 0;
            break;
        }
    }
    if !s.is_empty() {
        out.push_str(&s[pos..]);
    }
    out.replace("<th></th>", "<th><p></p></th>")
        .replace("<td></td>", "<td><p></p></td>")
        .replace("<th><p><br/></p></th>", "<th><p></p></th>")
        .replace("<td><p><br/></p></td>", "<td><p></p></td>")
}

/// Normalizes a TipTap rich-text HTML fragment for `NotesRichDocument`.
pub fn normalize_tiptap_rich_html(raw_html: &str) -> String {
    if raw_html.trim().is_empty() {
        return "<p><br/></p>".to_string();
    }
    let stripped = strip_colgroup_blocks(raw_html);
    let mut out = String::with_capacity(stripped.len() + 32);
    let mut pos = 0usize;
    let mut in_pre = false;
    let mut blockquote_open_tag: Option<String> = None;
    let mut blockquote_paused = false;
    let mut list_depth = 0usize;
    let mut stripped_anchor_stack = Vec::<bool>::new();
    let mut task_li_depth = 0usize;
    let mut generic_div_stack = Vec::<bool>::new();

    while let Some(rel_lt) = stripped[pos..].find('<') {
        let lt = pos + rel_lt;
        out.push_str(&stripped[pos..lt]);
        let Some(rel_gt) = stripped[lt..].find('>') else {
            out.push_str(&stripped[lt..]);
            pos = stripped.len();
            break;
        };
        let gt = lt + rel_gt + 1;
        let token = &stripped[lt..gt];
        pos = gt;

        if token.starts_with("<!--") {
            continue;
        }
        let is_closing = token.starts_with("</");
        let name_slice = if is_closing { &token[2..] } else { &token[1..] };
        let tag_name = name_slice
            .split(|c: char| c.is_ascii_whitespace() || c == '>' || c == '/')
            .next()
            .unwrap_or("")
            .to_ascii_lowercase();

        if is_closing {
            match tag_name.as_str() {
                "pre" => {
                    in_pre = false;
                    out.push_str("</pre>");
                }
                "span" if in_pre => {}
                "a" => {
                    let was_kept = stripped_anchor_stack.pop().unwrap_or(true);
                    if was_kept {
                        out.push_str("</a>");
                    }
                }
                "li" => {
                    task_li_depth = task_li_depth.saturating_sub(1);
                    out.push_str("</li>");
                }
                "div" => {
                    let was_task_div = generic_div_stack.pop().unwrap_or(false);
                    if was_task_div {
                        out.push_str("</div>");
                    }
                }
                "col" | "colgroup" | "section" | "article" => {}
                "blockquote" => {
                    if !blockquote_paused && blockquote_open_tag.is_some() {
                        out.push_str("</blockquote>");
                    }
                    blockquote_open_tag = None;
                    blockquote_paused = false;
                }
                "ul" | "ol" => {
                    list_depth = list_depth.saturating_sub(1);
                    out.push_str("</");
                    out.push_str(&tag_name);
                    out.push('>');
                }
                "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "strong" | "b" | "em" | "i"
                | "u" | "s" | "strike" | "code" | "mark" | "label" | "table" | "tbody" | "tr"
                | "th" | "td" => {
                    out.push_str("</");
                    out.push_str(&tag_name);
                    out.push('>');
                }
                "thead" => out.push_str("</tbody>"),
                _ => out.push_str(token),
            }
            continue;
        }

        match tag_name.as_str() {
            "br" => out.push_str("<br/>"),
            "hr" => out.push_str("<hr/>"),
            "col" | "section" | "article" => {}
            "thead" => out.push_str("<tbody>"),
            "pre" => {
                if blockquote_open_tag.is_some() && !blockquote_paused {
                    out.push_str("</blockquote>");
                    blockquote_paused = true;
                }
                in_pre = true;
                out.push_str("<pre>");
            }
            "span" if in_pre => {}
            "code" if in_pre => {
                if let Some(cls) = get_attr(token, "class") {
                    if let Some(lang) = cls.split_whitespace().find(|t| t.starts_with("language-")) {
                        out.push_str(&format!("<code class=\"{}\">", lang));
                        continue;
                    }
                }
                out.push_str("<code>");
            }
            "p" => {
                if list_depth == 0 && blockquote_paused {
                    if let Some(ref bq_tag) = blockquote_open_tag {
                        out.push_str(bq_tag);
                    }
                    blockquote_paused = false;
                }
                if get_attr(token, "style").as_deref() == Some("white-space:pre-wrap") {
                    out.push_str("<p style=\"white-space:pre-wrap\">");
                } else {
                    out.push_str("<p>");
                }
            }
            "h1" | "h2" | "h3" | "h4" | "h5" | "h6" => {
                if blockquote_open_tag.is_some() && !blockquote_paused {
                    out.push_str("</blockquote>");
                    blockquote_paused = true;
                }
                out.push('<');
                out.push_str(&tag_name);
                out.push('>');
            }
            "ol" => {
                if list_depth == 0 && blockquote_open_tag.is_some() && !blockquote_paused {
                    out.push_str("</blockquote>");
                    blockquote_paused = true;
                }
                list_depth += 1;
                out.push_str("<ol>");
            }
            "label" | "table" | "tbody" | "tr" | "strong" | "b" | "em" | "i" | "u" | "s"
            | "strike" | "code" => {
                out.push('<');
                out.push_str(&tag_name);
                out.push('>');
            }
            "ul" => {
                if list_depth == 0 && blockquote_open_tag.is_some() && !blockquote_paused {
                    out.push_str("</blockquote>");
                    blockquote_paused = true;
                }
                list_depth += 1;
                if get_attr(token, "data-type").as_deref() == Some("taskList") {
                    out.push_str("<ul data-type=\"taskList\">");
                } else {
                    out.push_str("<ul>");
                }
            }
            "li" => {
                if get_attr(token, "data-type").as_deref() == Some("taskItem") {
                    task_li_depth += 1;
                    let checked = get_attr(token, "data-checked").as_deref() == Some("true");
                    out.push_str(if checked {
                        "<li data-checked=\"true\" data-type=\"taskItem\">"
                    } else {
                        "<li data-checked=\"false\" data-type=\"taskItem\">"
                    });
                } else {
                    out.push_str("<li>");
                }
            }
            "input" => {
                let lower_tok = token.to_ascii_lowercase();
                let is_checked = get_attr(token, "checked").is_some()
                    || lower_tok.contains(" checked>")
                    || lower_tok.contains(" checked/>")
                    || lower_tok.contains(" checked ");
                if is_checked {
                    out.push_str("<input type=\"checkbox\" checked=\"checked\"/>");
                } else {
                    out.push_str("<input type=\"checkbox\"/>");
                }
            }
            "div" => {
                if task_li_depth > 0 {
                    generic_div_stack.push(true);
                    out.push_str("<div>");
                } else {
                    generic_div_stack.push(false);
                }
            }
            "blockquote" => {
                let bq_open = if let Some(color) = get_attr(token, "data-color") {
                    if is_valid_hex_color(&color) {
                        format!("<blockquote data-color=\"{}\">", color.to_ascii_lowercase())
                    } else {
                        "<blockquote>".to_string()
                    }
                } else {
                    "<blockquote>".to_string()
                };
                blockquote_open_tag = Some(bq_open.clone());
                blockquote_paused = false;
                out.push_str(&bq_open);
            }
            "th" | "td" => out.push_str(&clean_table_cell_tag(&tag_name, token)),
            "a" => {
                if let Some(href) = get_attr(token, "href") {
                    if is_safe_rich_href(&href) {
                        stripped_anchor_stack.push(true);
                        let esc = href.replace('&', "&amp;");
                        out.push_str(&format!("<a href=\"{}\">", esc));
                        continue;
                    }
                }
                stripped_anchor_stack.push(false);
            }
            "mark" => {
                let color = get_attr(token, "data-color")
                    .filter(|c| is_valid_hex_color(c))
                    .unwrap_or_else(|| "#eab308".to_string());
                out.push_str(&format!(
                    "<mark data-color=\"{0}\" style=\"background-color:{0};color:inherit\">",
                    color.to_ascii_lowercase()
                ));
            }
            "img" => out.push_str(&clean_img_tag(token)),
            _ => out.push_str(token),
        }
    }
    out.push_str(&stripped[pos..]);
    ensure_table_structure(&out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_tiptap_tables_dividers_tasks_and_empty_paragraphs() {
        let raw = "<p>Linha 1</p><p>   </p><hr class=\"editor-divider\" style=\"margin: 0\"><ul class=\"contains-task-list\" data-type=\"taskList\"><li class=\"task-item\" data-type=\"taskItem\" data-checked=\"true\"><label><input type=\"checkbox\" checked><span></span></label><div><p>Feito</p></div></li></ul><table style=\"min-width: 75px\"><colgroup><col style=\"min-width: 25px\"></colgroup><tbody><tr><th colspan=\"1\" rowspan=\"1\" colwidth=\"180\" data-column-type=\"select\"><p>Coluna</p></th></tr><tr><td></td></tr></tbody></table>";
        let norm = normalize_tiptap_rich_html(raw);
        assert!(norm.contains("<p>Linha 1</p><p><br/></p><hr/>"));
        assert!(norm.contains("<input type=\"checkbox\" checked=\"checked\"/>"));
        assert!(!norm.contains("<colgroup"));
        assert!(!norm.contains("colwidth="));
        assert!(!norm.contains("data-column-type="));
        assert!(norm.contains("<td><p></p></td>"));
    }
}
