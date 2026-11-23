//! Contextual date extraction from daily note titles for Habit widgets.

use chrono::Local;

/// Parses a `YYYY-MM-DD` date from a note title (`DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`, etc.).
/// Falls back to `fallback_date` or local today if no valid date is found.
pub fn resolve_date_from_page_title(page_title: &str, fallback_date: Option<&str>) -> String {
    let trimmed = page_title.trim();
    if let Some(found) = extract_date_from_text(trimmed) {
        return found;
    }

    fallback_date
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| Local::now().format("%Y-%m-%d").to_string())
}

fn extract_date_from_text(text: &str) -> Option<String> {
    let tokens: Vec<&str> = text
        .split(|c: char| !(c.is_ascii_digit() || c == '-' || c == '/' || c == '.'))
        .filter(|s| !s.is_empty())
        .collect();

    for token in tokens {
        let parts: Vec<&str> = token.split(['-', '/', '.']).collect();
        if parts.len() != 3 {
            continue;
        }
        // Pattern 1: DD-MM-YYYY
        if parts[0].len() == 2 && parts[1].len() == 2 && parts[2].len() == 4 {
            if let (Ok(d), Ok(m), Ok(y)) = (
                parts[0].parse::<u32>(),
                parts[1].parse::<u32>(),
                parts[2].parse::<u32>(),
            ) {
                if (2000..=2099).contains(&y) && (1..=12).contains(&m) && (1..=31).contains(&d) {
                    return Some(format!("{:04}-{:02}-{:02}", y, m, d));
                }
            }
        }
        // Pattern 2: YYYY-MM-DD
        if parts[0].len() == 4 && parts[1].len() == 2 && parts[2].len() == 2 {
            if let (Ok(y), Ok(m), Ok(d)) = (
                parts[0].parse::<u32>(),
                parts[1].parse::<u32>(),
                parts[2].parse::<u32>(),
            ) {
                if (2000..=2099).contains(&y) && (1..=12).contains(&m) && (1..=31).contains(&d) {
                    return Some(format!("{:04}-{:02}-{:02}", y, m, d));
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_dmy_and_ymd_from_titles() {
        assert_eq!(
            resolve_date_from_page_title("Diário 23/11/2026", None),
            "2026-11-23"
        );
        assert_eq!(
            resolve_date_from_page_title("Daily Note 2026-09-25 review", None),
            "2026-09-25"
        );
        assert_eq!(
            resolve_date_from_page_title("Regular Page", Some("2026-01-02")),
            "2026-01-02"
        );
    }
}
