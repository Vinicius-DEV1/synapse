use super::models::QuizQuestion;
use crate::error::Result;
use rusqlite::params;
use serde_json::Value;

pub fn get_battery_questions(
    conn: &rusqlite::Connection,
    battery_id: &str,
) -> Result<Vec<QuizQuestion>> {
    let mut stmt = conn.prepare(
        "SELECT id, battery_id, type, question, options, correct_index, expected_answer, explanation, tags, sort_order
         FROM quiz_questions
         WHERE battery_id = ? AND deleted_at IS NULL
         ORDER BY sort_order ASC, created_at ASC, id ASC",
    )?;

    let questions = stmt
        .query_map(params![battery_id], |row| {
            Ok(QuizQuestion {
                id: row.get(0)?,
                battery_id: row.get(1)?,
                type_: row.get(2)?,
                question: row.get(3)?,
                options: row.get(4)?,
                correct_index: row.get(5)?,
                expected_answer: row.get(6)?,
                explanation: row.get(7)?,
                tags: row.get(8)?,
                sort_order: row.get(9)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(questions)
}

pub fn get_all_quiz_questions(conn: &rusqlite::Connection) -> Result<Vec<QuizQuestion>> {
    let mut stmt = conn.prepare(
        "SELECT q.id, q.battery_id, q.type, q.question, q.options, q.correct_index, q.expected_answer, q.explanation, q.tags, q.sort_order
         FROM quiz_questions q
         INNER JOIN quiz_batteries b ON b.id = q.battery_id
         WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL
         ORDER BY b.sort_order ASC, q.sort_order ASC, q.created_at ASC, q.id ASC",
    )?;

    let questions = stmt
        .query_map([], |row| {
            Ok(QuizQuestion {
                id: row.get(0)?,
                battery_id: row.get(1)?,
                type_: row.get(2)?,
                question: row.get(3)?,
                options: row.get(4)?,
                correct_index: row.get(5)?,
                expected_answer: row.get(6)?,
                explanation: row.get(7)?,
                tags: row.get(8)?,
                sort_order: row.get(9)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(questions)
}

pub fn get_all_quiz_tags(conn: &rusqlite::Connection) -> Result<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT q.tags FROM quiz_questions q
         INNER JOIN quiz_batteries b ON b.id = q.battery_id
         WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL",
    )?;

    let mut seen = std::collections::HashSet::new();
    let mut tags = Vec::new();

    let rows = stmt.query_map([], |row| {
        let raw_tags: Option<String> = row.get(0)?;
        Ok(raw_tags)
    })?;

    for r in rows {
        if let Ok(Some(raw)) = r {
            if let Ok(Value::Array(arr)) = serde_json::from_str::<Value>(&raw) {
                for item in arr {
                    if let Some(s) = item.as_str() {
                        let trimmed = s.trim();
                        let lower = trimmed.to_lowercase();
                        if !trimmed.is_empty() && !seen.contains(&lower) {
                            seen.insert(lower);
                            tags.push(trimmed.to_string());
                        }
                    }
                }
            }
        }
    }

    tags.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(tags)
}

pub fn get_error_notebook_questions(conn: &rusqlite::Connection) -> Result<Vec<QuizQuestion>> {
    let mut stmt = conn.prepare(
        "SELECT q.id, q.battery_id, q.type, q.question, q.options, q.correct_index, q.expected_answer, q.explanation, q.tags, q.sort_order
         FROM quiz_questions q
         INNER JOIN quiz_batteries b ON b.id = q.battery_id
         INNER JOIN quiz_attempts a ON q.id = a.question_id
         WHERE a.is_correct = 0 AND q.deleted_at IS NULL AND b.deleted_at IS NULL AND q.type = 'multiple_choice'
           AND NOT EXISTS (
               SELECT 1 FROM quiz_attempts newer
               WHERE newer.question_id = a.question_id
                 AND (newer.created_at > a.created_at OR (newer.created_at = a.created_at AND newer.rowid > a.rowid))
           )
         ORDER BY a.created_at DESC, a.rowid DESC",
    )?;

    let questions = stmt
        .query_map([], |row| {
            Ok(QuizQuestion {
                id: row.get(0)?,
                battery_id: row.get(1)?,
                type_: row.get(2)?,
                question: row.get(3)?,
                options: row.get(4)?,
                correct_index: row.get(5)?,
                expected_answer: row.get(6)?,
                explanation: row.get(7)?,
                tags: row.get(8)?,
                sort_order: row.get(9)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(questions)
}

pub fn get_random_simulation_questions(
    conn: &rusqlite::Connection,
    limit: i32,
) -> Result<Vec<QuizQuestion>> {
    let safe_limit = limit.clamp(1, 500);
    let mut stmt = conn.prepare(
        "SELECT q.id, q.battery_id, q.type, q.question, q.options, q.correct_index, q.expected_answer, q.explanation, q.tags, q.sort_order
         FROM quiz_questions q
         INNER JOIN quiz_batteries b ON b.id = q.battery_id
         WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL AND q.type = 'multiple_choice'
         ORDER BY RANDOM() LIMIT ?",
    )?;

    let questions = stmt
        .query_map(params![safe_limit], |row| {
            Ok(QuizQuestion {
                id: row.get(0)?,
                battery_id: row.get(1)?,
                type_: row.get(2)?,
                question: row.get(3)?,
                options: row.get(4)?,
                correct_index: row.get(5)?,
                expected_answer: row.get(6)?,
                explanation: row.get(7)?,
                tags: row.get(8)?,
                sort_order: row.get(9)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(questions)
}

pub fn get_filtered_quiz_questions(
    conn: &rusqlite::Connection,
    tags_json: Option<&str>,
    status: Option<&str>,
    limit: i32,
    shuffle: bool,
) -> Result<Vec<QuizQuestion>> {
    let norm_status = match status.unwrap_or("all") {
        "unanswered" => "unanswered",
        "incorrect" => "incorrect",
        _ => "all",
    };

    let sql = "SELECT q.id, q.battery_id, q.type, q.question, q.options, q.correct_index, q.expected_answer, q.explanation, q.tags, q.sort_order
               FROM quiz_questions q
               INNER JOIN quiz_batteries b ON b.id = q.battery_id
               WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL AND q.type = 'multiple_choice'
                 AND (?1 = 'all' OR (?1 = 'unanswered' AND NOT EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.question_id = q.id))
                 OR (?1 = 'incorrect' AND EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.question_id = q.id AND a.is_correct = 0
                 AND NOT EXISTS (SELECT 1 FROM quiz_attempts newer WHERE newer.question_id = a.question_id
                 AND (newer.created_at > a.created_at OR (newer.created_at = a.created_at AND newer.rowid > a.rowid))))))
               ORDER BY b.sort_order ASC, q.sort_order ASC, q.created_at ASC, q.id ASC";

    let mut stmt = conn.prepare(sql)?;
    let mut questions: Vec<QuizQuestion> = stmt
        .query_map(params![norm_status], |row| {
            Ok(QuizQuestion {
                id: row.get(0)?,
                battery_id: row.get(1)?,
                type_: row.get(2)?,
                question: row.get(3)?,
                options: row.get(4)?,
                correct_index: row.get(5)?,
                expected_answer: row.get(6)?,
                explanation: row.get(7)?,
                tags: row.get(8)?,
                sort_order: row.get(9)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    // Filter by tags if provided
    let mut selected_tags = std::collections::HashSet::new();
    if let Some(t_json) = tags_json.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        if let Ok(Value::Array(arr)) = serde_json::from_str::<Value>(t_json) {
            for item in arr {
                if let Some(s) = item.as_str() {
                    let trimmed = s.trim();
                    if !trimmed.is_empty() {
                        selected_tags.insert(trimmed.to_lowercase());
                    }
                }
            }
        }
    }

    if !selected_tags.is_empty() {
        questions.retain(|q| {
            if let Some(q_tags_str) = &q.tags {
                if let Ok(Value::Array(q_arr)) = serde_json::from_str::<Value>(q_tags_str) {
                    for tag_val in q_arr {
                        if let Some(tag_str) = tag_val.as_str() {
                            if selected_tags.contains(&tag_str.trim().to_lowercase()) {
                                return true;
                            }
                        }
                    }
                }
            }
            false
        });
    }

    if shuffle && questions.len() > 1 {
        use rand::seq::SliceRandom;
        let mut rng = rand::thread_rng();
        questions.shuffle(&mut rng);
    }

    if limit > 0 && questions.len() > limit as usize {
        questions.truncate(limit as usize);
    }

    Ok(questions)
}
