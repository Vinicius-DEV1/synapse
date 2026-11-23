use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;
use serde_json::Value;
use std::collections::HashSet;

fn parse_options(options_json: &str, correct_index: i32) -> Result<String> {
    let value: Value = serde_json::from_str(options_json)
        .map_err(|error| SynapseError::Validation(format!("Invalid options JSON: {error}")))?;
    let options = value
        .as_array()
        .ok_or_else(|| SynapseError::Validation("Options must be a JSON array".into()))?
        .iter()
        .map(|item| {
            item.as_str()
                .map(str::trim)
                .filter(|option| !option.is_empty())
                .map(ToOwned::to_owned)
                .ok_or_else(|| SynapseError::Validation("Options must be non-empty strings".into()))
        })
        .collect::<Result<Vec<_>>>()?;

    if options.len() < 2 || correct_index < 0 || correct_index as usize >= options.len() {
        return Err(SynapseError::Validation(
            "Invalid options count or correct_index".into(),
        ));
    }

    Ok(options[correct_index as usize].clone())
}

fn normalize_tags(tags_json: Option<&str>) -> Result<String> {
    let Some(raw) = tags_json.filter(|value| !value.trim().is_empty()) else {
        return Ok("[]".into());
    };
    let value: Value = serde_json::from_str(raw)
        .map_err(|error| SynapseError::Validation(format!("Invalid tags JSON: {error}")))?;
    let values = value
        .as_array()
        .ok_or_else(|| SynapseError::Validation("Tags must be a JSON array".into()))?;
    let mut seen = HashSet::new();
    let mut tags = Vec::new();
    for value in values {
        let tag = value
            .as_str()
            .ok_or_else(|| SynapseError::Validation("Tags must contain only strings".into()))?
            .trim();
        let key = tag.to_lowercase();
        if !tag.is_empty() && seen.insert(key) {
            tags.push(tag.to_owned());
        }
    }
    serde_json::to_string(&tags).map_err(|error| SynapseError::Internal(error.to_string()))
}

pub fn create_quiz_question(
    conn: &rusqlite::Connection,
    battery_id: &str,
    question: &str,
    options_json: &str,
    correct_index: i32,
    explanation: Option<&str>,
    tags_json: Option<&str>,
) -> Result<String> {
    let trimmed_question = question.trim();
    if battery_id.trim().is_empty() || trimmed_question.is_empty() {
        return Err(SynapseError::Validation(
            "Battery ID and question cannot be empty".into(),
        ));
    }

    let correct_answer = parse_options(options_json, correct_index)?;
    let tags = normalize_tags(tags_json)?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let explanation = explanation.unwrap_or("").trim();

    conn.execute(
        "INSERT INTO quiz_questions (id, battery_id, type, question, options, correct_answer, correct_index, expected_answer, explanation, tags, sort_order, created_at, updated_at)
         VALUES (?, ?, 'multiple_choice', ?, ?, ?, ?, '', ?, ?,
         COALESCE((SELECT MAX(sort_order) + 1 FROM quiz_questions WHERE battery_id = ?), 0), ?, ?)",
        params![id, battery_id, trimmed_question, options_json, correct_answer, correct_index, explanation, tags, battery_id, now, now],
    )?;

    Ok(id)
}

pub fn update_quiz_question(
    conn: &rusqlite::Connection,
    question_id: &str,
    question: &str,
    options_json: &str,
    correct_index: i32,
    explanation: Option<&str>,
    tags_json: Option<&str>,
) -> Result<bool> {
    let trimmed_question = question.trim();
    if question_id.trim().is_empty() || trimmed_question.is_empty() {
        return Err(SynapseError::Validation(
            "Question ID and text cannot be empty".into(),
        ));
    }

    let correct_answer = parse_options(options_json, correct_index)?;
    let tags = normalize_tags(tags_json)?;
    let now = Utc::now().to_rfc3339();
    let explanation = explanation.unwrap_or("").trim();
    let count = conn.execute(
        "UPDATE quiz_questions
         SET question = ?, options = ?, correct_answer = ?, correct_index = ?, explanation = ?, tags = ?, updated_at = ?
         WHERE id = ? AND deleted_at IS NULL",
        params![trimmed_question, options_json, correct_answer, correct_index, explanation, tags, now, question_id],
    )?;

    Ok(count > 0)
}

pub fn delete_quiz_question(conn: &rusqlite::Connection, question_id: &str) -> Result<bool> {
    let trimmed_id = question_id.trim();
    if trimmed_id.is_empty() {
        return Err(SynapseError::Validation("ID cannot be empty".into()));
    }

    let now = Utc::now().to_rfc3339();
    let count = conn.execute(
        "UPDATE quiz_questions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        params![now, now, trimmed_id],
    )?;

    Ok(count > 0)
}
