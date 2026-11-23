use super::models::{QuizAnswerResult, QuizAttemptDetail, QuizStats};
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;
use rusqlite::OptionalExtension;
use serde_json::Value;

pub fn record_quiz_attempt(
    conn: &rusqlite::Connection,
    battery_id: &str,
    question_id: &str,
    selected_index: i32,
    is_correct: bool,
) -> Result<bool> {
    submit_quiz_answer_internal(
        conn,
        battery_id,
        question_id,
        selected_index,
        Some(is_correct),
    )?;
    Ok(true)
}

pub fn submit_quiz_answer(
    conn: &rusqlite::Connection,
    battery_id: &str,
    question_id: &str,
    selected_index: i32,
) -> Result<QuizAnswerResult> {
    submit_quiz_answer_internal(conn, battery_id, question_id, selected_index, None)
}

fn submit_quiz_answer_internal(
    conn: &rusqlite::Connection,
    battery_id: &str,
    question_id: &str,
    selected_index: i32,
    expected_correctness: Option<bool>,
) -> Result<QuizAnswerResult> {
    let transaction = conn.unchecked_transaction()?;
    let question = transaction
        .query_row(
            "SELECT options, correct_index, explanation FROM quiz_questions \
             WHERE id = ? AND battery_id = ? AND deleted_at IS NULL",
            params![question_id, battery_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<i32>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                ))
            },
        )
        .optional()?
        .ok_or_else(|| SynapseError::NotFound("Question not found in battery".into()))?;

    let options: Value = serde_json::from_str(&question.0)
        .map_err(|error| SynapseError::Validation(format!("Corrupt options JSON: {error}")))?;
    let options = options
        .as_array()
        .ok_or_else(|| SynapseError::Validation("Options must be an array".into()))?;
    if selected_index < 0 || selected_index as usize >= options.len() {
        return Err(SynapseError::Validation("Invalid selected_index".into()));
    }
    let correct_index = question
        .1
        .filter(|index| *index >= 0 && (*index as usize) < options.len())
        .ok_or_else(|| SynapseError::Validation("Question has no valid correct answer".into()))?;
    let user_answer = options[selected_index as usize]
        .as_str()
        .ok_or_else(|| SynapseError::Validation("Answer options must be strings".into()))?;
    let correct_answer = options[correct_index as usize]
        .as_str()
        .ok_or_else(|| SynapseError::Validation("Answer options must be strings".into()))?
        .to_string();
    let is_correct = selected_index == correct_index;
    if expected_correctness.is_some_and(|expected| expected != is_correct) {
        return Err(SynapseError::Validation(
            "The supplied correctness does not match the answer key".into(),
        ));
    }
    let attempt_id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();

    transaction.execute(
        "INSERT INTO quiz_attempts (id, question_id, battery_id, type, selected_index, user_typed_answer, user_answer, is_correct, duration_ms, created_at) \
         VALUES (?, ?, ?, 'multiple_choice', ?, '', ?, ?, 0, ?)",
        params![
            attempt_id,
            question_id,
            battery_id,
            selected_index,
            user_answer,
            if is_correct { 1 } else { 0 },
            created_at,
        ],
    )?;
    transaction.commit()?;

    Ok(QuizAnswerResult {
        attempt_id,
        is_correct,
        correct_index,
        correct_answer,
        explanation: question.2,
    })
}

pub fn get_quiz_stats(conn: &rusqlite::Connection) -> Result<QuizStats> {
    let total_batteries: i64 = conn.query_row(
        "SELECT count(*) FROM quiz_batteries WHERE deleted_at IS NULL",
        [],
        |r| r.get(0),
    )?;

    let total_questions: i64 = conn.query_row(
        "SELECT count(*) FROM quiz_questions q
             INNER JOIN quiz_batteries b ON b.id = q.battery_id
             WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL",
        [],
        |r| r.get(0),
    )?;

    let (total_attempts, historical_incorrect): (i64, i64) = conn
        .query_row(
            "SELECT count(*), COALESCE(SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END), 0) FROM quiz_attempts",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        ?;

    let (answered_questions, correct_questions, incorrect_questions): (i64, i64, i64) = conn
        .query_row(
            "SELECT count(*),
                    COALESCE(SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN a.is_correct = 0 THEN 1 ELSE 0 END), 0)
             FROM quiz_questions q
             INNER JOIN quiz_batteries b ON b.id = q.battery_id
             INNER JOIN quiz_attempts a ON a.question_id = q.id
             WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL
               AND NOT EXISTS (
                   SELECT 1 FROM quiz_attempts newer
                   WHERE newer.question_id = a.question_id
                     AND (newer.created_at > a.created_at OR (newer.created_at = a.created_at AND newer.rowid > a.rowid))
               )",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        ?;

    let reviewable_incorrect: i64 = conn
        .query_row(
            "SELECT count(DISTINCT q.id) FROM quiz_questions q
             INNER JOIN quiz_batteries b ON b.id = q.battery_id
             INNER JOIN quiz_attempts a ON a.question_id = q.id
             WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL AND q.type = 'multiple_choice' AND a.is_correct = 0
               AND NOT EXISTS (
                   SELECT 1 FROM quiz_attempts newer
                   WHERE newer.question_id = a.question_id
                     AND (newer.created_at > a.created_at OR (newer.created_at = a.created_at AND newer.rowid > a.rowid))
               )",
            [],
            |r| r.get(0),
        )
        ?;

    let accuracy_rate = if answered_questions > 0 {
        (correct_questions * 100) / answered_questions
    } else {
        0
    };

    Ok(QuizStats {
        total_batteries,
        total_questions,
        total_attempts,
        answered_questions,
        correct_attempts: correct_questions,
        incorrect_attempts: historical_incorrect,
        incorrect_questions,
        reviewable_incorrect_questions: reviewable_incorrect,
        accuracy_rate,
    })
}

pub fn get_quiz_attempt_history(
    conn: &rusqlite::Connection,
    battery_id: Option<&str>,
    question_id: Option<&str>,
    limit: i32,
) -> Result<Vec<QuizAttemptDetail>> {
    let limit = i64::from(limit.clamp(1, 500));
    let mut statement = conn.prepare(
        "SELECT a.id, a.question_id, a.battery_id, COALESCE(q.question, ''), a.type,
                a.selected_index, a.user_typed_answer, a.user_answer,
                COALESCE(q.correct_answer, ''), q.explanation, a.is_correct,
                COALESCE(a.duration_ms, 0), a.created_at
         FROM quiz_attempts a
         LEFT JOIN quiz_questions q ON q.id = a.question_id
         WHERE (?1 IS NULL OR a.battery_id = ?1)
           AND (?2 IS NULL OR a.question_id = ?2)
         ORDER BY a.created_at DESC, a.rowid DESC
         LIMIT ?3",
    )?;

    let rows = statement.query_map(params![battery_id, question_id, limit], |row| {
        Ok(QuizAttemptDetail {
            id: row.get(0)?,
            question_id: row.get(1)?,
            battery_id: row.get(2)?,
            question: row.get(3)?,
            type_: row.get(4)?,
            selected_index: row.get(5)?,
            user_typed_answer: row.get(6)?,
            user_answer: row.get(7)?,
            correct_answer: row.get(8)?,
            explanation: row.get(9)?,
            is_correct: row.get(10)?,
            duration_ms: row.get(11)?,
            created_at: row.get(12)?,
        })
    })?;

    rows.collect::<std::result::Result<Vec<_>, _>>()
        .map_err(Into::into)
}
