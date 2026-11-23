use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_notifications_domain() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();

    assert_eq!(
        NotificationsRepository::get_unread_count(&db).expect("unread"),
        0
    );

    let n1 = NotificationsRepository::add_notification(
        &db,
        "Title 1",
        "Message 1",
        "system",
        None,
        None,
        None,
    )
    .expect("add 1");
    let n2 = NotificationsRepository::add_notification(
        &db,
        "Title 2",
        "Message 2",
        "calendar_event",
        Some("page-1"),
        Some("event-1"),
        Some("2026-11-13T21:00:00Z"),
    )
    .expect("add 2");

    assert_eq!(
        NotificationsRepository::get_unread_count(&db).expect("unread"),
        2
    );
    let list = NotificationsRepository::get_notifications(&db).expect("get");
    assert_eq!(list.len(), 2);

    // Mark single as read
    assert!(NotificationsRepository::mark_read(&db, Some(&n1.id)).expect("mark"));
    assert_eq!(
        NotificationsRepository::get_unread_count(&db).expect("unread"),
        1
    );

    // Mark all as read
    assert!(NotificationsRepository::mark_read(&db, None).expect("mark all"));
    assert_eq!(
        NotificationsRepository::get_unread_count(&db).expect("unread"),
        0
    );

    // Delete single
    assert!(NotificationsRepository::delete_notification(&db, &n2.id).expect("delete"));
    assert_eq!(
        NotificationsRepository::get_notifications(&db)
            .expect("get")
            .len(),
        1
    );

    // Clear all
    assert!(NotificationsRepository::clear_all(&db).expect("clear"));
    assert_eq!(
        NotificationsRepository::get_notifications(&db)
            .expect("get")
            .len(),
        0
    );
}
