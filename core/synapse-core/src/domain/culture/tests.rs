use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_culture_lifecycle_and_episode_sync() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();

    let item = CultureRepository::create_item(
        &db,
        CultureItem {
            title: "Anime Test".into(),
            item_type: "anime".into(),
            total_episodes: 2,
            ..Default::default()
        },
    )
    .expect("create item");

    assert_eq!(item.title, "Anime Test");
    let items = CultureRepository::get_items(&db, None).expect("get items");
    assert_eq!(items.len(), 1);

    // Bulk create 2 episodes
    assert!(CultureRepository::bulk_create_episodes(&db, &item.id, 2).expect("bulk create"));
    let episodes = CultureRepository::get_episodes(&db, &item.id).expect("get episodes");
    assert_eq!(episodes.len(), 2);
    assert!(!episodes[0].is_watched);

    // Toggle episode 1
    assert!(CultureRepository::toggle_episode_watched(&db, &episodes[0].id, &item.id).expect("toggle 1"));
    let items = CultureRepository::get_items(&db, None).expect("get items");
    assert_eq!(items[0].progress, 1);
    assert_eq!(items[0].status.as_deref(), Some("backlog"));

    // Toggle episode 2 -> completes all episodes -> status should auto-update to finished
    assert!(CultureRepository::toggle_episode_watched(&db, &episodes[1].id, &item.id).expect("toggle 2"));
    let items = CultureRepository::get_items(&db, None).expect("get items");
    assert_eq!(items[0].progress, 2);
    assert_eq!(items[0].status.as_deref(), Some("finished"));

    // Soft delete
    assert!(CultureRepository::delete_item(&db, &item.id).expect("delete"));
    assert_eq!(CultureRepository::get_items(&db, None).expect("get items").len(), 0);
    assert_eq!(CultureRepository::get_episodes(&db, &item.id).expect("get episodes").len(), 0);
}
