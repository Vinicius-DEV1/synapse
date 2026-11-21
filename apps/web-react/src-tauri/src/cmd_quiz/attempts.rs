use crate::cmd_quiz::types::QuizAttemptDto;
use crate::db::DbState;
use chrono::Utc;
use rusqlite::params;
use serde_json::Value;
use std::collections::HashMap;
use tauri::State;

pub fn map_attempt_row(row: &rusqlite::Row) -> rusqlite::Result<QuizAttemptDto> {
    let is_correct_int: i32 = row.get(6).unwrap_or(0);
    let ai_raw: Option<String> = row.get(7)?;
    let ai_feedback = ai_raw
        .filter(|s| !s.trim().is_empty())
        .and_then(|s| serde_json::from_str::<Value>(&s).ok());

    Ok(QuizAttemptDto {
        id: row.get(0)?,
        question_id: row.get(1)?,
        battery_id: row.get(2)?,
        type_: row
            .get::<_, Option<String>>(3)?
            .unwrap_or_else(|| "multiple_choice".to_string()),
        selected_index: row.get(4)?,
        user_typed_answer: row.get(5)?,
        is_correct: is_correct_int != 0,
        ai_feedback,
        duration_ms: row.get(8).ok(),
        created_at: row
            .get::<_, Option<String>>(9)?
            .unwrap_or_else(|| Utc::now().to_rfc3339()),
    })
}

#[tauri::command]
pub async fn quiz_save_attempt(
    attempt: QuizAttemptDto,
    db_state: State<'_, DbState>,
) -> Result<QuizAttemptDto, String> {
    db_state
        .write(move |conn| {
            let id = if attempt.id.trim().is_empty() {
                uuid::Uuid::new_v4().to_string()
            } else {
                attempt.id.clone()
            };
            let created_at = if attempt.created_at.trim().is_empty() {
                Utc::now().to_rfc3339()
            } else {
                attempt.created_at.clone()
            };
            let a_type = if attempt.type_.trim().is_empty() {
                "multiple_choice".to_string()
            } else {
                attempt.type_.clone()
            };
            let user_typed = attempt.user_typed_answer.clone().unwrap_or_default();
            let ai_feedback_str = attempt
                .ai_feedback
                .as_ref()
                .and_then(|v| serde_json::to_string(v).ok());
            let duration_ms = attempt.duration_ms.unwrap_or(0);
            let is_correct_int = if attempt.is_correct { 1 } else { 0 };

            conn.execute(
                "INSERT INTO quiz_attempts (id, question_id, battery_id, type, selected_index, user_typed_answer, user_answer, is_correct, ai_feedback, duration_ms, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7, ?8, ?9, ?10)
                 ON CONFLICT(id) DO UPDATE SET
                    selected_index = excluded.selected_index,
                    user_typed_answer = excluded.user_typed_answer,
                    is_correct = excluded.is_correct,
                    ai_feedback = excluded.ai_feedback,
                    duration_ms = excluded.duration_ms,
                    created_at = excluded.created_at",
                params![
                    id,
                    attempt.question_id,
                    attempt.battery_id,
                    a_type,
                    attempt.selected_index,
                    user_typed,
                    is_correct_int,
                    ai_feedback_str,
                    duration_ms,
                    created_at
                ],
            )
            .map_err(|e| e.to_string())?;

            Ok(QuizAttemptDto {
                id,
                question_id: attempt.question_id,
                battery_id: attempt.battery_id,
                type_: a_type,
                selected_index: attempt.selected_index,
                user_typed_answer: Some(user_typed),
                is_correct: attempt.is_correct,
                ai_feedback: attempt.ai_feedback,
                duration_ms: Some(duration_ms),
                created_at,
            })
        })
        .await
}

pub fn load_latest_attempts_conn(
    conn: &rusqlite::Connection,
    battery_id: Option<&str>,
) -> Result<HashMap<String, QuizAttemptDto>, String> {
    let mut map: HashMap<String, QuizAttemptDto> = HashMap::new();

    if let Some(bid) = battery_id {
        let mut stmt = conn
            .prepare(
                "SELECT id, question_id, battery_id, type, selected_index, user_typed_answer, is_correct, ai_feedback, duration_ms, created_at
                 FROM quiz_attempts
                 WHERE battery_id = ?1
                 ORDER BY created_at ASC, rowid ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![bid], map_attempt_row)
            .map_err(|e| e.to_string())?;
        for r in rows.flatten() {
            map.insert(r.question_id.clone(), r);
        }
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, question_id, battery_id, type, selected_index, user_typed_answer, is_correct, ai_feedback, duration_ms, created_at
                 FROM quiz_attempts
                 ORDER BY created_at ASC, rowid ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], map_attempt_row)
            .map_err(|e| e.to_string())?;
        for r in rows.flatten() {
            map.insert(r.question_id.clone(), r);
        }
    }

    Ok(map)
}

#[tauri::command]
pub async fn quiz_get_latest_attempts(
    battery_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<HashMap<String, QuizAttemptDto>, String> {
    db_state
        .read(move |conn| load_latest_attempts_conn(conn, battery_id.as_deref()))
        .await
}

#[tauri::command]
pub async fn quiz_get_attempts_by_question(
    question_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<QuizAttemptDto>, String> {
    db_state
        .read(move |conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, question_id, battery_id, type, selected_index, user_typed_answer, is_correct, ai_feedback, duration_ms, created_at
                     FROM quiz_attempts
                     WHERE question_id = ?1
                     ORDER BY created_at DESC, rowid DESC",
                )
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map(params![question_id], map_attempt_row)
                .map_err(|e| e.to_string())?;

            let mut list = Vec::new();
            for r in rows.flatten() {
                list.push(r);
            }
            Ok(list)
        })
        .await
}

#[tauri::command]
pub async fn quiz_get_wrong_attempts(
    db_state: State<'_, DbState>,
) -> Result<Vec<QuizAttemptDto>, String> {
    db_state
        .read(|conn| {
            let latest = load_latest_attempts_conn(conn, None)?;
            Ok(latest.into_values().filter(|a| !a.is_correct).collect())
        })
        .await
}
