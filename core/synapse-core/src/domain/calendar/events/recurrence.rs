use super::mutations::create_calendar_event_with_reminders;
use crate::domain::calendar::models::CalendarEvent;
use crate::error::{Result, SynapseError};
use chrono::{
    DateTime, Datelike, Duration, FixedOffset, NaiveDate, NaiveDateTime, TimeZone, Timelike,
};
use rusqlite::{params, OptionalExtension};

#[derive(Clone, Copy)]
enum Frequency {
    Daily,
    Weekly,
    Monthly,
    Yearly,
}

struct EventTime {
    local: NaiveDateTime,
    offset: Option<FixedOffset>,
}

pub fn create_calendar_event_series(
    conn: &rusqlite::Connection,
    title: &str,
    description: &str,
    start_date: &str,
    end_date: &str,
    event_type: &str,
    color: &str,
    page_id: Option<&str>,
    reminders: &[i32],
    recurrence: &str,
) -> Result<Vec<CalendarEvent>> {
    let recurrence = recurrence.trim();
    if recurrence.is_empty() || recurrence == "none" {
        let event = create_calendar_event_with_reminders(
            conn,
            title,
            description,
            start_date,
            end_date,
            event_type,
            color,
            page_id,
            reminders,
        )?
        .ok_or_else(|| {
            SynapseError::Validation(
                "Calendar event has an invalid title, date, or range".to_owned(),
            )
        })?;
        return Ok(vec![event]);
    }
    let (frequency, count) = frequency(recurrence).ok_or_else(|| {
        SynapseError::Validation(
            "Calendar recurrence must be daily, weekly, monthly, yearly, or none".to_owned(),
        )
    })?;

    let start = parse_event_time(start_date)?;
    let end = parse_event_time(end_date)?;
    let duration = event_duration(&start, &end)?;
    let group_id = format!("group_{}", uuid::Uuid::new_v4());
    let tx = conn.unchecked_transaction()?;
    let mut events = Vec::with_capacity(count);

    for index in 0..count {
        let occurrence_start = recurring_start(start.local, frequency, index)?;
        let occurrence_end = occurrence_start
            .checked_add_signed(duration)
            .ok_or_else(|| {
                SynapseError::Validation(
                    "Calendar recurrence exceeds the supported date range".to_owned(),
                )
            })?;
        let start_value = format_event_time(occurrence_start, start.offset)?;
        let end_value = format_event_time(occurrence_end, end.offset)?;
        let mut event = create_calendar_event_with_reminders(
            &tx,
            title,
            description,
            &start_value,
            &end_value,
            event_type,
            color,
            page_id,
            reminders,
        )?
        .ok_or_else(|| {
            SynapseError::Validation(
                "Calendar event has an invalid title, date, or range".to_owned(),
            )
        })?;
        tx.execute(
            "UPDATE calendar_events SET recurrence_rule = ?1 WHERE id = ?2",
            params![group_id, event.id],
        )?;
        event.recurrence_rule = Some(group_id.clone());
        events.push(event);
    }

    tx.commit()?;
    Ok(events)
}

pub fn delete_calendar_event_series(conn: &rusqlite::Connection, event_id: &str) -> Result<u32> {
    let event_id = event_id.trim();
    if event_id.is_empty() {
        return Ok(0);
    }
    let tx = conn.unchecked_transaction()?;
    let recurrence_rule: Option<String> = tx
        .query_row(
            "SELECT recurrence_rule FROM calendar_events WHERE id = ?1 AND deleted_at IS NULL",
            params![event_id],
            |row| row.get(0),
        )
        .optional()?
        .flatten();
    let changed = if recurrence_rule
        .as_deref()
        .is_some_and(|rule| rule.starts_with("group_"))
    {
        tx.execute(
            "UPDATE calendar_events SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
             WHERE recurrence_rule = ?1 AND deleted_at IS NULL",
            params![recurrence_rule],
        )?
    } else {
        tx.execute(
            "UPDATE calendar_events SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
             WHERE id = ?1 AND deleted_at IS NULL",
            params![event_id],
        )?
    };
    tx.commit()?;
    Ok(changed as u32)
}

fn frequency(value: &str) -> Option<(Frequency, usize)> {
    match value {
        "daily" => Some((Frequency::Daily, 90)),
        "weekly" => Some((Frequency::Weekly, 52)),
        "monthly" => Some((Frequency::Monthly, 12)),
        "yearly" => Some((Frequency::Yearly, 5)),
        _ => None,
    }
}

