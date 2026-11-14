use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_trash_domain() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();

    // Verify empty
    assert!(TrashRepository::get_trash_items(&db).expect("empty").is_empty());

    {
        let conn = db.lock().unwrap();
        let _ = conn.execute(
            "INSERT INTO pages (id, title, deleted_at) VALUES ('p1', 'Page 1', CURRENT_TIMESTAMP)",
            [],
        );
        let _ = conn.execute(
            "INSERT INTO transactions (id, description, amount, type, category, date, deleted_at) VALUES ('t1', 'Tx 1', 10.0, 'expense', 'Food', '2026-11-14', CURRENT_TIMESTAMP)",
            [],
        );
    }

    let items = TrashRepository::get_trash_items(&db).expect("get");
    assert_eq!(items.len(), 2);

    // Restore page
    assert!(TrashRepository::restore_trash_item(&db, "p1", "page").expect("restore"));
    let items_after = TrashRepository::get_trash_items(&db).expect("get");
    assert_eq!(items_after.len(), 1);
    assert_eq!(items_after[0].id, "t1");

    // Delete tx permanently
    assert!(TrashRepository::delete_trash_item_permanently(&db, "t1", "finance").expect("delete"));
    assert!(TrashRepository::get_trash_items(&db).expect("get").is_empty());
}
