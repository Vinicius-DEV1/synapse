//! Practice domain integration tests.

use super::models::{TutorMemory, TutorMessage, TutorSession};
use super::PracticeRepository;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_practice_lifecycle_sessions_messages_and_memories() {
    let temp_file = NamedTempFile::new().unwrap();
    let db = Database::open(temp_file.path()).unwrap();

    // 1. Create and verify tutor session
    let session = TutorSession {
        id: "sess_1".to_string(),
        title: "Sessão de Teste".to_string(),
        started_at: "2026-11-14T10:00:00Z".to_string(),
        ended_at: None,
        custom_prompt: Some("Ajude com Rust".to_string()),
        deleted_at: None,
    };
    PracticeRepository::save_session(&db, &session).unwrap();

    let fetched = PracticeRepository::get_session(&db, "sess_1").unwrap();
    assert!(fetched.is_some());
    assert_eq!(fetched.unwrap().title, "Sessão de Teste");

    let sessions = PracticeRepository::get_sessions(&db).unwrap();
    assert_eq!(sessions.len(), 1);

    // 2. Add transcript messages
    let msg1 = TutorMessage {
        id: "msg_1".to_string(),
        session_id: "sess_1".to_string(),
        role: "user".to_string(),
        text_content: "Como funciona Rust?".to_string(),
        created_at: Some("2026-11-14T10:01:00Z".to_string()),
    };
    let msg2 = TutorMessage {
        id: "msg_2".to_string(),
        session_id: "sess_1".to_string(),
        role: "assistant".to_string(),
        text_content: "Rust garante memory safety sem garbage collection.".to_string(),
        created_at: Some("2026-11-14T10:02:00Z".to_string()),
    };
    PracticeRepository::save_message(&db, &msg1).unwrap();
    PracticeRepository::save_message(&db, &msg2).unwrap();

    let messages = PracticeRepository::get_messages(&db, "sess_1").unwrap();
    assert_eq!(messages.len(), 2);
    assert_eq!(messages[0].role, "user");
    assert_eq!(messages[1].role, "assistant");

    // 3. Add and delete tutor memory
    let memory = TutorMemory {
        id: "mem_1".to_string(),
        category: "preferencias".to_string(),
        fact: "O usuário prefere código idiomático com pattern matching".to_string(),
        created_at: None,
        deleted_at: None,
    };
    PracticeRepository::save_memory(&db, &memory).unwrap();

    let memories = PracticeRepository::get_memories(&db).unwrap();
    assert_eq!(memories.len(), 1);
    assert_eq!(memories[0].category, "preferencias");

    assert!(PracticeRepository::delete_memory(&db, "mem_1").unwrap());
    let memories_after = PracticeRepository::get_memories(&db).unwrap();
    assert_eq!(memories_after.len(), 0);

    // 4. Soft-delete session
    assert!(PracticeRepository::delete_session(&db, "sess_1").unwrap());
    let sessions_after = PracticeRepository::get_sessions(&db).unwrap();
    assert_eq!(sessions_after.len(), 0);
}
