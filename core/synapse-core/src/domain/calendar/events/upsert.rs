use crate::error::Result;
use rusqlite::params;

pub fn upsert_calendar_event_raw(
    conn: &rusqlite::Connection,
    id: &str,
    title: &str,
    description: Option<&str>,
    start_date: Option<&str>,
    end_date: Option<&str>,
    type_: &str,
    status: &str,
    color: &str,
    page_id: Option<&str>,
    reminders_str: &str,
    notified_str: &str,
    recurrence_rule: Option<&str>,
    now: &str,
) -> Result<()> {
    conn.execute(
        "INSERT INTO calendar_events (id, title, description, start_date, end_date, type, type_, status, color, page_id, reminders, notified_reminders, recurrence_rule, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14) \
         ON CONFLICT(id) DO UPDATE SET \
            title = excluded.title, \
            description = excluded.description, \
            start_date = excluded.start_date, \
            end_date = excluded.end_date, \
            type = excluded.type, \
            type_ = excluded.type_, \
            status = excluded.status, \
            color = excluded.color, \
            page_id = excluded.page_id, \
            reminders = excluded.reminders, \
            notified_reminders = excluded.notified_reminders, \
            recurrence_rule = excluded.recurrence_rule, \
            updated_at = excluded.updated_at",
        params![
            id,
            title,
            description,
            start_date,
            end_date,
            type_,
            type_,
            status,
            color,
            page_id,
            reminders_str,
            notified_str,
            recurrence_rule,
            now
        ],
    )?;
    Ok(())
}

pub fn patch_calendar_event_raw(
    conn: &rusqlite::Connection,
    event_id: &str,
    title: &str,
    description: Option<&str>,
    start_date: Option<&str>,
    end_date: Option<&str>,
    type_: &str,
    status: &str,
    color: &str,
    page_id: Option<&str>,
    reminders_opt: Option<&str>,
    notified_opt: Option<&str>,
    now: &str,
) -> Result<i32> {
    let count = conn.execute(
        "UPDATE calendar_events SET \
            title = CASE WHEN ?1 != '' THEN ?1 ELSE title END, \
            description = COALESCE(?2, description), \
            start_date = COALESCE(?3, start_date), \
            end_date = COALESCE(?4, end_date), \
            type = CASE WHEN ?5 != '' THEN ?5 ELSE type END, \
            type_ = CASE WHEN ?5 != '' THEN ?5 ELSE type_ END, \
            status = CASE WHEN ?6 != '' THEN ?6 ELSE status END, \
            color = CASE WHEN ?7 != '' THEN ?7 ELSE color END, \
            page_id = COALESCE(?8, page_id), \
            reminders = COALESCE(?9, reminders), \
            notified_reminders = COALESCE(?10, notified_reminders), \
            updated_at = ?12 \
         WHERE id = ?11",
        params![
            title,
            description,
            start_date,
            end_date,
            type_,
            status,
            color,
            page_id,
            reminders_opt,
            notified_opt,
            event_id,
            now
        ],
    )?;
    Ok(count as i32)
}
