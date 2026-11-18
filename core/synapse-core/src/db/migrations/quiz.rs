use rusqlite::Connection;

use super::add_column_if_missing;

fn migrate_legacy_quiz_answers(
    conn: &Connection,
    question_index_added: bool,
    attempt_index_added: bool,
) -> Result<(), String> {
    if question_index_added {
        let legacy_questions = {
            let mut statement = conn
                .prepare("SELECT id, options, correct_answer, type FROM quiz_questions")
                .map_err(|error| format!("Failed to read legacy quiz questions: {error}"))?;
            statement
                .query_map([], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                        row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                        row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                    ))
                })
                .and_then(|rows| rows.collect::<Result<Vec<_>, _>>())
                .map_err(|error| format!("Failed to decode legacy quiz questions: {error}"))?
        };

        for (id, options_json, correct_answer, question_type) in legacy_questions {
            let options = match serde_json::from_str::<Vec<String>>(&options_json) {
                Ok(options) => options,
                Err(error) => {
                    log::warn!(
                        "Preserving quiz question answer because options JSON is invalid: {error}"
                    );
                    continue;
                }
            };
            let answer = correct_answer.trim();
            let matched_index = options
                .iter()
                .position(|option| option.trim() == answer)
                .or_else(|| {
                    answer
                        .parse::<usize>()
                        .ok()
                        .filter(|index| *index < options.len())
                });

            if let Some(index) = matched_index {
                conn.execute(
                    "UPDATE quiz_questions SET correct_index = ?, expected_answer = CASE WHEN type = 'open' THEN correct_answer ELSE expected_answer END WHERE id = ?",
                    (index as i64, id),
                )
                .map_err(|error| format!("Failed to migrate a legacy quiz answer: {error}"))?;
            } else if question_type == "open" && !answer.is_empty() {
                conn.execute(
                    "UPDATE quiz_questions SET expected_answer = correct_answer WHERE id = ?",
                    [id],
                )
                .map_err(|error| format!("Failed to migrate an open quiz answer: {error}"))?;
            }
        }
    }

    if attempt_index_added {
        let legacy_attempts = {
            let mut statement = conn
                .prepare(
                    "SELECT a.id, a.user_answer, q.options, q.type FROM quiz_attempts a LEFT JOIN quiz_questions q ON q.id = a.question_id",
                )
                .map_err(|error| format!("Failed to read legacy quiz attempts: {error}"))?;
            statement
                .query_map([], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                        row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                        row.get::<_, Option<String>>(3)?
                            .unwrap_or_else(|| "multiple_choice".to_owned()),
                    ))
                })
                .and_then(|rows| rows.collect::<Result<Vec<_>, _>>())
                .map_err(|error| format!("Failed to decode legacy quiz attempts: {error}"))?
        };

        for (id, user_answer, options_json, question_type) in legacy_attempts {
            let options = match serde_json::from_str::<Vec<String>>(&options_json) {
                Ok(options) => options,
                Err(error) => {
                    log::warn!(
                        "Preserving quiz attempt because question options JSON is invalid: {error}"
                    );
                    continue;
                }
            };
            let answer = user_answer.trim();
            let selected_index = options
                .iter()
                .position(|option| option.trim() == answer)
                .or_else(|| {
                    answer
                        .parse::<usize>()
                        .ok()
                        .filter(|index| *index < options.len())
                });
            let user_typed_answer = if question_type == "open" { answer } else { "" };

            conn.execute(
                "UPDATE quiz_attempts SET type = ?, selected_index = ?, user_typed_answer = ? WHERE id = ?",
                (question_type, selected_index.map(|index| index as i64), user_typed_answer, id),
            )
            .map_err(|error| format!("Failed to migrate a legacy quiz attempt: {error}"))?;
        }
    }

    Ok(())
}

