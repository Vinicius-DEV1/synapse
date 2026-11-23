use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_calendar_event_lifecycle() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();

    let ev = CalendarRepository::create_event(
        &db,
        "Exam",
        "Review chapters",
        "2026-11-12T09:00:00",
        "2026-11-12T11:00:00",
        "event",
        "#3b82f6",
        None,
    )
    .expect("create event")
    .expect("valid event");

    assert_eq!(ev.title, "Exam");
    assert_eq!(ev.status, "pending");

    let events = CalendarRepository::get_events(&db).expect("get events");
    assert_eq!(events.len(), 1);

    // Update event
    let ok = CalendarRepository::update_event(
        &db,
        &ev.id,
        "Final Exam",
        "Bring student ID",
        "2026-11-13T10:00:00",
        "2026-11-13T12:00:00",
        "#10b981",
        Some("task"),
        Some("page-123"),
    )
    .expect("update event");
    assert!(ok);

    let updated = CalendarRepository::get_event(&db, &ev.id)
        .expect("get event")
        .expect("found");
    assert_eq!(updated.title, "Final Exam");
    assert_eq!(updated.type_, "task");
    assert_eq!(updated.color, "#10b981");
    assert_eq!(updated.page_id.as_deref(), Some("page-123"));

    // Toggle status
    assert!(CalendarRepository::toggle_status(&db, &ev.id).expect("toggle status"));
    let toggled = CalendarRepository::get_event(&db, &ev.id)
        .expect("get event")
        .expect("found");
    assert_eq!(toggled.status, "completed");

    // Delete event
    assert!(CalendarRepository::delete_event(&db, &ev.id).expect("delete event"));
    assert_eq!(
        CalendarRepository::get_events(&db)
            .expect("get events")
            .len(),
        0
    );
}
