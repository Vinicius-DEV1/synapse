//! Normalizes TipTap (`editor.getHTML()`) rich-text HTML slices into canonical HTML
//! supported losslessly by native Desktop Qt & mobile clients while preserving typed schemas.

mod tags;

use tags::{
    clean_img_tag, clean_table_cell_tag, ensure_table_structure, get_attr, is_safe_rich_href,
    is_valid_hex_color, strip_colgroup_blocks,
};

fn safe_css_color(raw: &str) -> Option<String> {
    let value = raw.trim();
    if is_valid_hex_color(value) {
        return Some(value.to_ascii_lowercase());
    }
    let (name, body) = value.split_once('(')?;
    let body = body.strip_suffix(')')?;
    let components: Vec<&str> = body.split(',').map(str::trim).collect();
    match (
        name.trim().to_ascii_lowercase().as_str(),
        components.as_slice(),
    ) {
        ("rgb", [red, green, blue]) => {
            let values: Option<Vec<u16>> = [*red, *green, *blue]
                .into_iter()
                .map(|component| component.parse::<u16>().ok())
                .collect();
            let values = values?;
            if values.iter().any(|component| *component > 255) {
                return None;
            }
            Some(format!("rgb({},{},{})", values[0], values[1], values[2]))
        }
        ("rgba", [red, green, blue, alpha]) => {
            let values: Option<Vec<u16>> = [*red, *green, *blue]
                .into_iter()
                .map(|component| component.parse::<u16>().ok())
                .collect();
            let values = values?;
            let alpha = alpha.parse::<f32>().ok()?;
            if values.iter().any(|component| *component > 255)
                || !alpha.is_finite()
                || !(0.0..=1.0).contains(&alpha)
            {
                return None;
            }
            Some(format!(
                "rgba({},{},{},{})",
                values[0], values[1], values[2], alpha
            ))
        }
        _ => None,
    }
}

fn normalized_block_style(raw: Option<String>) -> Option<String> {
    let mut white_space = false;
    let mut color = None;
    let mut background = None;
    for declaration in raw.as_deref().unwrap_or_default().split(';') {
        let Some((property, value)) = declaration.split_once(':') else {
            continue;
        };
        match property.trim().to_ascii_lowercase().as_str() {
            "white-space" if value.trim() == "pre-wrap" => white_space = true,
            "color" => color = safe_css_color(value),
            "background-color" => background = safe_css_color(value),
            _ => {}
        }
    }
    let mut declarations = Vec::new();
    if white_space {
        declarations.push("white-space:pre-wrap".to_string());
    }
    if let Some(color) = color {
        declarations.push(format!("color:{}", color));
    }
    if let Some(background) = background {
        declarations.push(format!("background-color:{}", background));
    }
    if declarations.is_empty() {
        None
    } else {
        Some(declarations.join(";"))
    }
}

fn normalized_inline_color(raw: Option<&str>) -> Option<String> {
    raw?.split(';').find_map(|declaration| {
        let (property, value) = declaration.split_once(':')?;
        property
            .trim()
            .eq_ignore_ascii_case("color")
            .then(|| safe_css_color(value))
            .flatten()
    })
}

fn normalized_inline_background(raw: Option<&str>) -> Option<String> {
    raw?.split(';').find_map(|declaration| {
        let (property, value) = declaration.split_once(':')?;
        property
            .trim()
            .eq_ignore_ascii_case("background-color")
            .then(|| safe_css_color(value))
            .flatten()
    })
}

fn block_open_tag(tag: &str, style: Option<String>, attributes: Option<&str>) -> String {
    let mut output = format!("<{}", tag);
    if let Some(attributes) = attributes {
        output.push_str(attributes);
    }
    if let Some(style) = style {
        output.push_str(&format!(" style=\"{}\"", style));
    }
    output.push('>');
    output
}

