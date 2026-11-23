use super::models::{FocusAlarmRecord, FocusLofiRecord, FocusSessionRecord, FocusStatsRecord};
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::focus::{FocusAlarm, FocusRepository};
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseFocusStore {
    database: Database,
}

#[uniffi::export]
impl SynapseFocusStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_stats(&self, today: String) -> Result<FocusStatsRecord, SynapseError> {
        FocusRepository::get_stats(&self.database, &today)
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn get_sessions(&self) -> Result<Vec<FocusSessionRecord>, SynapseError> {
        FocusRepository::get_sessions(&self.database)
            .map(|sessions| sessions.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn record_completed_session(
        &self,
        target_minutes: i32,
        completed_at: String,
    ) -> Result<bool, SynapseError> {
        FocusRepository::record_session_at(
            &self.database,
            "Foco",
            target_minutes,
            "completed",
            "",
            "",
            &completed_at,
        )
        .map_err(map_core_error)
    }

    pub fn get_alarms(&self) -> Result<Vec<FocusAlarmRecord>, SynapseError> {
        FocusRepository::get_alarms(&self.database)
            .map(|alarms| alarms.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_alarm(
        &self,
        time: String,
        label: String,
    ) -> Result<FocusAlarmRecord, SynapseError> {
        FocusRepository::upsert_alarm(
            &self.database,
            FocusAlarm {
                id: String::new(),
                time,
                label: Some(label),
                sound: Some("bell".to_owned()),
                enabled: 1,
                days: Some("[]".to_owned()),
                created_at: None,
                updated_at: None,
            },
        )
        .map(Into::into)
        .map_err(map_core_error)
    }

    pub fn toggle_alarm(&self, id: String) -> Result<bool, SynapseError> {
        FocusRepository::toggle_alarm(&self.database, &id).map_err(map_core_error)
    }

    pub fn disable_alarm(&self, id: String) -> Result<bool, SynapseError> {
        FocusRepository::disable_alarm(&self.database, &id).map_err(map_core_error)
    }

    pub fn delete_alarm(&self, id: String) -> Result<bool, SynapseError> {
        FocusRepository::delete_alarm(&self.database, &id).map_err(map_core_error)
    }

    pub fn get_lofi_tracks(&self) -> Result<Vec<FocusLofiRecord>, SynapseError> {
        FocusRepository::get_lofis(&self.database)
            .map(|tracks| tracks.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn add_lofi_track(
        &self,
        title: String,
        file_path: String,
        duration_seconds: f64,
    ) -> Result<bool, SynapseError> {
        FocusRepository::add_lofi_track(&self.database, &title, &file_path, duration_seconds)
            .map_err(map_core_error)
    }

    pub fn delete_lofi_track(&self, id: String) -> Result<bool, SynapseError> {
        FocusRepository::delete_lofi(&self.database, &id).map_err(map_core_error)
    }

    pub fn get_deleted_lofi_file_path(&self, id: String) -> Result<Option<String>, SynapseError> {
        FocusRepository::get_deleted_lofi_file_path(&self.database, &id).map_err(map_core_error)
    }

    pub fn get_deleted_lofi_file_paths(&self) -> Result<Vec<String>, SynapseError> {
        FocusRepository::get_deleted_lofi_file_paths(&self.database).map_err(map_core_error)
    }

    pub fn is_lofi_file_path_referenced(&self, file_path: String) -> Result<bool, SynapseError> {
        FocusRepository::is_lofi_file_path_referenced(&self.database, &file_path)
            .map_err(map_core_error)
    }
}
