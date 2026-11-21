use crate::cmd_quiz::types::{parse_json_string_vec, QuizBatteryDto};
use crate::db::DbState;
use chrono::Utc;
use rusqlite::params;
use tauri::State;

pub fn map_battery_row(row: &rusqlite::Row) -> rusqlite::Result<QuizBatteryDto> {
    let tags_raw: Option<String> = row.get(6)?;
    let now = Utc::now().to_rfc3339();
    Ok(QuizBatteryDto {
        id: row.get(0)?,
        parent_id: row.get(1)?,
        page_id: row.get(2)?,
        title: row.get(3)?,
        description: row.get(4)?,
        layout: row
            .get::<_, Option<String>>(5)?
            .unwrap_or_else(|| "sequential".to_string()),
        tags: parse_json_string_vec(tags_raw),
        sort_order: row.get::<_, Option<i32>>(7)?.unwrap_or(0),
        created_at: row
            .get::<_, Option<String>>(8)?
            .unwrap_or_else(|| now.clone()),
        updated_at: row.get::<_, Option<String>>(9)?.unwrap_or(now),
        deleted_at: row.get(10)?,
    })
}

#[tauri::command]
pub fn quiz_get_all_batteries(db_state: State<'_, DbState>) -> Result<Vec<QuizBatteryDto>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT id, parent_id, page_id, title, description, layout, tags, sort_order, created_at, updated_at, deleted_at
             FROM quiz_batteries
             WHERE deleted_at IS NULL
             ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], map_battery_row)
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

#[tauri::command]
pub fn quiz_get_battery_by_id(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<QuizBatteryDto>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let res = conn.query_row(
        "SELECT id, parent_id, page_id, title, description, layout, tags, sort_order, created_at, updated_at, deleted_at
         FROM quiz_batteries
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        map_battery_row,
    );

    match res {
        Ok(b) => Ok(Some(b)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn quiz_get_batteries_by_page(
    page_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<QuizBatteryDto>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT b.id, b.parent_id, b.page_id, b.title, b.description, b.layout, b.tags, b.sort_order, b.created_at, b.updated_at, b.deleted_at
             FROM quiz_batteries b
             LEFT JOIN quiz_page_links l ON l.battery_id = b.id
             WHERE b.deleted_at IS NULL AND (b.page_id = ?1 OR l.page_id = ?1)
             ORDER BY b.updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![page_id], map_battery_row)
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

#[tauri::command]
pub fn quiz_save_battery(
    battery: QuizBatteryDto,
    db_state: State<'_, DbState>,
) -> Result<QuizBatteryDto, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let now = Utc::now().to_rfc3339();
    let id = if battery.id.trim().is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        battery.id.clone()
    };

    let existing: Option<QuizBatteryDto> = conn
        .query_row(
            "SELECT id, parent_id, page_id, title, description, layout, tags, sort_order, created_at, updated_at, deleted_at
             FROM quiz_batteries WHERE id = ?1",
            params![id],
            map_battery_row,
        )
        .ok();

    let title = {
        let t = battery.title.trim();
        if t.is_empty() {
            existing
                .as_ref()
                .map(|e| e.title.clone())
                .unwrap_or_else(|| "Bateria de Exercícios".to_string())
        } else {
            t.to_string()
        }
    };
    let parent_id = battery
        .parent_id
        .or_else(|| existing.as_ref().and_then(|e| e.parent_id.clone()));
    let page_id = battery
        .page_id
        .or_else(|| existing.as_ref().and_then(|e| e.page_id.clone()));
    let description = battery
        .description
        .or_else(|| existing.as_ref().and_then(|e| e.description.clone()))
        .unwrap_or_default();
    let layout = if battery.layout.trim().is_empty() {
        existing
            .as_ref()
            .map(|e| e.layout.clone())
            .unwrap_or_else(|| "sequential".to_string())
    } else {
        battery.layout
    };
    let tags = if battery.tags.is_empty() {
        existing
            .as_ref()
            .map(|e| e.tags.clone())
            .unwrap_or_default()
    } else {
        battery.tags
    };
    let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string());
    let sort_order = battery.sort_order;
    let created_at = existing
        .as_ref()
        .map(|e| e.created_at.clone())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| {
            if battery.created_at.is_empty() {
                now.clone()
            } else {
                battery.created_at
            }
        });

    conn.execute(
        "INSERT INTO quiz_batteries (id, parent_id, page_id, title, description, layout, tags, sort_order, created_at, updated_at, deleted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL)
         ON CONFLICT(id) DO UPDATE SET
            parent_id = excluded.parent_id,
            page_id = excluded.page_id,
            title = excluded.title,
            description = excluded.description,
            layout = excluded.layout,
            tags = excluded.tags,
            sort_order = excluded.sort_order,
            updated_at = excluded.updated_at,
            deleted_at = NULL",
        params![
            id,
            parent_id,
            page_id,
            title,
            description,
            layout,
            tags_json,
            sort_order,
            created_at,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(QuizBatteryDto {
        id,
        parent_id,
        page_id,
        title,
        description: Some(description),
        layout,
        tags,
        sort_order,
        created_at,
        updated_at: now,
        deleted_at: None,
    })
}

#[tauri::command]
pub fn quiz_delete_battery(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;
    let now = Utc::now().to_rfc3339();

    let count = conn
        .execute(
            "UPDATE quiz_batteries SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
            params![now, id],
        )
        .map_err(|e| e.to_string())?;

    let _ = conn.execute(
        "UPDATE quiz_questions SET deleted_at = ?1, updated_at = ?1 WHERE battery_id = ?2 AND deleted_at IS NULL",
        params![now, id],
    );

    Ok(count > 0)
}

#[tauri::command]
pub fn quiz_restore_battery(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;
    let now = Utc::now().to_rfc3339();

    let count = conn
        .execute(
            "UPDATE quiz_batteries SET deleted_at = NULL, updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )
        .map_err(|e| e.to_string())?;

    let _ = conn.execute(
        "UPDATE quiz_questions SET deleted_at = NULL, updated_at = ?1 WHERE battery_id = ?2",
        params![now, id],
    );

    Ok(count > 0)
}
