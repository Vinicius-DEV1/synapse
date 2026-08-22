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
    #[serde(default)]
    pub pages_read: Option<i32>,
    #[serde(default)]
    pub start_page: Option<i32>,
    #[serde(default)]
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
        "UPDATE library_reading_sessions SET ended_at = ?, pages_read = ?, end_page = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
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

    Ok(ReadingStats {
        global_stats: GlobalStats {
            total_books_started: started,
            total_books_finished: finished,
            total_time_minutes: 0,
            total_pages_read: total_pages,
            current_streak: 0,
            longest_streak: 0,
            reading_days: vec![],
        },
    })
}
