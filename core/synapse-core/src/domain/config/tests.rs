use super::ConfigRepository;
use crate::Database;

#[test]
fn test_config_get_set_delete() {
    let temp_file = tempfile::NamedTempFile::new().unwrap();
    let db = Database::open(temp_file.path()).unwrap();
    let conn = db.lock().unwrap();

    // Initial get should be None
    let initial = ConfigRepository::get(&conn, "test_key").unwrap();
    assert_eq!(initial, None);

    // Set value
    ConfigRepository::set(&conn, "test_key", "test_value_123").unwrap();
    let updated = ConfigRepository::get(&conn, "test_key").unwrap();
    assert_eq!(updated, Some("test_value_123".to_string()));

    // Overwrite value
    ConfigRepository::set(&conn, "test_key", "overwritten").unwrap();
    let overwritten = ConfigRepository::get(&conn, "test_key").unwrap();
    assert_eq!(overwritten, Some("overwritten".to_string()));

    // Delete value
    ConfigRepository::delete(&conn, "test_key").unwrap();
    let deleted = ConfigRepository::get(&conn, "test_key").unwrap();
    assert_eq!(deleted, None);
}
