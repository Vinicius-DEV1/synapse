use super::models::{PracticeMemoryRecord, PracticeMessageRecord, PracticeSessionRecord};
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::practice::PracticeRepository;
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapsePracticeStore {
    database: Database,
}

#[uniffi::export]
impl SynapsePracticeStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_sessions(&self) -> Result<Vec<PracticeSessionRecord>, SynapseError> {
        PracticeRepository::get_sessions(&self.database)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_session(
        &self,
        title: String,
        started_at: String,
        custom_prompt: Option<String>,
    ) -> Result<PracticeSessionRecord, SynapseError> {
        PracticeRepository::create_session(
            &self.database,
            &title,
            &started_at,
            custom_prompt.as_deref(),
        )
        .map(Into::into)
        .map_err(map_core_error)
    }

    pub fn delete_session(&self, session_id: String) -> Result<bool, SynapseError> {
        PracticeRepository::delete_session(&self.database, &session_id).map_err(map_core_error)
    }

    pub fn get_messages(
        &self,
        session_id: String,
    ) -> Result<Vec<PracticeMessageRecord>, SynapseError> {
        PracticeRepository::get_messages(&self.database, &session_id)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_message(
        &self,
        session_id: String,
        role: String,
        text_content: String,
    ) -> Result<PracticeMessageRecord, SynapseError> {
        PracticeRepository::create_message(&self.database, &session_id, &role, &text_content)
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn get_memories(&self) -> Result<Vec<PracticeMemoryRecord>, SynapseError> {
        PracticeRepository::get_memories(&self.database)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_memory(
        &self,
        category: String,
        fact: String,
    ) -> Result<PracticeMemoryRecord, SynapseError> {
        PracticeRepository::create_memory(&self.database, &category, &fact)
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn delete_memory(&self, memory_id: String) -> Result<bool, SynapseError> {
        PracticeRepository::delete_memory(&self.database, &memory_id).map_err(map_core_error)
    }
}
