use super::authoring::{normalize_tags, parse_options};
use super::models::{QuizAssistantQuestionAction, QuizQuestion};
use super::prompt_duplicates::ensure_question_prompt_is_unique;
use super::questions;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use std::collections::HashSet;

pub(super) fn apply_quiz_assistant_actions(
    conn: &mut Connection,
    battery_id: &str,
    actions: &[QuizAssistantQuestionAction],
) -> Result<Vec<QuizQuestion>> {
    let battery_id = battery_id.trim();
    if battery_id.is_empty() || actions.is_empty() {
        return Err(SynapseError::Validation(
            "A battery and at least one accepted action are required".into(),
        ));
    }
    let exists = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM quiz_batteries WHERE id = ? AND deleted_at IS NULL)",
            [battery_id],
            |row| row.get::<_, bool>(0),
        )
        .optional()?
        .unwrap_or(false);
    if !exists {
        return Err(SynapseError::Validation(
            "The target question battery does not exist".into(),
        ));
    }

    let tx = conn.transaction()?;
    let mut reorder_actions = Vec::new();
    for action in actions {
        if matches!(action, QuizAssistantQuestionAction::Reorder { .. }) {
            reorder_actions.push(action);
        } else {
            apply_action(&tx, battery_id, action)?;
        }
    }
    if let Some(last_reorder) = reorder_actions.last() {
        apply_action(&tx, battery_id, last_reorder)?;
    }
    tx.commit()?;
    questions::get_battery_questions(conn, battery_id)
}

fn apply_action(
    tx: &Transaction<'_>,
    battery_id: &str,
    action: &QuizAssistantQuestionAction,
) -> Result<()> {
    match action {
        QuizAssistantQuestionAction::Create {
            type_,
            question,
            options,
            correct_index,
            expected_answer,
            explanation,
            tags,
        } => create_question(
            tx,
            battery_id,
            type_,
            question,
            options,
            *correct_index,
            expected_answer,
            explanation,
            tags,
        ),
        QuizAssistantQuestionAction::Edit {
            target_question_id,
            changes,
        } => edit_question(tx, battery_id, target_question_id, changes),
        QuizAssistantQuestionAction::Delete { target_question_id } => {
            delete_question(tx, battery_id, target_question_id)
        }
        QuizAssistantQuestionAction::Reorder { order } => reorder_questions(tx, battery_id, order),
    }
}

fn create_question(
    tx: &Transaction<'_>,
    battery_id: &str,
    question_type: &str,
    question: &str,
    options: &[String],
    correct_index: i32,
    expected_answer: &str,
    explanation: &str,
    tags: &[String],
) -> Result<()> {
    let question = question.trim();
    validate_question(question_type, question)?;
    ensure_question_prompt_is_unique(tx, battery_id, question)?;
    let options_json = serde_json::to_string(&options)
        .map_err(|error| SynapseError::Internal(error.to_string()))?;
    let correct_answer = correct_answer(question_type, &options_json, correct_index)?;
    let tags_json =
        serde_json::to_string(tags).map_err(|error| SynapseError::Internal(error.to_string()))?;
    let tags = normalize_tags(Some(&tags_json))?;
    let now = Utc::now().to_rfc3339();
    let question_id = uuid::Uuid::new_v4().to_string();

    tx.execute(
        "INSERT INTO quiz_questions
         (id, battery_id, type, question, options, correct_answer, correct_index, expected_answer, explanation, tags, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
         COALESCE((SELECT MAX(sort_order) + 1 FROM quiz_questions WHERE battery_id = ? AND deleted_at IS NULL), 0), ?, ?)",
        params![question_id, battery_id, question_type, question, options_json, correct_answer,
            correct_index, expected_answer.trim(), explanation.trim(), tags, battery_id, now, now],
    )?;
    Ok(())
}

