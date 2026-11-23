use crate::cmd_quiz::types::{parse_json_string_vec, QuizQuestionDto};
use crate::db::DbState;
use chrono::Utc;
use rusqlite::params;
use tauri::State;

pub fn map_question_row(row: &rusqlite::Row) -> rusqlite::Result<QuizQuestionDto> {
    let options_raw: Option<String> = row.get(4)?;
    let tags_raw: Option<String> = row.get(8)?;
    let now = Utc::now().to_rfc3339();

    Ok(QuizQuestionDto {
        id: row.get(0)?,
        battery_id: row.get(1)?,
        type_: row
            .get::<_, Option<String>>(2)?
            .unwrap_or_else(|| "multiple_choice".to_string()),
        question: row.get(3)?,
        options: parse_json_string_vec(options_raw),
        correct_index: row.get::<_, Option<i32>>(5)?.unwrap_or(0),
        expected_answer: row.get(6)?,
        explanation: row.get(7)?,
        tags: parse_json_string_vec(tags_raw),
        sort_order: row.get::<_, Option<i32>>(9)?.unwrap_or(0),
        created_at: row
            .get::<_, Option<String>>(10)?
            .unwrap_or_else(|| now.clone()),
        updated_at: row.get::<_, Option<String>>(11)?.unwrap_or(now),
        deleted_at: row.get(12)?,
    })
}

#[tauri::command]
pub async fn quiz_get_questions_by_battery(
    battery_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<QuizQuestionDto>, String> {
    db_state
        .read(move |conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, battery_id, type, question, options, correct_index, expected_answer, explanation, tags, sort_order, created_at, updated_at, deleted_at
                     FROM quiz_questions
                     WHERE battery_id = ?1 AND deleted_at IS NULL
                     ORDER BY sort_order ASC, created_at ASC",
                )
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map(params![battery_id], map_question_row)
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
pub async fn quiz_get_question_by_id(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<QuizQuestionDto>, String> {
    db_state
        .read(move |conn| {
            let res = conn.query_row(
                "SELECT id, battery_id, type, question, options, correct_index, expected_answer, explanation, tags, sort_order, created_at, updated_at, deleted_at
                 FROM quiz_questions
                 WHERE id = ?1 AND deleted_at IS NULL",
                params![id],
                map_question_row,
            );

            match res {
                Ok(q) => Ok(Some(q)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(e.to_string()),
            }
        })
        .await
}

fn upsert_question_conn(
    conn: &rusqlite::Connection,
    question: QuizQuestionDto,
    default_sort_order: i32,
) -> Result<QuizQuestionDto, String> {
    let now = Utc::now().to_rfc3339();
    let id = if question.id.trim().is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        question.id.clone()
    };

    let existing: Option<QuizQuestionDto> = conn
        .query_row(
            "SELECT id, battery_id, type, question, options, correct_index, expected_answer, explanation, tags, sort_order, created_at, updated_at, deleted_at
             FROM quiz_questions WHERE id = ?1",
            params![id],
            map_question_row,
        )
        .ok();

    let battery_id = if question.battery_id.trim().is_empty() {
        existing
            .as_ref()
            .map(|e| e.battery_id.clone())
            .unwrap_or_default()
    } else {
        question.battery_id
    };

    let q_type = if question.type_.trim().is_empty() {
        existing
            .as_ref()
            .map(|e| e.type_.clone())
            .unwrap_or_else(|| "multiple_choice".to_string())
    } else {
        question.type_
    };

    let q_text = {
        let t = question.question.trim();
        if t.is_empty() {
            existing
                .as_ref()
                .map(|e| e.question.clone())
                .unwrap_or_default()
        } else {
            t.to_string()
        }
    };

    let options = if question.options.is_empty() {
        existing
            .as_ref()
            .map(|e| e.options.clone())
            .unwrap_or_default()
    } else {
        question.options
    };
    let options_json = serde_json::to_string(&options).unwrap_or_else(|_| "[]".to_string());
    let correct_index = question.correct_index;
    let correct_answer = options
        .get(correct_index.max(0) as usize)
        .cloned()
        .unwrap_or_default();

    let expected_answer = question
        .expected_answer
        .or_else(|| existing.as_ref().and_then(|e| e.expected_answer.clone()))
        .unwrap_or_default();
    let explanation = question
        .explanation
        .or_else(|| existing.as_ref().and_then(|e| e.explanation.clone()))
        .unwrap_or_default();
    let tags = if question.tags.is_empty() {
        existing
            .as_ref()
            .map(|e| e.tags.clone())
            .unwrap_or_default()
    } else {
        question.tags
    };
    let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string());
    let sort_order = if question.sort_order != 0 {
        question.sort_order
    } else {
        existing
            .as_ref()
            .map(|e| e.sort_order)
            .unwrap_or(default_sort_order)
    };
    let created_at = existing
        .as_ref()
        .map(|e| e.created_at.clone())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| {
            if question.created_at.is_empty() {
                now.clone()
            } else {
                question.created_at
            }
        });

    conn.execute(
        "INSERT INTO quiz_questions (id, battery_id, type, question, options, correct_answer, correct_index, expected_answer, explanation, tags, sort_order, created_at, updated_at, deleted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, NULL)
         ON CONFLICT(id) DO UPDATE SET
            battery_id = excluded.battery_id,
            type = excluded.type,
            question = excluded.question,
            options = excluded.options,
            correct_answer = excluded.correct_answer,
            correct_index = excluded.correct_index,
            expected_answer = excluded.expected_answer,
            explanation = excluded.explanation,
            tags = excluded.tags,
            sort_order = excluded.sort_order,
            updated_at = excluded.updated_at,
            deleted_at = NULL",
        params![
            id,
            battery_id,
            q_type,
            q_text,
            options_json,
            correct_answer,
            correct_index,
            expected_answer,
            explanation,
            tags_json,
            sort_order,
            created_at,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(QuizQuestionDto {
        id,
        battery_id,
        type_: q_type,
        question: q_text,
        options,
        correct_index,
        expected_answer: Some(expected_answer),
        explanation: Some(explanation),
        tags,
        sort_order,
        created_at,
        updated_at: now,
        deleted_at: None,
    })
}

#[tauri::command]
pub async fn quiz_save_question(
    question: QuizQuestionDto,
    db_state: State<'_, DbState>,
) -> Result<QuizQuestionDto, String> {
    db_state
        .write(move |conn| upsert_question_conn(conn, question, 0))
        .await
}

#[tauri::command]
pub async fn quiz_save_questions_batch(
    questions: Vec<QuizQuestionDto>,
    db_state: State<'_, DbState>,
) -> Result<Vec<QuizQuestionDto>, String> {
    db_state
        .write(move |conn| {
            let tx = conn.transaction().map_err(|e| e.to_string())?;
            let mut saved = Vec::with_capacity(questions.len());
            for (idx, q) in questions.into_iter().enumerate() {
                saved.push(upsert_question_conn(&tx, q, idx as i32)?);
            }
            tx.commit().map_err(|e| e.to_string())?;
            Ok(saved)
        })
        .await
}

#[tauri::command]
pub async fn quiz_delete_question(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            let now = Utc::now().to_rfc3339();

            let count = conn
                .execute(
                    "UPDATE quiz_questions SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
                    params![now, id],
                )
                .map_err(|e| e.to_string())?;

            Ok(count > 0)
        })
        .await
}
