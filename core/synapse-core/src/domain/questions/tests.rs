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
    let bat_id = QuizRepository::create_quiz_battery(&db, "Rust Concurrency", Some("Tests sync primitives")).unwrap();
    assert!(!bat_id.is_empty());

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
    ).unwrap();

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
    let recorded_correct = QuizRepository::record_quiz_attempt(&db, &bat_id, &q_id, 2, true).unwrap();
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
