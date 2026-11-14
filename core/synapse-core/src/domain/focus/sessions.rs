use super::models::FocusSession;
use crate::error::Result;
use rusqlite::params;

pub fn get_focus_sessions(conn: &rusqlite::Connection) -> Result<Vec<FocusSession>> {
    let mut stmt = conn.prepare(
        "SELECT id, tag, description, target_time_minutes, status, justification, summary, created_at, updated_at \
         FROM focus_sessions WHERE deleted_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 100",
    )?;

    let iter = stmt.query_map([], |row| {
        Ok(FocusSession {
            id: row.get(0)?,
            tag: row.get(1)?,
            description: row.get(2).unwrap_or_default(),
            target_time_minutes: row.get(3).unwrap_or(0),
            status: row.get(4)?,
            justification: row.get(5)?,
            summary: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;

    let mut list = Vec::new();
    for s in iter.flatten() {
        list.push(s);
    }
    Ok(list)
}

pub fn record_focus_session(
    conn: &rusqlite::Connection,
    tag: &str,
    target_minutes: i32,
    status: &str,
    summary: &str,
    description: &str,
) -> Result<bool> {
    let resolved_tag = if tag.trim().is_empty() {
        "Estudo"
    } else {
        tag.trim()
    };
    let resolved_status = if status.trim().is_empty() {
        "completed"
    } else {
        status.trim()
    };
    let resolved_minutes = target_minutes.max(1);
    let id = uuid::Uuid::new_v4().to_string();

    let rows = conn.execute(
        "INSERT INTO focus_sessions (id, tag, description, target_time_minutes, status, summary, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        params![
            id,
            resolved_tag,
            description.trim(),
            resolved_minutes,
            resolved_status,
            summary.trim(),
        ],
    )?;

    Ok(rows > 0)
}

pub fn create_focus_session(conn: &rusqlite::Connection, mut session: FocusSession) -> Result<String> {
    let id = if session.id.trim().is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        session.id.clone()
    };

    conn.execute(
        "INSERT INTO focus_sessions (id, tag, description, target_time_minutes, status, justification, summary) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) \
         ON CONFLICT(id) DO UPDATE SET \
            tag = excluded.tag, \
            description = excluded.description, \
            target_time_minutes = excluded.target_time_minutes, \
            status = excluded.status, \
            justification = excluded.justification, \
            summary = excluded.summary, \
            deleted_at = NULL, \
            updated_at = CURRENT_TIMESTAMP",
        params![
            id,
            session.tag,
            session.description,
            session.target_time_minutes,
            session.status,
            session.justification,
            session.summary,
        ],
    )?;

    session.id = id.clone();
    Ok(id)
}

pub fn delete_focus_session(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    if id.trim().is_empty() {
        return Ok(false);
    }

    let rows = conn.execute(
        "UPDATE focus_sessions SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id.trim()],
    )?;

    Ok(rows > 0)
}
