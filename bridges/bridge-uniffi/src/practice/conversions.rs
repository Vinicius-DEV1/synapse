use super::models::{PracticeMemoryRecord, PracticeMessageRecord, PracticeSessionRecord};
use synapse_core::domain::practice::{TutorMemory, TutorMessage, TutorSession};

impl From<TutorSession> for PracticeSessionRecord {
    fn from(session: TutorSession) -> Self {
        Self {
            id: session.id,
            title: session.title,
            started_at: session.started_at,
            ended_at: session.ended_at,
            custom_prompt: session.custom_prompt,
            deleted_at: session.deleted_at,
        }
    }
}

impl From<TutorMessage> for PracticeMessageRecord {
    fn from(message: TutorMessage) -> Self {
        Self {
            id: message.id,
            session_id: message.session_id,
            role: message.role,
            text_content: message.text_content,
            created_at: message.created_at,
        }
    }
}

impl From<TutorMemory> for PracticeMemoryRecord {
    fn from(memory: TutorMemory) -> Self {
        Self {
            id: memory.id,
            category: memory.category,
            fact: memory.fact,
            created_at: memory.created_at,
            deleted_at: memory.deleted_at,
        }
    }
}
