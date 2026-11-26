use super::{QuizAiFeedback, QuizRepository};
use crate::db::Database;
use rusqlite::params;
use tempfile::NamedTempFile;

fn create_open_question() -> (NamedTempFile, Database, String, String) {
    let file = NamedTempFile::new().unwrap();
    let db = Database::open(file.path()).unwrap();
    let battery_id = QuizRepository::create_quiz_battery(&db, "Notes practice", None).unwrap();
    let question_id = QuizRepository::create_quiz_question(
        &db,
        &battery_id,
        "Explain the idea",
        r#"["A", "B"]"#,
        0,
        None,
        None,
    )
    .unwrap();
    db.lock()
        .unwrap()
        .execute(
            "UPDATE quiz_questions SET type = 'open', expected_answer = ? WHERE id = ?",
            params!["A complete model answer", question_id],
        )
        .unwrap();
    (file, db, battery_id, question_id)
}

fn feedback(verdict: &str, text: &str) -> QuizAiFeedback {
    QuizAiFeedback {
        verdict: verdict.to_owned(),
        feedback: text.to_owned(),
        model: Some("gemini-flash-latest".into()),
    }
}

#[test]
fn records_open_answer_and_reads_latest_feedback_by_question() {
    let (_file, db, battery_id, question_id) = create_open_question();
    let first = QuizRepository::record_open_answer_attempt(
        &db,
        &battery_id,
        &question_id,
        "  My first answer  ",
        feedback("Parcial", "Add the missing detail."),
    )
    .unwrap();
    assert_eq!(first.user_typed_answer, "My first answer");
    assert!(!first.is_correct);

    let latest = QuizRepository::record_open_answer_attempt(
        &db,
        &battery_id,
        &question_id,
        "My revised answer",
        feedback("Correto", "This answer covers the key concept."),
    )
    .unwrap();
    assert!(latest.is_correct);

    let attempts = QuizRepository::get_latest_quiz_attempts(&db, Some(&battery_id), None).unwrap();
    assert_eq!(attempts.len(), 1);
    assert_eq!(attempts[0].id, latest.id);
    assert_eq!(
        attempts[0].user_typed_answer.as_deref(),
        Some("My revised answer")
    );
    assert_eq!(attempts[0].ai_feedback.as_ref().unwrap().verdict, "Correto");

    let question_attempts = QuizRepository::get_latest_quiz_attempts(
        &db,
        None,
        Some(&question_id),
    )
    .unwrap();
    assert_eq!(question_attempts.len(), 1);
    assert_eq!(question_attempts[0].id, latest.id);
}

#[test]
fn restores_latest_open_answer_attempt_after_database_reopen() {
    let (file, db, battery_id, question_id) = create_open_question();
    let saved = QuizRepository::record_open_answer_attempt(
        &db,
        &battery_id,
        &question_id,
        "My saved response",
        feedback("Parcial", "Include the second part of the explanation."),
    )
    .unwrap();

    drop(db);
    let reopened_db = Database::open(file.path()).unwrap();
    let restored = QuizRepository::get_latest_quiz_attempts(
        &reopened_db,
        Some(&battery_id),
        Some(&question_id),
    )
    .unwrap();

    assert_eq!(restored.len(), 1);
    assert_eq!(restored[0].id, saved.id);
    assert_eq!(restored[0].type_, "open");
    assert_eq!(restored[0].user_typed_answer.as_deref(), Some("My saved response"));
    assert_eq!(restored[0].ai_feedback.as_ref().unwrap().verdict, "Parcial");
    assert_eq!(
        restored[0].ai_feedback.as_ref().unwrap().feedback,
        "Include the second part of the explanation."
    );
}

#[test]
fn rejects_invalid_verdict_empty_answer_and_multiple_choice_target() {
    let (_file, db, battery_id, open_question_id) = create_open_question();
    assert!(QuizRepository::record_open_answer_attempt(
        &db,
        &battery_id,
        &open_question_id,
        " ",
        feedback("Incorreto", "Try again."),
    )
    .is_err());
    assert!(QuizRepository::record_open_answer_attempt(
        &db,
        &battery_id,
        &open_question_id,
        "My answer",
        feedback("unknown", "Try again."),
    )
    .is_err());

    let multiple_choice_id = QuizRepository::create_quiz_question(
        &db,
        &battery_id,
        "Choose one",
        r#"["A", "B"]"#,
        0,
        None,
        None,
    )
    .unwrap();
    assert!(QuizRepository::record_open_answer_attempt(
        &db,
        &battery_id,
        &multiple_choice_id,
        "My answer",
        feedback("Correto", "Feedback."),
    )
    .is_err());
    assert!(QuizRepository::get_latest_quiz_attempts(&db, None, None).is_err());
}
