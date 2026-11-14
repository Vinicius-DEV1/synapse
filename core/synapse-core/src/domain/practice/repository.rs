//! Practice and AI tutor database queries and persistence.

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};

use super::models::{TutorMemory, TutorMessage, TutorSession};
use crate::error::Result;

/// Retrieves active tutor sessions ordered by start date.
pub fn get_sessions(conn: &Connection) -> Result<Vec<TutorSession>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, started_at, ended_at, custom_prompt, deleted_at \
         FROM tutor_sessions WHERE deleted_at IS NULL ORDER BY started_at DESC LIMIT 100",
    )?;

    let iter = stmt.query_map([], |row| {
        Ok(TutorSession {
            id: row.get(0)?,
            title: row.get(1)?,
            started_at: row.get(2)?,
            ended_at: row.get(3)?,
            custom_prompt: row.get(4)?,
            deleted_at: row.get(5)?,
        })
    })?;

    let mut sessions = Vec::new();
    for s in iter {
        sessions.push(s?);
    }
    Ok(sessions)
}

/// Retrieves a single tutor session by ID.
pub fn get_session(conn: &Connection, session_id: &str) -> Result<Option<TutorSession>> {
    let sql = "SELECT id, title, started_at, ended_at, custom_prompt, deleted_at \
               FROM tutor_sessions WHERE id = ?1 AND deleted_at IS NULL";

    let opt = conn
        .query_row(sql, params![session_id], |row| {
            Ok(TutorSession {
                id: row.get(0)?,
                title: row.get(1)?,
                started_at: row.get(2)?,
                ended_at: row.get(3)?,
                custom_prompt: row.get(4)?,
                deleted_at: row.get(5)?,
            })
        })
        .optional()?;

    Ok(opt)
}

/// Inserts or updates a tutor session (upsert).
pub fn save_session(conn: &Connection, session: &TutorSession) -> Result<()> {
    conn.execute(
        "INSERT INTO tutor_sessions (id, title, started_at, ended_at, custom_prompt, deleted_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6) \
         ON CONFLICT(id) DO UPDATE SET \
            title = excluded.title, \
            started_at = excluded.started_at, \
            ended_at = excluded.ended_at, \
            custom_prompt = excluded.custom_prompt, \
            deleted_at = excluded.deleted_at, \
            updated_at = CURRENT_TIMESTAMP",
        params![
            session.id,
            session.title,
            session.started_at,
            session.ended_at,
            session.custom_prompt,
            session.deleted_at,
        ],
    )?;
    Ok(())
}

/// Soft-deletes a tutor session by ID.
pub fn delete_session(conn: &Connection, session_id: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE tutor_sessions SET deleted_at = ?1, updated_at = ?1 \
         WHERE id = ?2 AND deleted_at IS NULL",
        params![now, session_id],
    )?;
    Ok(rows > 0)
}

/// Retrieves all transcript messages for a session ordered by creation time.
pub fn get_messages(conn: &Connection, session_id: &str) -> Result<Vec<TutorMessage>> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, role, text_content, created_at \
         FROM tutor_messages WHERE session_id = ?1 ORDER BY created_at ASC",
    )?;

    let iter = stmt.query_map(params![session_id], |row| {
        Ok(TutorMessage {
            id: row.get(0)?,
            session_id: row.get(1)?,
            role: row.get(2)?,
            text_content: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;

    let mut messages = Vec::new();
    for m in iter {
        messages.push(m?);
    }
    Ok(messages)
}

/// Inserts or updates a tutor message.
pub fn save_message(conn: &Connection, message: &TutorMessage) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    let created = message.created_at.as_deref().unwrap_or(&now);
    conn.execute(
        "INSERT INTO tutor_messages (id, session_id, role, text_content, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5) \
         ON CONFLICT(id) DO UPDATE SET \
            session_id = excluded.session_id, \
            role = excluded.role, \
            text_content = excluded.text_content",
        params![
            message.id,
            message.session_id,
            message.role,
            message.text_content,
            created,
        ],
    )?;
    Ok(())
}

/// Retrieves all active tutor memories.
pub fn get_memories(conn: &Connection) -> Result<Vec<TutorMemory>> {
    let mut stmt = conn.prepare(
        "SELECT id, category, fact, created_at, deleted_at \
         FROM tutor_memories WHERE deleted_at IS NULL ORDER BY created_at DESC",
    )?;

    let iter = stmt.query_map([], |row| {
        Ok(TutorMemory {
            id: row.get(0)?,
            category: row.get(1)?,
            fact: row.get(2)?,
            created_at: row.get(3)?,
            deleted_at: row.get(4)?,
        })
    })?;

    let mut memories = Vec::new();
    for mem in iter {
        memories.push(mem?);
    }
    Ok(memories)
}

/// Inserts or updates a tutor memory.
pub fn save_memory(conn: &Connection, memory: &TutorMemory) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    let created = memory.created_at.as_deref().unwrap_or(&now);
    conn.execute(
        "INSERT INTO tutor_memories (id, category, fact, created_at) \
         VALUES (?1, ?2, ?3, ?4) \
         ON CONFLICT(id) DO UPDATE SET \
            category = excluded.category, \
            fact = excluded.fact, \
            deleted_at = NULL",
        params![memory.id, memory.category, memory.fact, created],
    )?;
    Ok(())
}

/// Soft-deletes a tutor memory by ID.
pub fn delete_memory(conn: &Connection, memory_id: &str) -> Result<bool> {
    let now = Utc::now().to_rfc3339();
    let rows = conn.execute(
        "UPDATE tutor_memories SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
        params![now, memory_id],
    )?;
    Ok(rows > 0)
}
