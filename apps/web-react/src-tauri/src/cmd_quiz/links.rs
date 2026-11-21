use crate::cmd_quiz::types::QuizPageLinkDto;
use crate::db::DbState;
use chrono::Utc;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn quiz_get_links_by_battery(
    battery_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<QuizPageLinkDto>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, battery_id, page_id, created_at
             FROM quiz_page_links
             WHERE battery_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![battery_id], |row| {
            Ok(QuizPageLinkDto {
                id: row.get(0)?,
                battery_id: row.get(1)?,
                page_id: row.get(2)?,
                created_at: row
                    .get::<_, Option<String>>(3)?
                    .unwrap_or_else(|| Utc::now().to_rfc3339()),
                deleted_at: None,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

#[tauri::command]
pub fn quiz_get_links_by_page(
    page_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<QuizPageLinkDto>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, battery_id, page_id, created_at
             FROM quiz_page_links
             WHERE page_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![page_id], |row| {
            Ok(QuizPageLinkDto {
                id: row.get(0)?,
                battery_id: row.get(1)?,
                page_id: row.get(2)?,
                created_at: row
                    .get::<_, Option<String>>(3)?
                    .unwrap_or_else(|| Utc::now().to_rfc3339()),
                deleted_at: None,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

#[tauri::command]
pub fn quiz_link_battery_to_page(
    battery_id: String,
    page_id: String,
    db_state: State<'_, DbState>,
) -> Result<QuizPageLinkDto, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    if let Ok(existing) = conn.query_row(
        "SELECT id, battery_id, page_id, created_at FROM quiz_page_links WHERE battery_id = ?1 AND page_id = ?2 LIMIT 1",
        params![battery_id, page_id],
        |row| {
            Ok(QuizPageLinkDto {
                id: row.get(0)?,
                battery_id: row.get(1)?,
                page_id: row.get(2)?,
                created_at: row
                    .get::<_, Option<String>>(3)?
                    .unwrap_or_else(|| Utc::now().to_rfc3339()),
                deleted_at: None,
            })
        },
    ) {
        return Ok(existing);
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO quiz_page_links (id, battery_id, page_id, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, battery_id, page_id, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(QuizPageLinkDto {
        id,
        battery_id,
        page_id,
        created_at: now,
        deleted_at: None,
    })
}

#[tauri::command]
pub fn quiz_unlink_battery_from_page(
    battery_id: String,
    page_id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let count = conn
        .execute(
            "DELETE FROM quiz_page_links WHERE battery_id = ?1 AND page_id = ?2",
            params![battery_id, page_id],
        )
        .map_err(|e| e.to_string())?;

    Ok(count > 0)
}
