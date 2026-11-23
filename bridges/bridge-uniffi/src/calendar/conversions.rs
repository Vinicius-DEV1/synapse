use super::models::CalendarEventRecord;
use synapse_core::domain::calendar::CalendarEvent;

fn reminder_values(value: Option<serde_json::Value>) -> Vec<i32> {
    value
        .and_then(|value| value.as_array().cloned())
        .unwrap_or_default()
        .into_iter()
        .filter_map(|value| {
            value
                .as_i64()
                .and_then(|minutes| i32::try_from(minutes).ok())
        })
        .collect()
}

impl From<CalendarEvent> for CalendarEventRecord {
    fn from(value: CalendarEvent) -> Self {
        Self {
            id: value.id,
            title: value.title,
            description: value.description,
            start_date: value.start_date,
            end_date: value.end_date,
            event_type: value.type_,
            status: value.status,
            color: value.color,
            page_id: value.page_id,
            reminders: reminder_values(value.reminders),
            notified_reminders: reminder_values(value.notified_reminders),
            recurrence_rule: value.recurrence_rule,
        }
    }
}
