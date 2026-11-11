use rusqlite::Connection;

fn table_columns(conn: &Connection, table: &str) -> Vec<String> {
    let sql = format!("PRAGMA table_info({table})");
    let Ok(mut statement) = conn.prepare(&sql) else {
        return Vec::new();
    };
    statement
        .query_map([], |row| row.get::<_, String>(1))
        .and_then(|rows| rows.collect())
        .unwrap_or_default()
}

fn add_column_if_missing(conn: &Connection, table: &str, column: &str, definition: &str) -> bool {
    if table_columns(conn, table).iter().any(|name| name == column) {
        return false;
    }

    let sql = format!("ALTER TABLE {table} ADD COLUMN {column} {definition}");
    match conn.execute(&sql, []) {
        Ok(_) => true,
        Err(error) => {
            log::warn!("Unable to migrate {table}.{column}: {error}");
            false
        }
    }
}

fn migrate_legacy_quiz_answers(
    conn: &Connection,
    question_index_added: bool,
    attempt_index_added: bool,
) {
    if question_index_added {
        let legacy_questions = conn
            .prepare("SELECT id, options, correct_answer, type FROM quiz_questions")
            .and_then(|mut statement| {
                statement
                    .query_map([], |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1).unwrap_or_default(),
                            row.get::<_, String>(2).unwrap_or_default(),
                            row.get::<_, String>(3).unwrap_or_default(),
                        ))
                    })?
                    .collect::<Result<Vec<_>, _>>()
            })
            .unwrap_or_default();

        for (id, options_json, correct_answer, question_type) in legacy_questions {
            let options = serde_json::from_str::<Vec<String>>(&options_json).unwrap_or_default();
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
                let _ = conn.execute(
                    "UPDATE quiz_questions SET correct_index = ?, expected_answer = CASE WHEN type = 'open' THEN correct_answer ELSE expected_answer END WHERE id = ?",
                    (index as i64, id),
                );
            } else if question_type == "open" && !answer.is_empty() {
                let _ = conn.execute(
                    "UPDATE quiz_questions SET expected_answer = correct_answer WHERE id = ?",
                    [id],
                );
            }
        }
    }

    if attempt_index_added {
        let legacy_attempts = conn
            .prepare(
                "SELECT a.id, a.user_answer, q.options, q.type FROM quiz_attempts a LEFT JOIN quiz_questions q ON q.id = a.question_id",
            )
            .and_then(|mut statement| {
                statement
                    .query_map([], |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1).unwrap_or_default(),
                            row.get::<_, String>(2).unwrap_or_default(),
                            row.get::<_, String>(3).unwrap_or_else(|_| "multiple_choice".to_owned()),
                        ))
                    })?
                    .collect::<Result<Vec<_>, _>>()
            })
            .unwrap_or_default();

        for (id, user_answer, options_json, question_type) in legacy_attempts {
            let options = serde_json::from_str::<Vec<String>>(&options_json).unwrap_or_default();
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
            let _ = conn.execute(
                "UPDATE quiz_attempts SET type = ?, selected_index = ?, user_typed_answer = ? WHERE id = ?",
                (question_type, selected_index.map(|index| index as i64), user_typed_answer, id),
            );
        }
    }
}

pub fn migrate_quiz_schema(conn: &Connection) {
    let _ = add_column_if_missing(
        conn,
        "quiz_questions",
        "correct_answer",
        "TEXT NOT NULL DEFAULT ''",
    );
    let question_index_added =
        add_column_if_missing(conn, "quiz_questions", "correct_index", "INTEGER DEFAULT 0");
    let _ = add_column_if_missing(conn, "quiz_questions", "expected_answer", "TEXT DEFAULT ''");
    let _ = add_column_if_missing(conn, "quiz_questions", "tags", "TEXT DEFAULT '[]'");
    let _ = add_column_if_missing(conn, "quiz_questions", "sort_order", "INTEGER DEFAULT 0");
    let _ = add_column_if_missing(
        conn,
        "quiz_attempts",
        "user_answer",
        "TEXT NOT NULL DEFAULT ''",
    );
    let _ = add_column_if_missing(
        conn,
        "quiz_attempts",
        "type",
        "TEXT DEFAULT 'multiple_choice'",
    );
    let attempt_index_added =
        add_column_if_missing(conn, "quiz_attempts", "selected_index", "INTEGER");
    let _ = add_column_if_missing(
        conn,
        "quiz_attempts",
        "user_typed_answer",
        "TEXT DEFAULT ''",
    );
    let _ = add_column_if_missing(conn, "quiz_attempts", "ai_feedback", "TEXT");
    let _ = add_column_if_missing(conn, "quiz_attempts", "duration_ms", "INTEGER DEFAULT 0");
    migrate_legacy_quiz_answers(conn, question_index_added, attempt_index_added);
    let _ = conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_quiz_questions_battery_deleted ON quiz_questions(battery_id, deleted_at, sort_order);
         CREATE INDEX IF NOT EXISTS idx_quiz_attempts_question_created ON quiz_attempts(question_id, created_at DESC);",
    );
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

        migrate_quiz_schema(&connection);

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

        migrate_quiz_schema(&connection);
        let persisted_index: i64 = connection
            .query_row(
                "SELECT correct_index FROM quiz_questions WHERE id = 'question-1'",
                [],
                |row| row.get(0),
            )
            .expect("read answer after idempotent migration");
        assert_eq!(persisted_index, 1);
    }
}
