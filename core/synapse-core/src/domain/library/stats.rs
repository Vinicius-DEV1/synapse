//! Reading session tracking, duration calculations, and streak metrics.

use chrono::{DateTime, NaiveDate, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::BTreeSet;
use uuid::Uuid;

use super::models::LibraryReadingStats;
use crate::error::Result;

/// Starts a new reading session for a book.
pub fn start_reading_session(
    conn: &Connection,
    book_id: &str,
    start_page: i32,
) -> Result<Option<String>> {
    let norm_book_id = book_id.trim();
    if norm_book_id.is_empty() {
        return Ok(None);
    }

    let exists: Option<String> = conn
        .query_row(
            "SELECT id FROM library_books WHERE id = ?1 AND deleted_at IS NULL",
            params![norm_book_id],
            |r| r.get(0),
        )
        .optional()?;

    if exists.is_none() {
        return Ok(None);
    }

    let session_id = Uuid::new_v4().to_string();
    let norm_start = start_page.max(1);
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO library_reading_sessions (id, book_id, started_at, start_page, end_page) \
         VALUES (?1, ?2, ?3, ?4, ?4)",
        params![session_id, norm_book_id, now, norm_start],
    )?;

    Ok(Some(session_id))
}

/// Ends an active reading session and records pages read.
pub fn end_reading_session(
    conn: &Connection,
    session_id: &str,
    end_page: i32,
    start_page: i32,
) -> Result<bool> {
    let norm_session_id = session_id.trim();
    if norm_session_id.is_empty() {
        return Ok(false);
    }

    let norm_end = end_page.max(1);
    let pages_read = (norm_end - start_page).abs() + 1;
    let now = Utc::now().to_rfc3339();

    let rows = conn.execute(
        "UPDATE library_reading_sessions SET ended_at = ?1, pages_read = ?2, end_page = ?3 \
         WHERE id = ?4 AND ended_at IS NULL",
        params![now, pages_read, norm_end, norm_session_id],
    )?;

    Ok(rows > 0)
}

/// Computes comprehensive library statistics including streaks and duration.
pub fn get_reading_stats(conn: &Connection) -> Result<LibraryReadingStats> {
    let books_started: i32 = conn.query_row(
        "SELECT COUNT(*) FROM library_books WHERE reading_status = 'reading' AND deleted_at IS NULL",
        [],
        |r| r.get(0),
    )?;

    let books_finished: i32 = conn.query_row(
        "SELECT COUNT(*) FROM library_books WHERE reading_status = 'finished' AND deleted_at IS NULL",
        [],
        |r| r.get(0),
    )?;

    let highlights: i32 = conn.query_row(
        "SELECT COUNT(*) FROM library_highlights WHERE deleted_at IS NULL",
        [],
        |r| r.get(0),
    )?;

    let current_progress_pages: i64 = conn.query_row(
        "SELECT COALESCE(SUM(MIN(MAX(COALESCE(current_page, 0), 0), \
                 MAX(COALESCE(total_pages, 0), 0))), 0) \
         FROM library_books WHERE deleted_at IS NULL",
        [],
        |r| r.get(0),
    )?;

    let mut stmt = conn.prepare(
        "SELECT started_at, ended_at, COALESCE(pages_read, 0) FROM library_reading_sessions",
    )?;
    let mut rows = stmt.query([])?;

    let mut total_duration_seconds: i64 = 0;
    let mut total_pages_read: i64 = 0;
    let mut unique_reading_days = BTreeSet::new();

    while let Some(row) = rows.next()? {
        let started_at: String = row.get(0)?;
        let ended_at: Option<String> = row.get(1)?;
        let pages: i64 = row.get(2)?;
        total_pages_read += pages.max(0);

        if let Ok(start_dt) = DateTime::parse_from_rfc3339(&started_at) {
            let day_str = start_dt.format("%Y-%m-%d").to_string();
            unique_reading_days.insert(day_str);

            if let Some(ref end_str) = ended_at {
                if let Ok(end_dt) = DateTime::parse_from_rfc3339(end_str) {
                    let diff = (end_dt - start_dt).num_seconds();
                    if diff > 0 {
                        total_duration_seconds += diff.min(28800); // capped at 8 hours per session
                    }
                }
            }
        } else if started_at.len() >= 10 {
            unique_reading_days.insert(started_at[..10].to_string());
        }
    }

    let reading_days: Vec<String> = unique_reading_days.into_iter().collect();

    // Streak calculation
    let mut longest_streak = 0;
    let mut streak_length = 0;
    let mut prev_date: Option<NaiveDate> = None;

    for day_str in &reading_days {
        if let Ok(date) = NaiveDate::parse_from_str(day_str, "%Y-%m-%d") {
            if let Some(prev) = prev_date {
                if (date - prev).num_days() == 1 {
                    streak_length += 1;
                } else {
                    streak_length = 1;
                }
            } else {
                streak_length = 1;
            }
            longest_streak = longest_streak.max(streak_length);
            prev_date = Some(date);
        }
    }

    let mut current_streak = 0;
    let today = Utc::now().date_naive();

    if let Some(last_str) = reading_days.last() {
        if let Ok(last_date) = NaiveDate::parse_from_str(last_str, "%Y-%m-%d") {
            let days_since = (today - last_date).num_days();
            if days_since == 0 || days_since == 1 {
                current_streak = 1;
                for i in (1..reading_days.len()).rev() {
                    if let (Ok(curr), Ok(prev)) = (
                        NaiveDate::parse_from_str(&reading_days[i], "%Y-%m-%d"),
                        NaiveDate::parse_from_str(&reading_days[i - 1], "%Y-%m-%d"),
                    ) {
                        if (curr - prev).num_days() == 1 {
                            current_streak += 1;
                        } else {
                            break;
                        }
                    }
                }
            }
        }
    }

    Ok(LibraryReadingStats {
        total_books_started: books_started,
        total_books_finished: books_finished,
        total_time_minutes: (total_duration_seconds as f64 / 60.0).round() as i64,
        total_pages_read,
        current_progress_pages,
        total_highlights: highlights,
        current_streak,
        longest_streak,
        reading_days,
    })
}
