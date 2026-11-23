//! Validated Practice create operations shared by native clients.

use chrono::{DateTime, Utc};
use rusqlite::Connection;

use super::models::{TutorMemory, TutorMessage, TutorSession};
use super::repository;
use crate::error::{Result, SynapseError};

/// Creates a validated session and assigns its canonical identifier.
pub fn create_session(
    conn: &Connection,
    title: &str,
    started_at: &str,
    custom_prompt: Option<&str>,
) -> Result<TutorSession> {
    let title = title.trim();
    if title.is_empty() {
        return Err(SynapseError::Validation(
            "Practice session title cannot be empty".to_owned(),
        ));
    }
    let started_at = DateTime::parse_from_rfc3339(started_at)
        .map_err(|error| SynapseError::Validation(format!("Invalid session timestamp: {error}")))?
        .to_rfc3339();
    let session = TutorSession {
        id: uuid::Uuid::new_v4().to_string(),
        title: title.to_owned(),
        started_at,
        ended_at: None,
        custom_prompt: custom_prompt.map(str::to_owned),
        deleted_at: None,
    };
    repository::save_session(conn, &session)?;
    Ok(session)
}

/// Creates a transcript message for an active session.
pub fn create_message(
    conn: &Connection,
    session_id: &str,
    role: &str,
    text_content: &str,
) -> Result<TutorMessage> {
    let session_id = session_id.trim();
    let role = role.trim();
    let text_content = text_content.trim();
    if session_id.is_empty() || text_content.is_empty() {
        return Err(SynapseError::Validation(
            "Practice session and message text are required".to_owned(),
        ));
    }
    if !matches!(role, "user" | "assistant" | "model" | "system") {
        return Err(SynapseError::Validation(format!(
            "Unsupported practice message role: {role}"
        )));
    }
    if repository::get_session(conn, session_id)?.is_none() {
        return Err(SynapseError::NotFound(format!(
            "Practice session {session_id} does not exist"
        )));
    }
    let message = TutorMessage {
        id: uuid::Uuid::new_v4().to_string(),
        session_id: session_id.to_owned(),
        role: role.to_owned(),
        text_content: text_content.to_owned(),
        created_at: Some(Utc::now().to_rfc3339()),
    };
    repository::save_message(conn, &message)?;
    Ok(message)
}

/// Creates a non-empty tutor memory and assigns its canonical identifier.
pub fn create_memory(conn: &Connection, category: &str, fact: &str) -> Result<TutorMemory> {
    let category = category.trim();
    let fact = fact.trim();
    if category.is_empty() || fact.is_empty() {
        return Err(SynapseError::Validation(
            "Practice memory category and fact are required".to_owned(),
        ));
    }
    let memory = TutorMemory {
        id: uuid::Uuid::new_v4().to_string(),
        category: category.to_owned(),
        fact: fact.to_owned(),
        created_at: Some(Utc::now().to_rfc3339()),
        deleted_at: None,
    };
    repository::save_memory(conn, &memory)?;
    Ok(memory)
}