fn edit_question(
    tx: &Transaction<'_>,
    battery_id: &str,
    question_id: &str,
    changes: &super::models::QuizAssistantQuestionChanges,
) -> Result<()> {
    let question_id = question_id.trim();
    if question_id.is_empty() {
        return Err(SynapseError::Validation(
            "Question ID cannot be empty".into(),
        ));
    }
    let current = tx
        .query_row(
            "SELECT type, question, options, correct_index, expected_answer, explanation, tags
             FROM quiz_questions WHERE id = ? AND battery_id = ? AND deleted_at IS NULL",
            params![question_id, battery_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i32>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                ))
            },
        )
        .optional()?
        .ok_or_else(|| SynapseError::Validation("Question is not in the target battery".into()))?;
    let question_type = changes.type_.as_deref().unwrap_or(&current.0);
    let question = changes.question.as_deref().unwrap_or(&current.1).trim();
    validate_question(question_type, question)?;
    let current_options = parse_string_array(&current.2)?;
    let options = if question_type == "open"
        && changes
            .type_
            .as_deref()
            .is_some_and(|changed| changed != current.0)
        && changes.options.is_none()
    {
        Vec::new()
    } else {
        changes.options.clone().unwrap_or(current_options)
    };
    let options_json = serde_json::to_string(&options)
        .map_err(|error| SynapseError::Internal(error.to_string()))?;
    let correct_index = changes.correct_index.unwrap_or(current.3);
    let correct_answer = correct_answer(question_type, &options_json, correct_index)?;
    let expected_answer = changes
        .expected_answer
        .as_deref()
        .unwrap_or(&current.4)
        .trim();
    let explanation = changes.explanation.as_deref().unwrap_or(&current.5).trim();
    let current_tags = parse_string_array(&current.6)?;
    let tags = changes.tags.as_ref().unwrap_or(&current_tags);
    let tags_json =
        serde_json::to_string(tags).map_err(|error| SynapseError::Internal(error.to_string()))?;
    let tags = normalize_tags(Some(&tags_json))?;
    let now = Utc::now().to_rfc3339();

    tx.execute(
        "UPDATE quiz_questions SET type = ?, question = ?, options = ?, correct_answer = ?,
         correct_index = ?, expected_answer = ?, explanation = ?, tags = ?, updated_at = ?
         WHERE id = ? AND battery_id = ? AND deleted_at IS NULL",
        params![
            question_type,
            question,
            options_json,
            correct_answer,
            correct_index,
            expected_answer,
            explanation,
            tags,
            now,
            question_id,
            battery_id
        ],
    )?;
    Ok(())
}

fn delete_question(tx: &Transaction<'_>, battery_id: &str, question_id: &str) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    let changed = tx.execute(
        "UPDATE quiz_questions SET deleted_at = ?, updated_at = ?
         WHERE id = ? AND battery_id = ? AND deleted_at IS NULL",
        params![now, now, question_id.trim(), battery_id],
    )?;
    if changed == 0 {
        return Err(SynapseError::Validation(
            "Question is not in the target battery".into(),
        ));
    }
    Ok(())
}

fn reorder_questions(tx: &Transaction<'_>, battery_id: &str, requested: &[String]) -> Result<()> {
    if requested.is_empty() {
        return Err(SynapseError::Validation(
            "A proposed order cannot be empty".into(),
        ));
    }
    let mut statement = tx.prepare(
        "SELECT id FROM quiz_questions WHERE battery_id = ? AND deleted_at IS NULL ORDER BY sort_order, created_at, id",
    )?;
    let current = statement
        .query_map([battery_id], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(statement);
    let current_set: HashSet<&str> = current.iter().map(String::as_str).collect();
    let mut reordered = Vec::with_capacity(current.len());
    let mut seen = HashSet::new();
    for id in requested {
        let id = id.trim();
        if !current_set.contains(id) {
            let belongs_to_battery = tx
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM quiz_questions WHERE id = ? AND battery_id = ?)",
                    params![id, battery_id],
                    |row| row.get::<_, bool>(0),
                )
                .optional()?
                .unwrap_or(false);
            if belongs_to_battery {
                continue;
            }
            return Err(SynapseError::Validation(
                "Order contains a question outside the target battery".into(),
            ));
        }
        if seen.insert(id.to_owned()) {
            reordered.push(id.to_owned());
        }
    }
    reordered.extend(current.into_iter().filter(|id| seen.insert(id.clone())));
    let now = Utc::now().to_rfc3339();
    for (index, question_id) in reordered.iter().enumerate() {
        tx.execute(
            "UPDATE quiz_questions SET sort_order = ?, updated_at = ? WHERE id = ? AND battery_id = ? AND deleted_at IS NULL",
            params![index as i32, now, question_id, battery_id],
        )?;
    }
    Ok(())
}

fn validate_question(question_type: &str, question: &str) -> Result<()> {
    if question.is_empty() {
        return Err(SynapseError::Validation(
            "Question text cannot be empty".into(),
        ));
    }
    if !matches!(question_type, "open" | "multiple_choice") {
        return Err(SynapseError::Validation("Unsupported question type".into()));
    }
    Ok(())
}

fn correct_answer(question_type: &str, options_json: &str, correct_index: i32) -> Result<String> {
    if question_type == "open" {
        return Ok(String::new());
    }
    parse_options(options_json, correct_index)
}

fn parse_string_array(raw: &str) -> Result<Vec<String>> {
    serde_json::from_str(raw)
        .map_err(|error| SynapseError::Validation(format!("Invalid string-array JSON: {error}")))
}