/// Normalizes a TipTap rich-text HTML fragment while preserving typed table column schemas & widths.
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
                    if stripped_anchor_stack.pop().unwrap_or(true) {
                        out.push_str("</a>");
                    }
                }
                "li" => {
                    task_li_depth = task_li_depth.saturating_sub(1);
                    out.push_str("</li>");
                }
                "div" => {
                    if generic_div_stack.pop().unwrap_or(false) {
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
                    out.push_str(&format!("</{}>", tag_name));
                }
                "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "strong" | "b" | "em" | "i"
                | "u" | "s" | "strike" | "code" | "mark" | "label" | "table" | "tbody" | "tr"
                | "th" | "td" => out.push_str(&format!("</{}>", tag_name)),
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
                if let Some(lang) = get_attr(token, "class").and_then(|c| {
                    c.split_whitespace()
                        .find(|t| t.starts_with("language-"))
                        .map(str::to_owned)
                }) {
                    out.push_str(&format!("<code class=\"{}\">", lang));
                } else {
                    out.push_str("<code>");
                }
            }
            "p" => {
                if list_depth == 0 && blockquote_paused {
                    if let Some(ref bq_tag) = blockquote_open_tag {
                        out.push_str(bq_tag);
                    }
                    blockquote_paused = false;
                }
                out.push_str(&block_open_tag(
                    "p",
                    normalized_block_style(get_attr(token, "style")),
                    None,
                ));
            }
            "h1" | "h2" | "h3" | "h4" | "h5" | "h6" => {
                if blockquote_open_tag.is_some() && !blockquote_paused {
                    out.push_str("</blockquote>");
                    blockquote_paused = true;
                }
                out.push_str(&block_open_tag(
                    &tag_name,
                    normalized_block_style(get_attr(token, "style")),
                    None,
                ));
            }
            "ol" => {
                if list_depth == 0 && blockquote_open_tag.is_some() && !blockquote_paused {
                    out.push_str("</blockquote>");
                    blockquote_paused = true;
                }
                list_depth += 1;
                out.push_str(&block_open_tag(
                    "ol",
                    normalized_block_style(get_attr(token, "style")),
                    None,
                ));
            }
            "label" | "table" | "tbody" | "tr" | "strong" | "b" | "em" | "i" | "u" | "s"
            | "strike" | "code" => out.push_str(&format!("<{}>", tag_name)),
            "span" => {
                if let Some(color) = normalized_inline_color(get_attr(token, "style").as_deref()) {
                    out.push_str(&format!("<span style=\"color:{}\">", color));
                } else {
                    out.push_str("<span>");
                }
            }
            "ul" => {
                if list_depth == 0 && blockquote_open_tag.is_some() && !blockquote_paused {
                    out.push_str("</blockquote>");
                    blockquote_paused = true;
                }
                list_depth += 1;
                if get_attr(token, "data-type").as_deref() == Some("taskList") {
                    out.push_str(&block_open_tag(
                        "ul",
                        normalized_block_style(get_attr(token, "style")),
                        Some(" data-type=\"taskList\""),
                    ));
                } else {
                    out.push_str(&block_open_tag(
                        "ul",
                        normalized_block_style(get_attr(token, "style")),
                        None,
                    ));
                }
            }
            "li" => {
                if get_attr(token, "data-type").as_deref() == Some("taskItem") {
                    task_li_depth += 1;
                    let checked = get_attr(token, "data-checked").as_deref() == Some("true");
                    let attributes = if checked {
                        " data-checked=\"true\" data-type=\"taskItem\""
                    } else {
                        " data-checked=\"false\" data-type=\"taskItem\""
                    };
                    out.push_str(&block_open_tag(
                        "li",
                        normalized_block_style(get_attr(token, "style")),
                        Some(attributes),
                    ));
                } else {
                    out.push_str(&block_open_tag(
                        "li",
                        normalized_block_style(get_attr(token, "style")),
                        None,
                    ));
                }
            }
            "input" => {
                let lower_tok = token.to_ascii_lowercase();
                let is_checked = get_attr(token, "checked").is_some()
                    || lower_tok.contains(" checked>")
                    || lower_tok.contains(" checked/>")
                    || lower_tok.contains(" checked ");
                out.push_str(if is_checked {
                    "<input type=\"checkbox\" checked=\"checked\"/>"
                } else {
                    "<input type=\"checkbox\"/>"
                });
            }
            "div" => {
                let keep = task_li_depth > 0;
                generic_div_stack.push(keep);
                if keep {
                    out.push_str("<div>");
                }
            }
            "blockquote" => {
                let bq_open = match get_attr(token, "data-color").filter(|c| is_valid_hex_color(c))
                {
                    Some(color) => {
                        format!("<blockquote data-color=\"{}\">", color.to_ascii_lowercase())
                    }
                    None => "<blockquote>".to_string(),
                };
                blockquote_open_tag = Some(bq_open.clone());
                blockquote_paused = false;
                out.push_str(&bq_open);
            }
            "th" | "td" => out.push_str(&clean_table_cell_tag(&tag_name, token)),
            "a" => {
                if let Some(href) = get_attr(token, "href").filter(|h| is_safe_rich_href(h)) {
                    stripped_anchor_stack.push(true);
                    out.push_str(&format!("<a href=\"{}\">", href.replace('&', "&amp;")));
                } else {
                    stripped_anchor_stack.push(false);
                }
            }
            "mark" => {
                let color = get_attr(token, "data-color")
                    .and_then(|value| safe_css_color(&value))
                    .or_else(|| normalized_inline_background(get_attr(token, "style").as_deref()))
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
    fn preserves_tiptap_column_schemas_and_colwidths() {
        let raw = "<p>Linha 1</p><p>   </p><hr class=\"editor-divider\" style=\"margin: 0\"><ul class=\"contains-task-list\" data-type=\"taskList\"><li class=\"task-item\" data-type=\"taskItem\" data-checked=\"true\"><label><input type=\"checkbox\" checked><span></span></label><div><p>Feito</p></div></li></ul><table style=\"min-width: 75px\"><colgroup><col style=\"min-width: 25px\"></colgroup><tbody><tr><th colspan=\"1\" rowspan=\"1\" colwidth=\"180\" data-column-type=\"select\" data-column-options=\"A,B\"><p>Coluna</p></th><th data-column-type=\"number\" data-number-format=\"currency\"><p>Valor</p></th></tr><tr><td></td><td></td></tr></tbody></table>";
        let norm = normalize_tiptap_rich_html(raw);
        assert!(norm.contains("<p>Linha 1</p><p><br/></p><hr/>"));
        assert!(norm.contains("<input type=\"checkbox\" checked=\"checked\"/>"));
        assert!(!norm.contains("<colgroup"));
        assert!(norm.contains("colwidth=\"180\""));
        assert!(norm.contains("data-column-type=\"select\""));
        assert!(norm.contains("data-column-options=\"A,B\""));
        assert!(norm.contains("data-number-format=\"currency\""));
        assert!(norm.contains("<td><p></p></td>"));
    }
}
