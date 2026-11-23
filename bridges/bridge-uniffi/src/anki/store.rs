use super::models::{AnkiCardRecord, AnkiDeckRecord, AnkiSettingsRecord, AnkiStatsRecord};
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::anki::AnkiRepository;
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseAnkiStore {
    database: Database,
}

#[uniffi::export]
impl SynapseAnkiStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_decks(&self) -> Result<Vec<AnkiDeckRecord>, SynapseError> {
        AnkiRepository::get_hierarchical_decks(&self.database)
            .map(|decks| decks.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn get_cards(&self, deck_id: String) -> Result<Vec<AnkiCardRecord>, SynapseError> {
        AnkiRepository::get_deck_cards(&self.database, &deck_id)
            .map(|cards| cards.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn get_global_stats(&self) -> Result<AnkiStatsRecord, SynapseError> {
        AnkiRepository::get_global_anki_stats(&self.database)
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn get_total_due_count(&self) -> Result<i64, SynapseError> {
        AnkiRepository::get_total_due_count(&self.database).map_err(map_core_error)
    }

    pub fn get_study_queue(&self, deck_id: String) -> Result<Vec<AnkiCardRecord>, SynapseError> {
        AnkiRepository::get_study_queue(&self.database, &deck_id)
            .map(|cards| cards.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_deck(
        &self,
        name: String,
        description: Option<String>,
        color: Option<String>,
        parent_id: Option<String>,
    ) -> Result<String, SynapseError> {
        AnkiRepository::create_deck(
            &self.database,
            &name,
            description.as_deref(),
            color.as_deref(),
            parent_id.as_deref(),
        )
        .map_err(map_core_error)
    }

    pub fn update_deck(
        &self,
        deck_id: String,
        name: String,
        description: Option<String>,
    ) -> Result<bool, SynapseError> {
        AnkiRepository::update_deck(
            &self.database,
            &deck_id,
            &name,
            description.as_deref(),
            None,
        )
        .map_err(map_core_error)
    }

    pub fn create_card(
        &self,
        deck_id: String,
        front: String,
        back: String,
        tags: Option<String>,
        card_type: Option<String>,
        extra_note: Option<String>,
    ) -> Result<String, SynapseError> {
        AnkiRepository::create_card(
            &self.database,
            &deck_id,
            &front,
            &back,
            tags.as_deref(),
            card_type.as_deref(),
            extra_note.as_deref(),
        )
        .map_err(map_core_error)
    }

    pub fn record_review(&self, card_id: String, rating: i32) -> Result<bool, SynapseError> {
        AnkiRepository::record_card_review(&self.database, &card_id, rating).map_err(map_core_error)
    }

    pub fn update_card(
        &self,
        card_id: String,
        front: String,
        back: String,
        tags: Option<String>,
        card_type: Option<String>,
        extra_note: Option<String>,
    ) -> Result<bool, SynapseError> {
        AnkiRepository::update_card(
            &self.database,
            &card_id,
            &front,
            &back,
            tags.as_deref(),
            card_type.as_deref(),
            extra_note.as_deref(),
        )
        .map_err(map_core_error)
    }

    pub fn get_deck_settings(&self, deck_id: String) -> Result<AnkiSettingsRecord, SynapseError> {
        AnkiRepository::get_deck_settings(&self.database, &deck_id)
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn update_deck_settings(
        &self,
        deck_id: String,
        settings: AnkiSettingsRecord,
    ) -> Result<bool, SynapseError> {
        AnkiRepository::update_deck_settings(&self.database, &deck_id, settings.into())
            .map_err(map_core_error)
    }

    pub fn delete_card(&self, card_id: String) -> Result<bool, SynapseError> {
        AnkiRepository::delete_card(&self.database, &card_id).map_err(map_core_error)
    }

    pub fn delete_deck(&self, deck_id: String) -> Result<bool, SynapseError> {
        AnkiRepository::delete_deck(&self.database, &deck_id).map_err(map_core_error)
    }

    pub fn reset_deck_progress(&self, deck_id: String) -> Result<bool, SynapseError> {
        AnkiRepository::reset_deck_progress(&self.database, &deck_id).map_err(map_core_error)
    }
}
