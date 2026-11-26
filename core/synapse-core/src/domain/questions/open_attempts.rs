use super::models::{QuizAiFeedback, QuizAttemptDetail, QuizOpenAnswerAttempt};
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::{params, types::Type, OptionalExtension};

pub fn record_open_answer_attempt(
    conn: &rusqlite::Connection,
    battery_id: &str,
    question_id: &str,
    user_typed_answer: &str,
    feedback: QuizAiFeedback,
) -> Result<QuizOpenAnswerAttempt> {
    let battery_id = battery_id.trim();
    let question_id = question_id.trim();
    let answer = user_typed_answer.trim();
    let verdict = feedback.verdict.trim();
    let feedback_text = feedback.feedback.trim();

    if battery_id.is_empty() || question_id.is_empty() || answer.is_empty() {
        return Err(SynapseError::Validation(
            "Battery, question, and open answer are required".into(),
        ));
    }
    if !matches!(verdict, "Correto" | "Parcial" | "Incorreto") || feedback_text.is_empty() {
        return Err(SynapseError::Validation(
            "Open answer feedback must include a supported verdict and feedback text".into(),
        ));
    }

    let question_type = conn
        .query_row(
            "SELECT q.type FROM quiz_questions q
             INNER JOIN quiz_batteries b ON b.id = q.battery_id
             WHERE q.id = ? AND q.battery_id = ?
               AND q.deleted_at IS NULL AND b.deleted_at IS NULL",
            params![question_id, battery_id],
            |row| row.get::<_, String>(0),
        )
        .optional()?
        .ok_or_else(|| SynapseError::NotFound("Open question not found in battery".into()))?;
    if question_type != "open" {
        return Err(SynapseError::Validation(
            "Open answer attempts require an open question".into(),
        ));
    }

    let feedback = QuizAiFeedback {
        verdict: verdict.to_owned(),
        feedback: feedback_text.to_owned(),
        model: feedback
            .model
            .map(|model| model.trim().to_owned())
            .filter(|model| !model.is_empty()),
    };
    let feedback_json = serde_json::to_string(&feedback)
        .map_err(|error| SynapseError::Internal(error.to_string()))?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();
    let is_correct = feedback.verdict == "Correto";
    let transaction = conn.unchecked_transaction()?;
    transaction.execute(
        "INSERT INTO quiz_attempts
         (id, question_id, battery_id, type, selected_index, user_typed_answer,
          user_answer, is_correct, ai_feedback, duration_ms, created_at)
         VALUES (?, ?, ?, 'open', NULL, ?, ?, ?, ?, 0, ?)",
        params![
            id,
            question_id,
            battery_id,
            answer,
            answer,
            if is_correct { 1 } else { 0 },
            feedback_json,
            created_at,
        ],
    )?;
    transaction.commit()?;

    Ok(QuizOpenAnswerAttempt {
        id,
        question_id: question_id.to_owned(),
        battery_id: battery_id.to_owned(),
        user_typed_answer: answer.to_owned(),
        is_correct,
        ai_feedback: feedback,
        duration_ms: 0,
        created_at,
    })
}

pub fn get_latest_quiz_attempts(
    conn: &rusqlite::Connection,
    battery_id: Option<&str>,
    question_id: Option<&str>,
) -> Result<Vec<QuizAttemptDetail>> {
    if battery_id.is_none() && question_id.is_none() {
        return Err(SynapseError::Validation(
            "A battery or question ID is required for targeted attempt lookup".into(),
        ));
    }

    let battery_filter = if battery_id.is_some() {
        "AND a.battery_id = ?1"
    } else {
        "AND ?1 IS NULL"
    };
    let question_filter = if question_id.is_some() {
        "AND a.question_id = ?2"
    } else {
        "AND ?2 IS NULL"
    };
    let query = format!(
        "SELECT a.id, a.question_id, a.battery_id, COALESCE(q.question, ''), a.type,
                a.selected_index, a.user_typed_answer, a.user_answer,
                COALESCE(q.correct_answer, ''), q.explanation, a.is_correct,
                COALESCE(a.duration_ms, 0), a.created_at, a.ai_feedback
         FROM quiz_attempts a
         LEFT JOIN quiz_questions q ON q.id = a.question_id
         WHERE a.deleted_at IS NULL
           {battery_filter}
           {question_filter}
           AND NOT EXISTS (
               SELECT 1 FROM quiz_attempts newer
               WHERE newer.question_id = a.question_id
                 AND newer.deleted_at IS NULL
                 AND (newer.created_at > a.created_at
                      OR (newer.created_at = a.created_at AND newer.rowid > a.rowid))
           )
         ORDER BY a.created_at DESC, a.rowid DESC
         "
    );
    let mut statement = conn.prepare(&query)?;
    let rows = statement.query_map(params![battery_id, question_id], |row| {
        let feedback_json: Option<String> = row.get(13)?;
        let ai_feedback = feedback_json
            .map(|value| {
                serde_json::from_str::<QuizAiFeedback>(&value).map_err(|error| {
                    rusqlite::Error::FromSqlConversionFailure(13, Type::Text, Box::new(error))
                })
            })
            .transpose()?;
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
            ai_feedback,
        })
    })?;
    rows.collect::<std::result::Result<Vec<_>, _>>()
        .map_err(Into::into)
}
