use super::models::FocusAlarm;
use crate::error::Result;
use rusqlite::params;

pub fn get_alarms(conn: &rusqlite::Connection) -> Result<Vec<FocusAlarm>> {
    let mut stmt = conn.prepare(
        "SELECT id, time, label, sound, enabled, days, created_at, updated_at \
         FROM alarms WHERE deleted_at IS NULL ORDER BY time ASC",
    )?;

    let iter = stmt.query_map([], |row| {
        Ok(FocusAlarm {
            id: row.get(0)?,
            time: row.get(1)?,
            label: row.get(2)?,
            sound: row.get(3)?,
            enabled: row.get(4)?,
            days: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;

    let mut list = Vec::new();
    for a in iter.flatten() {
        list.push(a);
    }
    Ok(list)
}

pub fn create_alarm(
    conn: &rusqlite::Connection,
    time: &str,
    label: &str,
    sound: &str,
    enabled: bool,
    days: &str,
) -> Result<bool> {
    if time.trim().is_empty() {
        return Ok(false);
    }

    let id = uuid::Uuid::new_v4().to_string();
    let resolved_sound = if sound.trim().is_empty() {
        "bell"
    } else {
        sound.trim()
    };
    let resolved_days = if days.trim().is_empty() {
        "[]"
    } else {
        days.trim()
    };

    let rows = conn.execute(
        "INSERT INTO alarms (id, time, label, sound, enabled, days, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        params![
            id,
            time.trim(),
            label.trim(),
            resolved_sound,
            if enabled { 1 } else { 0 },
            resolved_days,
        ],
    )?;

    Ok(rows > 0)
}

pub fn upsert_alarm(conn: &rusqlite::Connection, mut alarm: FocusAlarm) -> Result<FocusAlarm> {
    let id = if alarm.id.trim().is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        alarm.id.clone()
    };

    conn.execute(
        "INSERT INTO alarms (id, time, label, sound, enabled, days) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6) \
         ON CONFLICT(id) DO UPDATE SET \
            time = excluded.time, \
            label = excluded.label, \
            sound = excluded.sound, \
            enabled = excluded.enabled, \
            days = excluded.days, \
            deleted_at = NULL, \
            updated_at = CURRENT_TIMESTAMP",
        params![id, alarm.time, alarm.label, alarm.sound, alarm.enabled, alarm.days],
    )?;

    alarm.id = id;
    Ok(alarm)
}

pub fn update_alarm(
    conn: &rusqlite::Connection,
    id: &str,
    time: &str,
    label: &str,
    sound: &str,
    enabled: bool,
    days: &str,
) -> Result<bool> {
    if id.trim().is_empty() || time.trim().is_empty() {
        return Ok(false);
    }

    let resolved_sound = if sound.trim().is_empty() {
        "bell"
    } else {
        sound.trim()
    };
    let resolved_days = if days.trim().is_empty() {
        "[]"
    } else {
        days.trim()
    };

    let rows = conn.execute(
        "UPDATE alarms SET time = ?1, label = ?2, sound = ?3, enabled = ?4, days = ?5, \
         updated_at = CURRENT_TIMESTAMP WHERE id = ?6 AND deleted_at IS NULL",
        params![
            time.trim(),
            label.trim(),
            resolved_sound,
            if enabled { 1 } else { 0 },
            resolved_days,
            id.trim(),
        ],
    )?;

    Ok(rows > 0)
}

pub fn toggle_alarm(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    if id.trim().is_empty() {
        return Ok(false);
    }

    let current_enabled: Option<i32> = conn
        .query_row(
            "SELECT enabled FROM alarms WHERE id = ?1 AND deleted_at IS NULL",
            params![id.trim()],
            |row| row.get(0),
        )
        .ok();

    if let Some(enabled) = current_enabled {
        let new_enabled = if enabled == 1 { 0 } else { 1 };
        let rows = conn.execute(
            "UPDATE alarms SET enabled = ?1, updated_at = CURRENT_TIMESTAMP \
             WHERE id = ?2 AND deleted_at IS NULL",
            params![new_enabled, id.trim()],
        )?;
        Ok(rows > 0)
    } else {
        Ok(false)
    }
}

pub fn delete_alarm(conn: &rusqlite::Connection, id: &str) -> Result<bool> {
    if id.trim().is_empty() {
        return Ok(false);
    }

    let rows = conn.execute(
        "UPDATE alarms SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP \
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id.trim()],
    )?;

    Ok(rows > 0)
}