pub fn migrate_quiz_schema(conn: &Connection) -> Result<(), String> {
    add_column_if_missing(
        conn,
        "quiz_questions",
        "correct_answer",
        "TEXT NOT NULL DEFAULT ''",
    )?;
    let question_index_added =
        add_column_if_missing(conn, "quiz_questions", "correct_index", "INTEGER DEFAULT 0")?;
    add_column_if_missing(conn, "quiz_questions", "expected_answer", "TEXT DEFAULT ''")?;
    add_column_if_missing(conn, "quiz_questions", "tags", "TEXT DEFAULT '[]'")?;
    add_column_if_missing(conn, "quiz_questions", "sort_order", "INTEGER DEFAULT 0")?;
    add_column_if_missing(
        conn,
        "quiz_attempts",
        "user_answer",
        "TEXT NOT NULL DEFAULT ''",
    )?;
    add_column_if_missing(
        conn,
        "quiz_attempts",
        "type",
        "TEXT DEFAULT 'multiple_choice'",
    )?;
    let attempt_index_added =
        add_column_if_missing(conn, "quiz_attempts", "selected_index", "INTEGER")?;
    add_column_if_missing(
        conn,
        "quiz_attempts",
        "user_typed_answer",
        "TEXT DEFAULT ''",
    )?;
    add_column_if_missing(conn, "quiz_attempts", "ai_feedback", "TEXT")?;
    add_column_if_missing(conn, "quiz_attempts", "duration_ms", "INTEGER DEFAULT 0")?;

    migrate_legacy_quiz_answers(conn, question_index_added, attempt_index_added)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::migrate_quiz_schema;
    use rusqlite::Connection;

    #[test]
    fn quiz_schema_migration_preserves_legacy_answers_and_attempts() {
        let connection = Connection::open_in_memory().expect("open in-memory database");
        connection
            .execute_batch(
                "CREATE TABLE quiz_questions (
                    id TEXT PRIMARY KEY,
                    battery_id TEXT NOT NULL,
                    type TEXT DEFAULT 'multiple_choice',
                    question TEXT NOT NULL,
                    options TEXT DEFAULT '[]',
                    correct_answer TEXT NOT NULL,
                    explanation TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    deleted_at TEXT
                );
                CREATE TABLE quiz_attempts (
                    id TEXT PRIMARY KEY,
                    battery_id TEXT NOT NULL,
                    question_id TEXT NOT NULL,
                    user_answer TEXT NOT NULL,
                    is_correct BOOLEAN NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                INSERT INTO quiz_questions (id, battery_id, question, options, correct_answer)
                    VALUES ('question-1', 'battery-1', 'Pick the second option', '[\"A\",\"B\"]', 'B');
                INSERT INTO quiz_attempts (id, battery_id, question_id, user_answer, is_correct)
                    VALUES ('attempt-1', 'battery-1', 'question-1', 'A', 0);",
            )
            .expect("create legacy quiz schema");

        migrate_quiz_schema(&connection).expect("migrate legacy quiz data");

        let correct_index: i64 = connection
            .query_row(
                "SELECT correct_index FROM quiz_questions WHERE id = 'question-1'",
                [],
                |row| row.get(0),
            )
            .expect("read migrated answer index");
        assert_eq!(correct_index, 1);

        let (selected_index, user_answer): (i64, String) = connection
            .query_row(
                "SELECT selected_index, user_answer FROM quiz_attempts WHERE id = 'attempt-1'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("read migrated attempt");
        assert_eq!(selected_index, 0);
        assert_eq!(user_answer, "A");

        migrate_quiz_schema(&connection).expect("rerun idempotent quiz migration");
        let persisted_index: i64 = connection
            .query_row(
                "SELECT correct_index FROM quiz_questions WHERE id = 'question-1'",
                [],
                |row| row.get(0),
            )
            .expect("read answer after idempotent migration");
        assert_eq!(persisted_index, 1);
    }

    #[test]
    fn quiz_schema_migration_reports_missing_tables() {
        let connection = Connection::open_in_memory().expect("open in-memory database");
        let error = migrate_quiz_schema(&connection).expect_err("missing tables must be reported");
        assert!(error.contains("quiz_questions"));
    }
}