fn parse_event_time(value: &str) -> Result<EventTime> {
    let trimmed = value.trim();
    if let Ok(parsed) = DateTime::parse_from_rfc3339(trimmed) {
        return Ok(EventTime {
            local: parsed.naive_local(),
            offset: Some(*parsed.offset()),
        });
    }
    let local = NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%dT%H:%M:%S%.f")
        .or_else(|_| NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%dT%H:%M:%S"))
        .or_else(|_| NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%dT%H:%M"))
        .or_else(|_| {
            NaiveDate::parse_from_str(trimmed, "%Y-%m-%d")
                .map(|date| date.and_hms_opt(0, 0, 0).expect("midnight is valid"))
        })
        .map_err(|error| SynapseError::Validation(format!("Invalid Calendar date: {error}")))?;
    Ok(EventTime {
        local,
        offset: None,
    })
}

fn event_duration(start: &EventTime, end: &EventTime) -> Result<Duration> {
    if let (Some(start_offset), Some(end_offset)) = (start.offset, end.offset) {
        let start_utc = start_offset
            .from_local_datetime(&start.local)
            .single()
            .ok_or_else(|| SynapseError::Validation("Invalid Calendar start offset".to_owned()))?
            .with_timezone(&chrono::Utc);
        let end_utc = end_offset
            .from_local_datetime(&end.local)
            .single()
            .ok_or_else(|| SynapseError::Validation("Invalid Calendar end offset".to_owned()))?
            .with_timezone(&chrono::Utc);
        let duration = end_utc - start_utc;
        if duration < Duration::zero() {
            return Err(SynapseError::Validation(
                "Calendar event end must not precede its start".to_owned(),
            ));
        }
        return Ok(duration);
    }
    if start.offset.is_some() || end.offset.is_some() {
        return Err(SynapseError::Validation(
            "Calendar event start and end must use the same time format".to_owned(),
        ));
    }
    let duration = end.local - start.local;
    if duration < Duration::zero() {
        return Err(SynapseError::Validation(
            "Calendar event end must not precede its start".to_owned(),
        ));
    }
    Ok(duration)
}

fn recurring_start(
    original: NaiveDateTime,
    frequency: Frequency,
    index: usize,
) -> Result<NaiveDateTime> {
    let day_offset = match frequency {
        Frequency::Daily => index as i64,
        Frequency::Weekly => (index as i64) * 7,
        Frequency::Monthly | Frequency::Yearly => 0,
    };
    if day_offset > 0 {
        return original
            .checked_add_signed(Duration::days(day_offset))
            .ok_or_else(|| {
                SynapseError::Validation(
                    "Calendar recurrence exceeds the supported date range".to_owned(),
                )
            });
    }
    if index == 0 {
        return Ok(original);
    }
    let date = original.date();
    let (target_year, target_month) = match frequency {
        Frequency::Monthly => {
            let month_index = i64::from(date.year()) * 12 + i64::from(date.month0()) + index as i64;
            ((month_index / 12) as i32, ((month_index % 12) + 1) as u32)
        }
        Frequency::Yearly => (date.year() + index as i32, date.month()),
        Frequency::Daily | Frequency::Weekly => unreachable!("handled by day offset"),
    };
    NaiveDate::from_ymd_opt(target_year, target_month, 1)
        .and_then(|first_day| {
            first_day.checked_add_signed(Duration::days(i64::from(date.day() - 1)))
        })
        .and_then(|recurring_date| {
            recurring_date.and_hms_nano_opt(
                original.hour(),
                original.minute(),
                original.second(),
                original.nanosecond(),
            )
        })
        .ok_or_else(|| {
            SynapseError::Validation(
                "Calendar recurrence exceeds the supported date range".to_owned(),
            )
        })
}

fn format_event_time(value: NaiveDateTime, offset: Option<FixedOffset>) -> Result<String> {
    match offset {
        Some(offset) => offset
            .from_local_datetime(&value)
            .single()
            .map(|value| value.to_rfc3339())
            .ok_or_else(|| {
                SynapseError::Validation("Invalid Calendar recurrence offset".to_owned())
            }),
        None => Ok(value.format("%Y-%m-%dT%H:%M:%S").to_string()),
    }
}
