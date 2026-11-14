use super::models::QuizStats;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;
use serde_json::Value;

pub fn record_quiz_attempt(
    conn: &rusqlite::Connection,
    battery_id: &str,
    question_id: &str,
    selected_index: i32,
    is_correct: bool,
) -> Result<bool> {
    let options_raw: Option<String> = conn
        .query_row(
            "SELECT options FROM quiz_questions WHERE id = ? AND battery_id = ? AND deleted_at IS NULL",
            params![question_id, battery_id],
            |row| row.get(0),
        )
        .ok();

    let options_str = match options_raw {
        Some(s) => s,
        None => return Err(SynapseError::NotFound("Question not found in battery".into())),
    };

    let options_val: Value = serde_json::from_str(&options_str)
        .map_err(|e| SynapseError::Validation(format!("Corrupt options JSON: {}", e)))?;
    let options_arr = options_val.as_array()
        .ok_or_else(|| SynapseError::Validation("Options must be an array".into()))?;

    if selected_index < 0 || selected_index as usize >= options_arr.len() {
        return Err(SynapseError::Validation("Invalid selected_index".into()));
    }

    let user_answer = options_arr[selected_index as usize]
        .as_str()
        .unwrap_or("")
        .to_string();

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let count = conn.execute(
        "INSERT INTO quiz_attempts (id, question_id, battery_id, type, selected_index, user_typed_answer, user_answer, is_correct, duration_ms, created_at) 
         VALUES (?, ?, ?, 'multiple_choice', ?, '', ?, ?, 0, ?)",
        params![id, question_id, battery_id, selected_index, user_answer, if is_correct { 1 } else { 0 }, now],
    )?;

    Ok(count > 0)
}

pub fn get_quiz_stats(conn: &rusqlite::Connection) -> Result<QuizStats> {
    let total_batteries: i64 = conn
        .query_row(
            "SELECT count(*) FROM quiz_batteries WHERE deleted_at IS NULL",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let total_questions: i64 = conn
        .query_row(
            "SELECT count(*) FROM quiz_questions q 
             INNER JOIN quiz_batteries b ON b.id = q.battery_id 
             WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let (total_attempts, historical_incorrect): (i64, i64) = conn
        .query_row(
            "SELECT count(*), COALESCE(SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END), 0) FROM quiz_attempts",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap_or((0, 0));

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
        .unwrap_or((0, 0, 0));

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
        .unwrap_or(0);

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
