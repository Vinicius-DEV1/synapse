//! Low-level HTML tag sanitizers and structure guards for TipTap rich-text fragments.

pub(super) fn get_attr(tag_open: &str, attr_name: &str) -> Option<String> {
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

pub(super) fn is_valid_hex_color(s: &str) -> bool {
    let bytes = s.as_bytes();
    bytes.len() == 7 && bytes[0] == b'#' && bytes[1..].iter().all(|b| b.is_ascii_hexdigit())
}

pub(super) fn is_safe_rich_href(href: &str) -> bool {
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

fn escape_double_quoted(val: &str) -> String {
    val.replace('"', "&quot;")
}

/// Sanitizes `<th>` / `<td>` tags while preserving TipTap column schemas, widths, spans, and cell colors.
pub(super) fn clean_table_cell_tag(tag_name: &str, tag_open: &str) -> String {
    let mut out = String::from("<");
    out.push_str(tag_name);
    for span_attr in ["colspan", "rowspan"] {
        if let Some(val) = get_attr(tag_open, span_attr) {
            if let Ok(n) = val.parse::<u32>() {
                if (2..=99).contains(&n) {
                    out.push_str(&format!(" {}=\"{}\"", span_attr, n));
                }
            }
        }
    }
    if let Some(cw) = get_attr(tag_open, "colwidth") {
        let cleaned: String = cw
            .chars()
            .filter(|c| c.is_ascii_digit() || *c == ',')
            .collect();
        if !cleaned.is_empty() && cleaned.len() <= 64 {
            out.push_str(&format!(" colwidth=\"{}\"", cleaned));
        }
    }
    if let Some(col_type) = get_attr(tag_open, "data-column-type") {
        let normalized = col_type.trim().to_ascii_lowercase();
        if matches!(
            normalized.as_str(),
            "text" | "number" | "select" | "date" | "checkbox"
        ) {
            out.push_str(&format!(" data-column-type=\"{}\"", normalized));
        }
    }
    if let Some(opts) = get_attr(tag_open, "data-column-options") {
        let trimmed = opts.trim();
        if !trimmed.is_empty() && trimmed.len() <= 4096 {
            out.push_str(&format!(
                " data-column-options=\"{}\"",
                escape_double_quoted(trimmed)
            ));
        }
    }
    if let Some(num_fmt) = get_attr(tag_open, "data-number-format") {
        let normalized = num_fmt.trim().to_ascii_lowercase();
        if matches!(
            normalized.as_str(),
            "integer" | "decimal" | "currency" | "percent"
        ) {
            out.push_str(&format!(" data-number-format=\"{}\"", normalized));
        }
    }
    if let Some(date_fmt) = get_attr(tag_open, "data-date-format") {
        let trimmed = date_fmt.trim();
        if matches!(trimmed, "DD/MM/YYYY" | "YYYY-MM-DD" | "relative") {
            out.push_str(&format!(" data-date-format=\"{}\"", trimmed));
        }
    }
    if let Some(bg) = get_attr(tag_open, "data-bg-color") {
        let clean_bg = bg.trim();
        if clean_bg.starts_with("rgba(") && clean_bg.ends_with(')') && clean_bg.len() <= 64 {
            out.push_str(&format!(
                " data-bg-color=\"{0}\" style=\"background-color: {0} !important;\"",
                clean_bg
            ));
        }
    }
    out.push('>');
    out
}

pub(super) fn clean_img_tag(tag_open: &str) -> String {
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
                out.push_str(&format!(" {}=\"{}\"", attr, escape_double_quoted(&v)));
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

pub(super) fn strip_colgroup_blocks(html: &str) -> String {
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

pub(super) fn ensure_table_structure(html: &str) -> String {
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
                    match ch {
                        '<' => in_tag = true,
                        '>' => in_tag = false,
                        _ if !in_tag => plain.push(ch),
                        _ => {}
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
