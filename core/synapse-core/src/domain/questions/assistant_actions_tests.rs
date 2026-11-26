use super::{QuizAssistantQuestionAction, QuizRepository};
use crate::db::Database;
use tempfile::NamedTempFile;

fn setup() -> (NamedTempFile, Database, String) {
    let file = NamedTempFile::new().unwrap();
    let db = Database::open(file.path()).unwrap();
    let battery = QuizRepository::create_quiz_battery(&db, "Notes actions", None).unwrap();
    (file, db, battery)
}

fn action(value: serde_json::Value) -> QuizAssistantQuestionAction {
    serde_json::from_value(value).unwrap()
}

#[test]
fn applies_typed_create_edit_delete_and_partial_reorder_in_core() {
    let (_file, db, battery_id) = setup();
    let first_id = QuizRepository::create_quiz_question(
        &db,
        &battery_id,
        "First question",
        r#"["A", "B"]"#,
        0,
        None,
        None,
    )
    .unwrap();
    let second_id = QuizRepository::create_quiz_question(
        &db,
        &battery_id,
        "Second question",
        r#"["C", "D"]"#,
        1,
        None,
        None,
    )
    .unwrap();

    let reordered = QuizRepository::apply_quiz_assistant_actions(
        &db,
        &battery_id,
        &[
            action(serde_json::json!({
                "actionType": "edit",
                "targetQuestionId": first_id,
                "changes": { "type": "open", "expectedAnswer": "A model response", "explanation": "A concept note" }
            })),
            action(serde_json::json!({ "actionType": "reorder", "order": [second_id] })),
        ],
    ).unwrap();
    assert_eq!(reordered[0].id, second_id);
    assert_eq!(reordered[1].id, first_id);

    let updated = QuizRepository::apply_quiz_assistant_actions(
        &db,
        &battery_id,
        &[
            action(serde_json::json!({ "actionType": "delete", "targetQuestionId": second_id })),
            action(serde_json::json!({ "actionType": "create", "type": "open", "question": "New open question", "expectedAnswer": "New reference", "options": [] })),
            action(serde_json::json!({ "actionType": "reorder", "order": [second_id, first_id] })),
        ],
    ).unwrap();

    assert_eq!(updated.len(), 2);
    assert_eq!(updated[0].id, first_id);
    assert_eq!(updated[0].type_, "open");
    assert_eq!(updated[0].options, "[]");
    assert_eq!(
        updated[0].expected_answer.as_deref(),
        Some("A model response")
    );
    assert_eq!(updated[0].explanation.as_deref(), Some("A concept note"));
    assert_eq!(updated[0].sort_order, 0);
    assert_eq!(updated[1].question, "New open question");
    assert_eq!(updated[1].type_, "open");
    assert_eq!(updated[1].sort_order, 1);
}

#[test]
fn rolls_back_every_action_when_one_action_is_invalid() {
    let (_file, db, battery_id) = setup();
    let result = QuizRepository::apply_quiz_assistant_actions(
        &db,
        &battery_id,
        &[
            action(
                serde_json::json!({ "actionType": "create", "type": "open", "question": "Temporary", "expectedAnswer": "Answer" }),
            ),
            action(
                serde_json::json!({ "actionType": "delete", "targetQuestionId": "outside-question" }),
            ),
        ],
    );

    assert!(result.is_err());
    assert!(QuizRepository::get_battery_questions(&db, &battery_id)
        .unwrap()
        .is_empty());
}

#[test]
fn rejects_cross_battery_mutations_and_invalid_multiple_choice_payloads() {
    let (_file, db, battery_id) = setup();
    let other_battery = QuizRepository::create_quiz_battery(&db, "Other", None).unwrap();
    let question_id = QuizRepository::create_quiz_question(
        &db,
        &other_battery,
        "Foreign question",
        r#"["A", "B"]"#,
        0,
        None,
        None,
    )
    .unwrap();

    let foreign_delete = QuizRepository::apply_quiz_assistant_actions(
        &db,
        &battery_id,
        &[action(
            serde_json::json!({ "actionType": "delete", "targetQuestionId": question_id }),
        )],
    );
    assert!(foreign_delete.is_err());

    let invalid_create = QuizRepository::apply_quiz_assistant_actions(
        &db,
        &battery_id,
        &[action(serde_json::json!({
            "actionType": "create", "type": "multiple_choice", "question": "Bad key",
            "options": ["Only one"], "correctIndex": 1
        }))],
    );
    assert!(invalid_create.is_err());
    assert!(QuizRepository::get_battery_questions(&db, &battery_id)
        .unwrap()
        .is_empty());
}
