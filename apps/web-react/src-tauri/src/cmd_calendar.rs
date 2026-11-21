use crate::db::DbState;
pub use synapse_core::domain::calendar::{CalendarEvent, CalendarRepository};
use tauri::State;

fn value_to_string_or_default(v: &Option<serde_json::Value>, default_str: &str) -> String {
    match v {
        Some(serde_json::Value::String(s)) => s.clone(),
        Some(serde_json::Value::Null) => default_str.to_string(),
        Some(val) => val.to_string(),
        None => default_str.to_string(),
    }
}

#[tauri::command]
pub async fn calendar_get_events(
    db_state: State<'_, DbState>,
) -> Result<Vec<CalendarEvent>, String> {
    db_state
        .read(|conn| CalendarRepository::get_events_conn(conn).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn calendar_add_event(
    event: serde_json::Value,
    db_state: State<'_, DbState>,
) -> Result<CalendarEvent, String> {
    db_state
        .write(move |conn| {
            let event_obj = event.as_object().ok_or("Parâmetro event inválido")?;

            let raw_id = event_obj.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let id = if raw_id.trim().is_empty() {
                uuid::Uuid::new_v4().to_string()
            } else {
                raw_id.to_string()
            };
            let title = event_obj
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let description = event_obj
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let start_date = event_obj
                .get("start_date")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let end_date = event_obj
                .get("end_date")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let type_ = event_obj
                .get("type")
                .or_else(|| event_obj.get("type_"))
                .and_then(|v| v.as_str())
                .unwrap_or("event")
                .to_string();
            let status = event_obj
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("pending")
                .to_string();
            let color = event_obj
                .get("color")
                .and_then(|v| v.as_str())
                .unwrap_or("#3b82f6")
                .to_string();
            let page_id = event_obj
                .get("page_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let reminders_val = event_obj.get("reminders").cloned();
            let reminders_str = value_to_string_or_default(&reminders_val, "[]");
            let notified_val = event_obj.get("notified_reminders").cloned();
            let notified_str = value_to_string_or_default(&notified_val, "[]");
            let now = chrono::Utc::now().to_rfc3339();

            conn.execute(
                "INSERT INTO calendar_events (id, title, description, start_date, end_date, type, type_, status, color, page_id, reminders, notified_reminders, created_at, updated_at) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13) \
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
                    updated_at = excluded.updated_at",
                rusqlite::params![
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
                    now
                ],
            )
            .map_err(|e| e.to_string())?;

            Ok(CalendarEvent {
                id,
                title,
                description,
                start_date,
                end_date,
                type_,
                status,
                color,
                page_id,
                reminders: reminders_val.or(Some(serde_json::json!([]))),
                notified_reminders: notified_val.or(Some(serde_json::json!([]))),
                created_at: Some(now.clone()),
                updated_at: Some(now),
            })
        })
        .await
}

#[tauri::command]
pub async fn calendar_update_event(
    id: Option<String>,
    event: serde_json::Value,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    db_state
        .write(move |conn| {
            let event_obj = event.as_object().ok_or("Parâmetro event inválido")?;

            let event_id = if let Some(ref target_id) = id {
                if !target_id.trim().is_empty() {
                    target_id.clone()
                } else {
                    event_obj
                        .get("id")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string()
                }
            } else {
                event_obj
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string()
            };

            if event_id.trim().is_empty() {
                return Err("ID do evento não fornecido".into());
            }

            let title = event_obj.get("title").and_then(|v| v.as_str()).unwrap_or("");
            let description = event_obj.get("description").and_then(|v| v.as_str());
            let start_date = event_obj.get("start_date").and_then(|v| v.as_str());
            let end_date = event_obj.get("end_date").and_then(|v| v.as_str());
            let type_ = event_obj
                .get("type")
                .or_else(|| event_obj.get("type_"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let status = event_obj
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let color = event_obj.get("color").and_then(|v| v.as_str()).unwrap_or("");
            let page_id = event_obj.get("page_id").and_then(|v| v.as_str());

            let reminders_opt = event_obj
                .get("reminders")
                .map(|r| value_to_string_or_default(&Some(r.clone()), "[]"));
            let notified_opt = event_obj
                .get("notified_reminders")
                .map(|n| value_to_string_or_default(&Some(n.clone()), "[]"));
            let now = chrono::Utc::now().to_rfc3339();

            let count = conn
                .execute(
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
                    rusqlite::params![
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
                )
                .map_err(|e| e.to_string())?;

            Ok(count as i32)
        })
        .await
}

#[tauri::command]
pub async fn calendar_delete_event(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    db_state
        .write(move |conn| CalendarRepository::delete_event_conn(conn, &id).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn calendar_get_event(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<CalendarEvent>, String> {
    db_state
        .read(move |conn| CalendarRepository::get_event_conn(conn, &id).map_err(|e| e.to_string()))
        .await
}
