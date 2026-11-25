//! Filter evaluation engine supporting all 13+ typed column operators and range bounds.

use serde::Deserialize;

use super::{split_cells, split_rows, strip_html_tags};

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ColumnFilter {
    pub column_index: usize,
    pub operator: String,
    pub value: String,
    #[serde(default)]
    pub value2: Option<String>,
}

fn parse_number(raw: &str) -> Option<f64> {
    let cleaned = raw
        .trim()
        .replace(['$', '€', '£', 'R', ' '], "")
        .replace('%', "")
        .replace(',', ".");
    cleaned.parse::<f64>().ok()
}

/// Normalizes ISO (`YYYY-MM-DD`) or BR (`DD/MM/YYYY`) date strings into `YYYYMMDD` integers for ordering.
fn parse_date_int(raw: &str) -> Option<i32> {
    let t = raw.trim();
    if t.len() >= 10 {
        let bytes = t.as_bytes();
        if bytes[4] == b'-' && bytes[7] == b'-' {
            let y: i32 = t[0..4].parse().ok()?;
            let m: i32 = t[5..7].parse().ok()?;
            let d: i32 = t[8..10].parse().ok()?;
            return Some(y * 10000 + m * 100 + d);
        }
        if t.len() == 10 && bytes[2] == b'/' && bytes[5] == b'/' {
            let d: i32 = t[0..2].parse().ok()?;
            let m: i32 = t[3..5].parse().ok()?;
            let y: i32 = t[6..10].parse().ok()?;
            return Some(y * 10000 + m * 100 + d);
        }
    }
    None
}

fn parse_checkbox_bool(raw: &str) -> bool {
    matches!(
        raw.trim().to_ascii_lowercase().as_str(),
        "true" | "1" | "x" | "✓" | "☑" | "sim" | "yes" | "checked"
    )
}

pub fn matches_filter(cell_text: &str, col_type: &str, f: &ColumnFilter) -> bool {
    let trimmed = cell_text.trim();
    let t_lower = trimmed.to_ascii_lowercase();
    let q_trimmed = f.value.trim();
    let q_lower = q_trimmed.to_ascii_lowercase();
    let q2_trimmed = f.value2.as_deref().unwrap_or("").trim();

    match f.operator.as_str() {
        "empty" => trimmed.is_empty(),
        "not_empty" => !trimmed.is_empty(),
        "contains" => t_lower.contains(&q_lower),
        "not_contains" => !t_lower.contains(&q_lower),
        "is" => trimmed.eq_ignore_ascii_case(q_trimmed),
        "is_not" => !trimmed.eq_ignore_ascii_case(q_trimmed),
        "equals" => match col_type {
            "checkbox" => parse_checkbox_bool(trimmed) == parse_checkbox_bool(q_trimmed),
            "number" => match (parse_number(trimmed), parse_number(q_trimmed)) {
                (Some(a), Some(b)) => (a - b).abs() < 1e-9,
                _ => t_lower == q_lower,
            },
            "date" => match (parse_date_int(trimmed), parse_date_int(q_trimmed)) {
                (Some(a), Some(b)) => a == b,
                _ => t_lower == q_lower,
            },
            _ => t_lower == q_lower,
        },
        "not_equals" => match col_type {
            "number" => match (parse_number(trimmed), parse_number(q_trimmed)) {
                (Some(a), Some(b)) => (a - b).abs() >= 1e-9,
                _ => t_lower != q_lower,
            },
            _ => t_lower != q_lower,
        },
        "gt" => match (parse_number(trimmed), parse_number(q_trimmed)) {
            (Some(a), Some(b)) => a > b,
            _ => false,
        },
        "gte" => match (parse_number(trimmed), parse_number(q_trimmed)) {
            (Some(a), Some(b)) => a >= b,
            _ => false,
        },
        "lt" => match (parse_number(trimmed), parse_number(q_trimmed)) {
            (Some(a), Some(b)) => a < b,
            _ => false,
        },
        "lte" => match (parse_number(trimmed), parse_number(q_trimmed)) {
            (Some(a), Some(b)) => a <= b,
            _ => false,
        },
        "before" => match (parse_date_int(trimmed), parse_date_int(q_trimmed)) {
            (Some(a), Some(b)) => a < b,
            _ => false,
        },
        "after" => match (parse_date_int(trimmed), parse_date_int(q_trimmed)) {
            (Some(a), Some(b)) => a > b,
            _ => false,
        },
        "between" => {
            if col_type == "date" {
                match (
                    parse_date_int(trimmed),
                    parse_date_int(q_trimmed),
                    parse_date_int(q2_trimmed),
                ) {
                    (Some(val), Some(lo), Some(hi)) => val >= lo.min(hi) && val <= lo.max(hi),
                    _ => false,
                }
            } else {
                match (
                    parse_number(trimmed),
                    parse_number(q_trimmed),
                    parse_number(q2_trimmed),
                ) {
                    (Some(val), Some(lo), Some(hi)) => val >= lo.min(hi) && val <= lo.max(hi),
                    _ => false,
                }
            }
        }
        _ => t_lower.contains(&q_lower),
    }
}

pub fn evaluate_table_filter_with_types(
    table_html: &str,
    filters_json: &str,
    col_types: &[String],
) -> Vec<usize> {
    let filters: Vec<ColumnFilter> = serde_json::from_str(filters_json).unwrap_or_default();
    let rows = split_rows(table_html);
    let mut visible = Vec::new();
    for (row_idx, (_, _, row_html)) in rows.iter().enumerate().skip(1) {
        let cells = split_cells(row_html);
        let mut passes = true;
        for f in &filters {
            let cell_text = cells
                .get(f.column_index)
                .map(|(_, _, _, inner)| strip_html_tags(inner))
                .unwrap_or_default();
            let col_type = col_types
                .get(f.column_index)
                .map(String::as_str)
                .unwrap_or("text");
            if !matches_filter(&cell_text, col_type, f) {
                passes = false;
                break;
            }
        }
        if passes {
            visible.push(row_idx);
        }
    }
    visible
}
