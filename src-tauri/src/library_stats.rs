use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

// --- OCR CACHE ---

#[derive(Serialize, Deserialize)]
pub struct OcrCache {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub book_id: String,
    #[serde(default)]
    pub page_number: i32,
    #[serde(default)]
    pub text_content: Option<String>,
    #[serde(default)]
    pub word_boxes: Option<String>,
}

#[tauri::command]
pub fn library_get_ocr_cache(
    book_id: String,
    page_number: i32,
    db_state: State<'_, DbState>,
) -> Result<Option<OcrCache>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let result = conn.query_row(
        "SELECT id, book_id, page_number, text_content, word_boxes FROM library_ocr_cache WHERE book_id = ? AND page_number = ?",
        params![book_id, page_number],
        |row| Ok(OcrCache {
            id: row.get(0)?,
            book_id: row.get(1)?,
            page_number: row.get(2)?,
            text_content: row.get(3)?,
            word_boxes: row.get(4)?,
        })
    );

    match result {
        Ok(cache) => Ok(Some(cache)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn library_save_ocr_cache(
    cache: OcrCache,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = cache.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    conn.execute(
        "INSERT OR REPLACE INTO library_ocr_cache (id, book_id, page_number, text_content, word_boxes) VALUES (?, ?, ?, ?, ?)",
        params![id, cache.book_id, cache.page_number, cache.text_content, cache.word_boxes]
    ).map_err(|e| e.to_string())?;

    Ok(true)
}

// --- READING SESSIONS ---

fn deserialize_number_from_string<'de, D>(deserializer: D) -> Result<Option<i32>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum IntOrString {
        Int(i32),
        String(String),
    }

    match Option::<IntOrString>::deserialize(deserializer)? {
        Some(IntOrString::Int(i)) => Ok(Some(i)),
        Some(IntOrString::String(s)) => Ok(s.parse::<i32>().ok()),
        None => Ok(None),
    }
}

#[derive(Serialize, Deserialize)]
pub struct ReadingSession {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub book_id: String,
    #[serde(default)]
    pub started_at: Option<String>,
    #[serde(default)]
    pub ended_at: Option<String>,
    #[serde(default, deserialize_with = "deserialize_number_from_string")]
    pub pages_read: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_number_from_string")]
    pub start_page: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_number_from_string")]
    pub end_page: Option<i32>,
}

#[tauri::command]
pub fn library_start_reading_session(
    session: ReadingSession,
    db_state: State<'_, DbState>,
) -> Result<ReadingSession, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = session
        .id
        .clone()
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO library_reading_sessions (id, book_id, started_at, start_page, end_page) VALUES (?, ?, ?, ?, ?)",
        params![id, session.book_id, now, session.start_page.unwrap_or(1), session.end_page.unwrap_or(1)]
    ).map_err(|e| e.to_string())?;

    let mut ret = session;
    ret.id = Some(id);
    ret.started_at = Some(now);
    Ok(ret)
}

#[tauri::command]
pub fn library_end_reading_session(
    session: ReadingSession,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE library_reading_sessions SET ended_at = ?, pages_read = ?, end_page = ? WHERE id = ?",
        params![now, session.pages_read.unwrap_or(0), session.end_page.unwrap_or(1), session.id]
    ).map_err(|e| e.to_string())?;

    Ok(true)
}

// --- READING STATS ---

#[derive(Serialize, Deserialize)]
pub struct GlobalStats {
    #[serde(rename = "totalBooksStarted")]
    pub total_books_started: i32,
    #[serde(rename = "totalBooksFinished")]
    pub total_books_finished: i32,
    #[serde(rename = "totalTimeMinutes")]
    pub total_time_minutes: i32,
    #[serde(rename = "totalPagesRead")]
    pub total_pages_read: i32,
    #[serde(rename = "currentStreak")]
    pub current_streak: i32,
    #[serde(rename = "longestStreak")]
    pub longest_streak: i32,
    #[serde(rename = "readingDays")]
    pub reading_days: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ReadingStats {
    #[serde(rename = "globalStats")]
    pub global_stats: GlobalStats,
}

#[tauri::command]
pub fn library_get_reading_stats(db_state: State<'_, DbState>) -> Result<ReadingStats, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let started: i32 = conn.query_row(
        "SELECT COUNT(*) FROM library_books WHERE reading_status = 'reading' AND deleted_at IS NULL", [], |row| row.get(0)
    ).unwrap_or(0);

