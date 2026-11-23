use super::models::{
    QuizAnswerRecord, QuizAttemptRecord, QuizBatteryRecord, QuizQuestionRecord, QuizStatsRecord,
};
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::questions::QuizRepository;
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseQuestionsStore {
    database: Database,
}

#[uniffi::export]
impl SynapseQuestionsStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_batteries(&self) -> Result<Vec<QuizBatteryRecord>, SynapseError> {
        QuizRepository::get_quiz_batteries(&self.database)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn get_battery_questions(
        &self,
        battery_id: String,
    ) -> Result<Vec<QuizQuestionRecord>, SynapseError> {
        QuizRepository::get_battery_questions(&self.database, &battery_id)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn get_tags(&self) -> Result<Vec<String>, SynapseError> {
        QuizRepository::get_all_quiz_tags(&self.database).map_err(map_core_error)
    }

    pub fn get_filtered_questions(
        &self,
        tags_json: Option<String>,
        status: Option<String>,
        limit: i32,
        shuffle: bool,
    ) -> Result<Vec<QuizQuestionRecord>, SynapseError> {
        QuizRepository::get_filtered_quiz_questions(
            &self.database,
            tags_json.as_deref(),
            status.as_deref(),
            limit,
            shuffle,
        )
        .map(|items| items.into_iter().map(Into::into).collect())
        .map_err(map_core_error)
    }

    pub fn get_error_notebook(&self) -> Result<Vec<QuizQuestionRecord>, SynapseError> {
        QuizRepository::get_error_notebook_questions(&self.database)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn submit_answer(
        &self,
        battery_id: String,
        question_id: String,
        selected_index: i32,
    ) -> Result<QuizAnswerRecord, SynapseError> {
        QuizRepository::submit_quiz_answer(
            &self.database,
            &battery_id,
            &question_id,
            selected_index,
        )
        .map(Into::into)
        .map_err(map_core_error)
    }

    pub fn get_stats(&self) -> Result<QuizStatsRecord, SynapseError> {
        QuizRepository::get_quiz_stats(&self.database)
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn get_attempt_history(
        &self,
        battery_id: Option<String>,
        question_id: Option<String>,
        limit: i32,
    ) -> Result<Vec<QuizAttemptRecord>, SynapseError> {
        QuizRepository::get_quiz_attempt_history(
            &self.database,
            battery_id.as_deref(),
            question_id.as_deref(),
            limit,
        )
        .map(|items| items.into_iter().map(Into::into).collect())
        .map_err(map_core_error)
    }

    pub fn create_battery(
        &self,
        title: String,
        description: Option<String>,
    ) -> Result<String, SynapseError> {
        QuizRepository::create_quiz_battery(&self.database, &title, description.as_deref())
            .map_err(map_core_error)
    }

    pub fn update_battery(
        &self,
        battery_id: String,
        title: String,
        description: Option<String>,
    ) -> Result<bool, SynapseError> {
        QuizRepository::update_quiz_battery(
            &self.database,
            &battery_id,
            &title,
            description.as_deref(),
        )
        .map_err(map_core_error)
    }

    pub fn delete_battery(&self, battery_id: String) -> Result<bool, SynapseError> {
        QuizRepository::delete_quiz_battery(&self.database, &battery_id).map_err(map_core_error)
    }

    pub fn create_question(
        &self,
        battery_id: String,
        question: String,
        options_json: String,
        correct_index: i32,
        explanation: Option<String>,
        tags_json: Option<String>,
    ) -> Result<String, SynapseError> {
        QuizRepository::create_quiz_question(
            &self.database,
            &battery_id,
            &question,
            &options_json,
            correct_index,
            explanation.as_deref(),
            tags_json.as_deref(),
        )
        .map_err(map_core_error)
    }

    pub fn update_question(
        &self,
        question_id: String,
        question: String,
        options_json: String,
        correct_index: i32,
        explanation: Option<String>,
        tags_json: Option<String>,
    ) -> Result<bool, SynapseError> {
        QuizRepository::update_quiz_question(
            &self.database,
            &question_id,
            &question,
            &options_json,
            correct_index,
            explanation.as_deref(),
            tags_json.as_deref(),
        )
        .map_err(map_core_error)
    }

    pub fn delete_question(&self, question_id: String) -> Result<bool, SynapseError> {
        QuizRepository::delete_quiz_question(&self.database, &question_id).map_err(map_core_error)
    }
}
