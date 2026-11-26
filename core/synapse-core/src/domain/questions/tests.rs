use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_quiz_lifecycle_and_error_notebook() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();

    // 1. Initial list empty
    let batteries = QuizRepository::get_quiz_batteries(&db).unwrap();
    assert!(batteries.is_empty());

    // 2. Create battery
    let bat_id =
        QuizRepository::create_quiz_battery(&db, "Rust Concurrency", Some("Tests sync primitives"))
            .unwrap();
    assert!(!bat_id.is_empty());
    let battery = QuizRepository::get_quiz_battery(&db, &bat_id)
        .unwrap()
        .unwrap();
    assert_eq!(battery.id, bat_id);
    assert_eq!(battery.title, "Rust Concurrency");
    assert!(battery.page_id.is_none());
    assert!(battery.page_title.is_none());
    assert!(QuizRepository::get_quiz_battery(&db, "missing-battery")
        .unwrap()
        .is_none());

    let batteries = QuizRepository::get_quiz_batteries(&db).unwrap();
    assert_eq!(batteries.len(), 1);
    assert_eq!(batteries[0].title, "Rust Concurrency");
    assert_eq!(batteries[0].question_count, 0);

    // 3. Create question
    let options = r#"["Mutex", "RwLock", "Rc", "Arc"]"#;
    let tags = r#"["rust", "concurrency"]"#;
    let q_id = QuizRepository::create_quiz_question(
        &db,
        &bat_id,
        "Which type is NOT thread-safe?",
        options,
        2, // Rc
        Some("Rc is single-threaded reference counted"),
        Some(tags),
    )
    .unwrap();
    let question = QuizRepository::get_quiz_question(&db, &q_id)
        .unwrap()
        .unwrap();
    assert_eq!(question.id, q_id);
    assert_eq!(question.battery_id, bat_id);
    assert_eq!(question.question, "Which type is NOT thread-safe?");
    assert!(QuizRepository::get_quiz_question(&db, "missing-question")
        .unwrap()
        .is_none());

    let questions = QuizRepository::get_battery_questions(&db, &bat_id).unwrap();
    assert_eq!(questions.len(), 1);
    assert_eq!(questions[0].correct_index, Some(2));

    // 4. Record incorrect attempt
    let recorded = QuizRepository::record_quiz_attempt(&db, &bat_id, &q_id, 0, false).unwrap();
    assert!(recorded);

    // Check error notebook
    let errors = QuizRepository::get_error_notebook_questions(&db).unwrap();
    assert_eq!(errors.len(), 1);
    assert_eq!(errors[0].id, q_id);

    // Check stats
    let stats = QuizRepository::get_quiz_stats(&db).unwrap();
    assert_eq!(stats.total_questions, 1);
    assert_eq!(stats.total_attempts, 1);
    assert_eq!(stats.reviewable_incorrect_questions, 1);
    assert_eq!(stats.accuracy_rate, 0);

    // 5. Record subsequent correct attempt
    let recorded_correct =
        QuizRepository::record_quiz_attempt(&db, &bat_id, &q_id, 2, true).unwrap();
    assert!(recorded_correct);

    // Error notebook should now be empty because latest attempt is correct
    let errors = QuizRepository::get_error_notebook_questions(&db).unwrap();
    assert!(errors.is_empty());

    let stats = QuizRepository::get_quiz_stats(&db).unwrap();
    assert_eq!(stats.total_attempts, 2);
    assert_eq!(stats.correct_attempts, 1);
    assert_eq!(stats.reviewable_incorrect_questions, 0);
    assert_eq!(stats.accuracy_rate, 100);
}

#[test]
fn test_create_quiz_battery_for_page_persists_sequential_battery_and_link_atomically() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();
    {
        let conn = db.lock().unwrap();
        conn.execute(
            "INSERT INTO pages (id, title) VALUES ('page-notes-1', 'Notes page')",
            [],
        )
        .unwrap();
    }

    let battery_id = QuizRepository::create_quiz_battery_for_page(
        &db,
        "Question battery",
        Some("Created from Notes"),
        "page-notes-1",
    )
    .unwrap();
    let conn = db.lock().unwrap();
    let (page_id, title, description, layout): (String, String, String, String) = conn
        .query_row(
            "SELECT page_id, title, description, layout FROM quiz_batteries WHERE id = ?",
            [&battery_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .unwrap();
    assert_eq!(page_id, "page-notes-1");
    assert_eq!(title, "Question battery");
    assert_eq!(description, "Created from Notes");
    assert_eq!(layout, "sequential");

    let link_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM quiz_page_links WHERE battery_id = ? AND page_id = ?",
            [&battery_id, &page_id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(link_count, 1);
    drop(conn);

    let battery = QuizRepository::get_quiz_battery(&db, &battery_id)
        .unwrap()
        .unwrap();
    assert_eq!(battery.page_id.as_deref(), Some("page-notes-1"));
    assert_eq!(battery.page_title.as_deref(), Some("Notes page"));
    let listed = QuizRepository::get_quiz_batteries(&db).unwrap();
    assert_eq!(listed[0].page_title.as_deref(), Some("Notes page"));
}

#[test]
fn test_create_quiz_battery_for_page_rejects_missing_page_without_partial_battery() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();

    let result =
        QuizRepository::create_quiz_battery_for_page(&db, "Orphan battery", None, "missing-page");
    assert!(result.is_err());
    let conn = db.lock().unwrap();
    let battery_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM quiz_batteries", [], |row| row.get(0))
        .unwrap();
    let link_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM quiz_page_links", [], |row| row.get(0))
        .unwrap();
    assert_eq!(battery_count, 0);
    assert_eq!(link_count, 0);
}
