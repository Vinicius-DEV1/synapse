use super::models::CalendarEventRecord;
use crate::errors::map_core_error;
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::calendar::CalendarRepository;
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseCalendarStore {
    database: Database,
}

#[uniffi::export]
impl SynapseCalendarStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_events(&self) -> Result<Vec<CalendarEventRecord>, SynapseError> {
        CalendarRepository::get_events(&self.database)
            .map(|events| events.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_event(
        &self,
        title: String,
        description: String,
        start_date: String,
        end_date: String,
        event_type: String,
        color: String,
        page_id: Option<String>,
        reminders: Vec<i32>,
    ) -> Result<CalendarEventRecord, SynapseError> {
        CalendarRepository::create_event_with_reminders(
            &self.database,
            &title,
            &description,
            &start_date,
            &end_date,
            &event_type,
            &color,
            page_id.as_deref(),
            &reminders,
        )
        .map_err(map_core_error)?
        .map(Into::into)
        .ok_or_else(|| SynapseError::InvalidInput {
            msg: "Calendar event has an invalid title or date".to_owned(),
        })
    }

    pub fn create_event_series(
        &self,
        title: String,
        description: String,
        start_date: String,
        end_date: String,
        event_type: String,
        color: String,
        page_id: Option<String>,
        reminders: Vec<i32>,
        recurrence: String,
    ) -> Result<Vec<CalendarEventRecord>, SynapseError> {
        CalendarRepository::create_event_series(
            &self.database,
            &title,
            &description,
            &start_date,
            &end_date,
            &event_type,
            &color,
            page_id.as_deref(),
            &reminders,
            &recurrence,
        )
        .map(|events| events.into_iter().map(Into::into).collect())
        .map_err(map_core_error)
    }

    pub fn update_event(
        &self,
        event_id: String,
        title: String,
        description: String,
        start_date: String,
        end_date: String,
        color: String,
        event_type: String,
        page_id: Option<String>,
        reminders: Vec<i32>,
    ) -> Result<bool, SynapseError> {
        CalendarRepository::update_event_with_reminders(
            &self.database,
            &event_id,
            &title,
            &description,
            &start_date,
            &end_date,
            &color,
            Some(&event_type),
            page_id.as_deref(),
            &reminders,
        )
        .map_err(map_core_error)
    }

    pub fn mark_reminder_notified(
        &self,
        event_id: String,
        reminder_minutes: i32,
    ) -> Result<bool, SynapseError> {
        CalendarRepository::mark_reminder_notified(&self.database, &event_id, reminder_minutes)
            .map_err(map_core_error)
    }

    pub fn toggle_status(&self, event_id: String) -> Result<bool, SynapseError> {
        CalendarRepository::toggle_status(&self.database, &event_id).map_err(map_core_error)
    }

    pub fn delete_event(&self, event_id: String) -> Result<bool, SynapseError> {
        CalendarRepository::delete_event(&self.database, &event_id).map_err(map_core_error)
    }

    pub fn delete_event_series(&self, event_id: String) -> Result<u32, SynapseError> {
        CalendarRepository::delete_event_series(&self.database, &event_id).map_err(map_core_error)
    }
}