    let finished: i32 = conn.query_row(
        "SELECT COUNT(*) FROM library_books WHERE reading_status = 'finished' AND deleted_at IS NULL", [], |row| row.get(0)
    ).unwrap_or(0);

    let total_pages: i32 = conn.query_row(
        "SELECT COALESCE(SUM(pages_read), 0) FROM library_reading_sessions WHERE ended_at IS NOT NULL", [], |row| row.get(0)
    ).unwrap_or(0);

    let mut stmt = conn.prepare(
        "SELECT started_at, ended_at FROM library_reading_sessions WHERE started_at IS NOT NULL AND ended_at IS NOT NULL"
    ).map_err(|e| e.to_string())?;

    let session_rows = stmt.query_map([], |row| {
        let started_str: String = row.get(0)?;
        let ended_str: String = row.get(1)?;
        Ok((started_str, ended_str))
    }).map_err(|e| e.to_string())?;

    let mut total_duration_secs: i64 = 0;
    let mut unique_days: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();

    for r in session_rows {
        if let Ok((start_str, end_str)) = r {
            if let (Ok(start_dt), Ok(end_dt)) = (
                chrono::DateTime::parse_from_rfc3339(&start_str),
                chrono::DateTime::parse_from_rfc3339(&end_str),
            ) {
                let duration = (end_dt - start_dt).num_seconds();
                if duration > 0 {
                    let capped_duration = duration.min(28800); // Max 8 hours per session
                    total_duration_secs += capped_duration;
                }
                unique_days.insert(start_dt.format("%Y-%m-%d").to_string());
            } else {
                if start_str.len() >= 10 {
                    unique_days.insert(start_str[..10].to_string());
                }
            }
        }
    }

    let reading_days: Vec<String> = unique_days.into_iter().collect();

    let mut longest_streak = 0;
    let mut current_streak = 0;

    if !reading_days.is_empty() {
        let mut dates: Vec<chrono::NaiveDate> = reading_days
            .iter()
            .filter_map(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
            .collect();
        dates.sort();
        dates.dedup();

        let mut temp_streak = 0;
        let mut prev_date: Option<chrono::NaiveDate> = None;

        for date in &dates {
            match prev_date {
                Some(prev) => {
                    if *date == prev + chrono::Duration::days(1) {
                        temp_streak += 1;
                    } else if *date != prev {
                        temp_streak = 1;
                    }
                }
                None => {
                    temp_streak = 1;
                }
            }
            if temp_streak > longest_streak {
                longest_streak = temp_streak;
            }
            prev_date = Some(*date);
        }

        let today = chrono::Utc::now().date_naive();
        if let Some(last_date) = dates.last() {
            if *last_date == today || *last_date == today - chrono::Duration::days(1) {
                let mut c_streak = 1;
                for i in (0..dates.len().saturating_sub(1)).rev() {
                    if dates[i] == dates[i + 1] - chrono::Duration::days(1) {
                        c_streak += 1;
                    } else {
                        break;
                    }
                }
                current_streak = c_streak;
            }
        }
    }

    let total_time_minutes = (total_duration_secs / 60) as i32;

    Ok(ReadingStats {
        global_stats: GlobalStats {
            total_books_started: started,
            total_books_finished: finished,
            total_time_minutes,
            total_pages_read: total_pages,
            current_streak,
            longest_streak,
            reading_days,
        },
    })
}

