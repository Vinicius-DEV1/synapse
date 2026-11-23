use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_vault_domain() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();

    // Create group
    let group = VaultRepository::create_group(&db, "Personal", Some("user"), Some("#3b82f6"))
        .expect("create group");
    assert_eq!(group.name, "Personal");

    let groups = VaultRepository::get_groups(&db).expect("get groups");
    assert_eq!(groups.len(), 1);

    // Create item in group
    let item = VaultRepository::save_item(
        &db,
        VaultItem {
            group_id: Some(group.id.clone()),
            label: "GitHub".into(),
            username: Some("user@example.com".into()),
            password: Some("secret123".into()),
            ..Default::default()
        },
    )
    .expect("save item");
    assert_eq!(item.label, "GitHub");

    let items = VaultRepository::get_items(&db, Some(&group.id)).expect("get items");
    assert_eq!(items.len(), 1);
    assert_eq!(items[0].username.as_deref(), Some("user@example.com"));

    // Delete item
    assert!(VaultRepository::delete_item(&db, &item.id).expect("delete item"));
    assert!(VaultRepository::get_items(&db, Some(&group.id))
        .expect("get items")
        .is_empty());
}
