use crate::error::Result;
use rusqlite::{params, OptionalExtension};

pub(super) fn normalize_reminders(reminders: &[i32]) -> Result<Vec<i32>> {
    if reminders
        .iter()
        .any(|minutes| !(0..=10_080).contains(minutes))
    {
        return Err(crate::error::SynapseError::Validation(
            "Calendar reminders must be between zero minutes and seven days".to_owned(),
        ));
    }
    let mut normalized = reminders.to_vec();
    normalized.sort_unstable_by(|left, right| right.cmp(left));
    normalized.dedup();
    Ok(normalized)
}

pub fn mark_calendar_reminder_notified(
    conn: &rusqlite::Connection,
    event_id: &str,
    reminder_minutes: i32,
) -> Result<bool> {
    let event_id = event_id.trim();
    if event_id.is_empty() || !(0..=10_080).contains(&reminder_minutes) {
        return Err(crate::error::SynapseError::Validation(
            "A calendar event ID and valid reminder offset are required".to_owned(),
        ));
    }
    let tx = conn.unchecked_transaction()?;
    let raw: Option<String> = tx
        .query_row(
            "SELECT notified_reminders FROM calendar_events \
             WHERE id = ?1 AND deleted_at IS NULL",
            params![event_id],
            |row| row.get(0),
        )
        .optional()?
        .ok_or_else(|| {
            crate::error::SynapseError::NotFound(format!("Calendar event {event_id} was not found"))
        })?;
    let mut notified = raw
        .filter(|value| !value.trim().is_empty())
        .map(|value| {
            serde_json::from_str::<Vec<i32>>(&value).map_err(|error| {
                crate::error::SynapseError::Validation(format!(
                    "Calendar reminder history is invalid: {error}"
                ))
            })
        })
        .transpose()?
        .unwrap_or_default();
    if !notified.contains(&reminder_minutes) {
        notified.push(reminder_minutes);
        notified.sort_unstable_by(|left, right| right.cmp(left));
    }
    let encoded = serde_json::to_string(&notified)
        .map_err(|error| crate::error::SynapseError::Internal(error.to_string()))?;
    tx.execute(
        "UPDATE calendar_events SET notified_reminders = ?1, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?2 AND deleted_at IS NULL",
        params![encoded, event_id],
    )?;
    tx.commit()?;
    Ok(true)
}
