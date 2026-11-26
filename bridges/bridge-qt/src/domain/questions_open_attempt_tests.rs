use super::questions::{synapse_quiz_get_latest_attempts, synapse_quiz_record_open_answer_attempt};
use crate::{synapse_db_close, synapse_db_open, synapse_free_string};
use serde_json::Value;
use std::ffi::{CStr, CString};
use std::time::{SystemTime, UNIX_EPOCH};
use synapse_core::domain::questions::QuizRepository;

#[test]
fn open_answer_bridge_roundtrips_typed_attempt_after_database_reopen() {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock must be valid")
        .as_nanos();
    let database_path = std::env::temp_dir().join(format!(
        "synapse-bridge-notes-open-answer-{}-{nonce}.sqlite",
        std::process::id()
    ));
    let path = CString::new(database_path.to_string_lossy().as_bytes()).unwrap();

    unsafe {
        let database = synapse_db_open(path.as_ptr());
        assert!(!database.is_null());
        let battery_id =
            QuizRepository::create_quiz_battery(&*database, "Notes questions", None).unwrap();
        let question_id = QuizRepository::create_quiz_question(
            &*database,
            &battery_id,
            "Explain the concept",
            r#"["Choice A", "Choice B"]"#,
            0,
            None,
            None,
        )
        .unwrap();
        database
            .as_ref()
            .unwrap()
            .lock()
            .unwrap()
            .execute(
                "UPDATE quiz_questions SET type = 'open', expected_answer = ?1 WHERE id = ?2",
                rusqlite::params!["A complete reference answer", question_id],
            )
            .unwrap();

        let battery = CString::new(battery_id.clone()).unwrap();
        let question = CString::new(question_id.clone()).unwrap();
        let answer = CString::new("My typed response").unwrap();
        let verdict = CString::new("Parcial").unwrap();
        let feedback = CString::new("Add one part of the concept.").unwrap();
        let model = CString::new("gemini-flash-latest").unwrap();
        let saved_raw = synapse_quiz_record_open_answer_attempt(
            database,
            battery.as_ptr(),
            question.as_ptr(),
            answer.as_ptr(),
            verdict.as_ptr(),
            feedback.as_ptr(),
            model.as_ptr(),
        );
        assert!(!saved_raw.is_null());
        let saved: Value =
            serde_json::from_str(CStr::from_ptr(saved_raw).to_str().unwrap()).unwrap();
        synapse_free_string(saved_raw);
        assert_eq!(saved["user_typed_answer"], "My typed response");
        assert_eq!(saved["ai_feedback"]["verdict"], "Parcial");

        synapse_db_close(database);
        let reopened = synapse_db_open(path.as_ptr());
        assert!(!reopened.is_null());
        let attempts_raw =
            synapse_quiz_get_latest_attempts(reopened, battery.as_ptr(), question.as_ptr());
        assert!(!attempts_raw.is_null());
        let attempts: Value =
            serde_json::from_str(CStr::from_ptr(attempts_raw).to_str().unwrap()).unwrap();
        synapse_free_string(attempts_raw);
        assert_eq!(attempts.as_array().unwrap().len(), 1);
        assert_eq!(attempts[0]["id"], saved["id"]);
        assert_eq!(attempts[0]["type_"], "open");
        assert_eq!(attempts[0]["user_typed_answer"], "My typed response");
        assert_eq!(
            attempts[0]["ai_feedback"]["feedback"],
            "Add one part of the concept."
        );
        synapse_db_close(reopened);
    }

    let _ = std::fs::remove_file(&database_path);
    let _ = std::fs::remove_file(database_path.with_extension("sqlite-wal"));
    let _ = std::fs::remove_file(database_path.with_extension("sqlite-shm"));
}
