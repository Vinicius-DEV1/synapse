//! Canonical table column schema, cell validation, filter evaluation, and structural moves.
//! Single Source of Truth for typed table columns (`text`, `number`, `date`, `select`, `checkbox`).

mod filters;
#[cfg(test)]
mod tests;

pub use filters::ColumnFilter;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TableColumnConfig {
    pub index: usize,
    pub col_type: String,
    pub options: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub number_format: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date_format: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TableCellValidation {
    pub row: usize,
    pub col: usize,
    pub valid: bool,
    pub col_type: String,
}

fn extract_attr(tag_open: &str, name: &str) -> Option<String> {
    for quote in ['"', '\''] {
        let needle = format!("{}={}", name, quote);
        if let Some(pos) = tag_open.find(&needle) {
            let after = &tag_open[pos + needle.len()..];
            if let Some(end) = after.find(quote) {
                return Some(
                    after[..end]
                        .replace("&quot;", "\"")
                        .replace("&amp;", "&")
                        .replace("&lt;", "<")
                        .replace("&gt;", ">"),
                );
            }
        }
    }
    None
}

pub(super) fn strip_html_tags(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut in_tag = false;
    for ch in s.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    super::block_ast::helpers::html_unescape(&out)
        .replace('\u{00a0}', " ")
        .trim()
        .to_string()
}

fn parse_select_options(raw: Option<&str>) -> Vec<String> {
    let Some(r) = raw else { return Vec::new() };
    let trimmed = r.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }
    if trimmed.starts_with('[') {
        if let Ok(vec) = serde_json::from_str::<Vec<String>>(trimmed) {
            return vec;
        }
    }
    trimmed
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

pub(super) fn split_rows(table_html: &str) -> Vec<(usize, usize, String)> {
    let lower = table_html.to_ascii_lowercase();
    let mut rows = Vec::new();
    let mut pos = 0usize;
    while let Some(rel_start) = lower[pos..].find("<tr") {
        let start = pos + rel_start;
        let Some(rel_end) = lower[start..].find("</tr>") else {
            break;
        };
        let end = start + rel_end + 5;
        rows.push((start, end, table_html[start..end].to_string()));
        pos = end;
    }
    rows
}

pub(super) fn split_cells(row_html: &str) -> Vec<(usize, usize, String, String)> {
    let lower = row_html.to_ascii_lowercase();
    let mut cells = Vec::new();
    let mut pos = 0usize;
    while pos < lower.len() {
        let th_pos = lower[pos..].find("<th").map(|p| (pos + p, "th"));
        let td_pos = lower[pos..].find("<td").map(|p| (pos + p, "td"));
        let next = match (th_pos, td_pos) {
            (Some(a), Some(b)) => {
                if a.0 <= b.0 {
                    Some(a)
                } else {
                    Some(b)
                }
            }
            (Some(a), None) => Some(a),
            (None, Some(b)) => Some(b),
            (None, None) => None,
        };
        let Some((start, tag)) = next else { break };
        let close_tag = format!("</{}>", tag);
        let Some(rel_gt) = lower[start..].find('>') else {
            break;
        };
        let open_end = start + rel_gt + 1;
        let Some(rel_close) = lower[open_end..].find(&close_tag) else {
            break;
        };
        let end = open_end + rel_close + close_tag.len();
        cells.push((
            start,
            end,
            row_html[start..open_end].to_string(),
            row_html[open_end..open_end + rel_close].to_string(),
        ));
        pos = end;
    }
    cells
}

fn is_tag_boundary(byte: Option<u8>) -> bool {
    matches!(
        byte,
        None | Some(b'>') | Some(b'/') | Some(b' ') | Some(b'\t') | Some(b'\n') | Some(b'\r')
    )
}

fn find_table_range_at(html: &str, table_index: usize) -> Option<(usize, usize)> {
    let lower = html.to_ascii_lowercase();
    let mut search_from = 0usize;
    let mut found_index = 0usize;
    let start = loop {
        let relative_start = lower[search_from..].find("<table")?;
        let candidate = search_from + relative_start;
        search_from = candidate + 6;
        if !is_tag_boundary(lower.as_bytes().get(candidate + 6).copied()) {
            continue;
        }
        if found_index == table_index {
            break candidate;
        }
        found_index += 1;
    };

    let open_end = start + lower[start..].find('>')? + 1;
    let mut depth = 1usize;
    let mut cursor = open_end;
    while depth > 0 {
        let next_open = lower[cursor..].find("<table").map(|offset| cursor + offset);
        let next_close = lower[cursor..]
            .find("</table")
            .map(|offset| cursor + offset);
        match (next_open, next_close) {
            (_, None) => return None,
            (Some(open), Some(close)) if open < close => {
                if is_tag_boundary(lower.as_bytes().get(open + 6).copied()) {
                    depth += 1;
                }
                cursor = open + 6;
            }
            (_, Some(close)) => {
                if !is_tag_boundary(lower.as_bytes().get(close + 7).copied()) {
                    cursor = close + 7;
                    continue;
                }
                let close_end = close + lower[close..].find('>')? + 1;
                depth -= 1;
                cursor = close_end;
                if depth == 0 {
                    return Some((start, close_end));
                }
            }
        }
    }
    None
}

fn extract_table_at(html: &str, table_index: usize) -> Option<&str> {
    let (start, end) = find_table_range_at(html, table_index)?;
    html.get(start..end)
}

fn replace_table_at<F>(html: &str, table_index: usize, update: F) -> String
where
    F: FnOnce(&str) -> String,
{
    let Some((start, end)) = find_table_range_at(html, table_index) else {
        return html.to_string();
    };
    let updated_table = update(&html[start..end]);
    let mut output = String::with_capacity(html.len() + updated_table.len());
    output.push_str(&html[..start]);
    output.push_str(&updated_table);
    output.push_str(&html[end..]);
    output
}

fn filter_rows_in_table(table_html: &str, visible_rows: &[usize]) -> String {
    let visible_rows: std::collections::HashSet<usize> = visible_rows.iter().copied().collect();
    let rows = split_rows(table_html);
    let mut output = String::with_capacity(table_html.len());
    let mut cursor = 0usize;
    for (row_index, (start, end, _)) in rows.iter().enumerate() {
        output.push_str(&table_html[cursor..*start]);
        if row_index == 0 || visible_rows.contains(&row_index) {
            output.push_str(&table_html[*start..*end]);
        }
        cursor = *end;
    }
    output.push_str(&table_html[cursor..]);
    output
}

fn escape_attribute_value(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn replace_open_tag_attribute(tag: &str, target_name: &str, value: Option<&str>) -> String {
    let Some(tag_end) = tag.find('>') else {
        return tag.to_string();
    };
    let mut name_end = 1usize;
    while name_end < tag_end
        && !tag.as_bytes()[name_end].is_ascii_whitespace()
        && tag.as_bytes()[name_end] != b'/'
    {
        name_end += 1;
    }
    let mut output = tag[..name_end].to_string();
    let mut cursor = name_end;
    while cursor < tag_end {
        let segment_start = cursor;
        while cursor < tag_end && tag.as_bytes()[cursor].is_ascii_whitespace() {
            cursor += 1;
        }
        if cursor >= tag_end || tag.as_bytes()[cursor] == b'/' {
            break;
        }
        let attr_start = cursor;
        while cursor < tag_end
            && !tag.as_bytes()[cursor].is_ascii_whitespace()
            && tag.as_bytes()[cursor] != b'='
            && tag.as_bytes()[cursor] != b'/'
        {
            cursor += 1;
        }
        let attr_name = &tag[attr_start..cursor];
        while cursor < tag_end && tag.as_bytes()[cursor].is_ascii_whitespace() {
            cursor += 1;
        }
        if cursor < tag_end && tag.as_bytes()[cursor] == b'=' {
            cursor += 1;
            while cursor < tag_end && tag.as_bytes()[cursor].is_ascii_whitespace() {
                cursor += 1;
            }
            if cursor < tag_end && matches!(tag.as_bytes()[cursor], b'\'' | b'"') {
                let quote = tag.as_bytes()[cursor];
                cursor += 1;
                while cursor < tag_end && tag.as_bytes()[cursor] != quote {
                    cursor += 1;
                }
                if cursor < tag_end {
                    cursor += 1;
                }
            } else {
                while cursor < tag_end && !tag.as_bytes()[cursor].is_ascii_whitespace() {
                    cursor += 1;
                }
            }
        }
        if !attr_name.eq_ignore_ascii_case(target_name) {
            output.push_str(&tag[segment_start..cursor]);
        }
    }
    if let Some(value) = value {
        output.push(' ');
        output.push_str(target_name);
        output.push_str("=\"");
        output.push_str(&escape_attribute_value(value));
        output.push('"');
    }
    output.push('>');
    output
}

fn replace_column_header_attribute(
    table_html: &str,
    column_index: usize,
    name: &str,
    value: Option<&str>,
) -> String {
    let rows = split_rows(table_html);
    let Some((row_start, row_end, header_row)) = rows.first() else {
        return table_html.to_string();
    };
    let cells = split_cells(header_row);
    let Some((cell_start, _, tag_open, _)) = cells.get(column_index) else {
        return table_html.to_string();
    };
    if !tag_open
        .trim_start_matches('<')
        .get(..2)
        .is_some_and(|tag| tag.eq_ignore_ascii_case("th"))
    {
        return table_html.to_string();
    }
    let updated_tag = replace_open_tag_attribute(tag_open, name, value);
    let mut updated_row = String::with_capacity(header_row.len() + updated_tag.len());
    updated_row.push_str(&header_row[..*cell_start]);
    updated_row.push_str(&updated_tag);
    updated_row.push_str(&header_row[*cell_start + tag_open.len()..]);
    let mut output = String::with_capacity(table_html.len() + updated_row.len());
    output.push_str(&table_html[..*row_start]);
    output.push_str(&updated_row);
    output.push_str(&table_html[*row_end..]);
    output
}

pub fn parse_table_columns(table_html: &str) -> Vec<TableColumnConfig> {
    let rows = split_rows(table_html);
    let Some((_, _, first_row)) = rows.first() else {
        return Vec::new();
    };
    split_cells(first_row)
        .into_iter()
        .enumerate()
        .map(|(idx, (_, _, tag_open, _))| {
            let col_type =
                extract_attr(&tag_open, "data-column-type").unwrap_or_else(|| "text".to_string());
            let opts_raw = extract_attr(&tag_open, "data-column-options");
            TableColumnConfig {
                index: idx,
                col_type,
                options: parse_select_options(opts_raw.as_deref()),
                number_format: extract_attr(&tag_open, "data-number-format"),
                date_format: extract_attr(&tag_open, "data-date-format"),
            }
        })
        .collect()
}

pub fn parse_table_columns_at(note_html: &str, table_index: usize) -> Vec<TableColumnConfig> {
    extract_table_at(note_html, table_index)
        .map(parse_table_columns)
        .unwrap_or_default()
}

pub fn update_table_column_schema_at(
    note_html: &str,
    table_index: usize,
    column_index: usize,
    column_type: &str,
    options_json: &str,
    number_format: &str,
    date_format: &str,
) -> String {
    let allowed_types = ["text", "number", "date", "select", "checkbox"];
    let safe_type = if allowed_types.contains(&column_type) {
        column_type
    } else {
        "text"
    };
    let options = serde_json::from_str::<Vec<String>>(options_json).unwrap_or_default();
    let serialized_options = serde_json::to_string(&options).unwrap_or_else(|_| "[]".to_string());
    replace_table_at(note_html, table_index, |table| {
        let mut updated = replace_column_header_attribute(
            table,
            column_index,
            "data-column-type",
            Some(safe_type),
        );
        let options_value = if safe_type == "select" && !options.is_empty() {
            Some(serialized_options.as_str())
        } else {
            None
        };
        updated = replace_column_header_attribute(
            &updated,
            column_index,
            "data-column-options",
            options_value,
        );
        let number_value = if safe_type == "number" && !number_format.trim().is_empty() {
            Some(number_format.trim())
        } else {
            None
        };
        updated = replace_column_header_attribute(
            &updated,
            column_index,
            "data-number-format",
            number_value,
        );
        let date_value = if safe_type == "date" && !date_format.trim().is_empty() {
            Some(date_format.trim())
        } else {
            None
        };
        replace_column_header_attribute(&updated, column_index, "data-date-format", date_value)
    })
}

pub fn update_table_column_width_at(
    note_html: &str,
    table_index: usize,
    column_index: usize,
    width_px: usize,
) -> String {
    let width = width_px.max(48).to_string();
    replace_table_at(note_html, table_index, |table| {
        replace_column_header_attribute(table, column_index, "colwidth", Some(&width))
    })
}

pub fn validate_cell_value(value: &str, col_type: &str, options: &[String]) -> bool {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return true;
    }
    match col_type {
        "number" => trimmed
            .replace(['$', '€', '£', 'R', ' '], "")
            .replace('%', "")
            .replace(',', ".")
            .parse::<f64>()
            .is_ok(),
        "date" => {
            let b = trimmed.as_bytes();
            let iso = b.len() >= 10 && b[4] == b'-' && b[7] == b'-';
            let br = b.len() == 10 && b[2] == b'/' && b[5] == b'/';
            iso || br
        }
        "select" => options.is_empty() || options.iter().any(|o| o == trimmed),
        "checkbox" => matches!(
            trimmed.to_ascii_lowercase().as_str(),
            "true" | "false" | "1" | "0" | "x" | "✓" | "☑" | "sim" | "não" | "nao" | "yes" | "no"
        ),
        _ => true,
    }
}

pub fn validate_table_cells(table_html: &str) -> Vec<TableCellValidation> {
    let configs = parse_table_columns(table_html);
    let rows = split_rows(table_html);
    let mut out = Vec::new();
    for (row_idx, (_, _, row_html)) in rows.iter().enumerate().skip(1) {
        for (col_idx, (_, _, _, inner)) in split_cells(row_html).iter().enumerate() {
            let cfg = configs.get(col_idx);
            let col_type = cfg.map(|c| c.col_type.as_str()).unwrap_or("text");
            if col_type == "text" {
                continue;
            }
            let opts = cfg.map(|c| c.options.as_slice()).unwrap_or(&[]);
            let plain = strip_html_tags(inner);
            out.push(TableCellValidation {
                row: row_idx,
                col: col_idx,
                valid: validate_cell_value(&plain, col_type, opts),
                col_type: col_type.to_string(),
            });
        }
    }
    out
}

pub fn validate_table_cells_at(note_html: &str, table_index: usize) -> Vec<TableCellValidation> {
    extract_table_at(note_html, table_index)
        .map(validate_table_cells)
        .unwrap_or_default()
}

pub fn evaluate_table_filter(table_html: &str, filters_json: &str) -> Vec<usize> {
    let col_types: Vec<String> = parse_table_columns(table_html)
        .into_iter()
        .map(|c| c.col_type)
        .collect();
    filters::evaluate_table_filter_with_types(table_html, filters_json, &col_types)
}

pub fn evaluate_table_filter_at(
    note_html: &str,
    table_index: usize,
    filters_json: &str,
) -> Vec<usize> {
    extract_table_at(note_html, table_index)
        .map(|table| evaluate_table_filter(table, filters_json))
        .unwrap_or_default()
}

/// Returns an editor-only filtered projection while preserving all other tables and note markup.
pub fn filter_table_rows_for_view(
    note_html: &str,
    table_index: usize,
    filters_json: &str,
) -> (String, usize) {
    let Some(table) = extract_table_at(note_html, table_index) else {
        return (note_html.to_string(), 0);
    };
    let visible_rows = evaluate_table_filter(table, filters_json);
    let visible_count = visible_rows.len();
    let filtered_html = filter_rows_in_table(table, &visible_rows);
    (
        replace_table_at(note_html, table_index, |_| filtered_html),
        visible_count,
    )
}

/// Moves a column across every row in a simple table (preserving header attributes and cell formatting).
pub fn move_table_column(table_html: &str, from_col: usize, to_col: usize) -> String {
    if from_col == to_col {
        return table_html.to_string();
    }
    let rows = split_rows(table_html);
    if rows.is_empty() {
        return table_html.to_string();
    }
    let expected_columns = split_cells(&rows[0].2).len();
    if expected_columns == 0
        || rows.iter().any(|(_, _, row_html)| {
            let cells = split_cells(row_html);
            cells.len() != expected_columns
                || cells.iter().any(|(_, _, tag_open, _)| {
                    ["colspan", "rowspan"].iter().any(|attribute| {
                        extract_attr(tag_open, attribute)
                            .and_then(|value| value.parse::<usize>().ok())
                            .is_some_and(|span| span > 1)
                    })
                })
        })
    {
        return table_html.to_string();
    }
    let mut out = String::with_capacity(table_html.len());
    let mut pos = 0usize;
    for (row_start, row_end, row_html) in rows {
        out.push_str(&table_html[pos..row_start]);
        let cells = split_cells(&row_html);
        if from_col < cells.len() && to_col < cells.len() {
            let mut reordered: Vec<String> = cells
                .iter()
                .map(|(s, e, _, _)| row_html[*s..*e].to_string())
                .collect();
            let item = reordered.remove(from_col);
            reordered.insert(to_col, item);
            let Some(open_end) = row_html.find('>').map(|index| index + 1) else {
                out.push_str(&row_html);
                pos = row_end;
                continue;
            };
            out.push_str(&row_html[..open_end]);
            for cell in reordered {
                out.push_str(&cell);
            }
            let last_cell_end = cells.last().map(|(_, end, _, _)| *end).unwrap_or(open_end);
            out.push_str(&row_html[last_cell_end..]);
        } else {
            out.push_str(&row_html);
        }
        pos = row_end;
    }
    out.push_str(&table_html[pos..]);
    out
}

pub fn move_table_column_at(
    note_html: &str,
    table_index: usize,
    from_col: usize,
    to_col: usize,
) -> String {
    replace_table_at(note_html, table_index, |table| {
        move_table_column(table, from_col, to_col)
    })
}

/// Moves a data row (`row >= 1`) within a table without moving row `0` header.
pub fn move_table_row(table_html: &str, from_row: usize, to_row: usize) -> String {
    if from_row == 0 || to_row == 0 || from_row == to_row {
        return table_html.to_string();
    }
    let rows = split_rows(table_html);
    if from_row >= rows.len() || to_row >= rows.len() {
        return table_html.to_string();
    }
    if rows.iter().any(|(_, _, row_html)| {
        split_cells(row_html).iter().any(|(_, _, tag_open, _)| {
            extract_attr(tag_open, "rowspan")
                .and_then(|value| value.parse::<usize>().ok())
                .is_some_and(|span| span > 1)
        })
    }) {
        return table_html.to_string();
    }
    let first_start = rows[0].0;
    let last_end = rows.last().map(|r| r.1).unwrap_or(first_start);
    let mut slices: Vec<String> = rows.into_iter().map(|(_, _, html)| html).collect();
    let moved = slices.remove(from_row);
    slices.insert(to_row, moved);
    let mut out = String::with_capacity(table_html.len());
    out.push_str(&table_html[..first_start]);
    for row in slices {
        out.push_str(&row);
    }
    out.push_str(&table_html[last_end..]);
    out
}

pub fn move_table_row_at(
    note_html: &str,
    table_index: usize,
    from_row: usize,
    to_row: usize,
) -> String {
    replace_table_at(note_html, table_index, |table| {
        move_table_row(table, from_row, to_row)
    })
}
