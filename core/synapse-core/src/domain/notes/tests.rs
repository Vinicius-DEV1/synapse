use super::hierarchy::*;
use super::history::*;
use super::links::*;
use super::metadata::*;
use super::models::*;
use super::pages::*;
use crate::db::Database;
use tempfile::NamedTempFile;

fn setup_test_db() -> (Database, NamedTempFile) {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::open(temp_file.path()).expect("Failed to open database");
    (db, temp_file)
}

#[test]
fn test_page_crud_and_pin() {
    let (db, _temp) = setup_test_db();
    let conn = db.lock().expect("lock db");

    // Create root page
    let page1 = create_page(&conn, None, "My Notes", Some("📚")).expect("create page");
    assert_eq!(page1.title, "My Notes");
    assert_eq!(page1.icon, "📚");
    assert_eq!(page1.is_pinned, 0);

    // Save content
    let saved = save_page(
        &conn,
        &page1.id,
        "My Notes Updated",
        "<p>Hello</p>",
        None,
        "📘",
    )
    .expect("save page");
    assert!(saved);

    // Retrieve single
    let fetched = get_page(&conn, &page1.id)
        .expect("get page")
        .expect("found");
    assert_eq!(fetched.title, "My Notes Updated");
    assert_eq!(fetched.content, "<p>Hello</p>");
    assert_eq!(fetched.icon, "📘");

    // Pin toggle
    let pinned = toggle_pin_page(&conn, &page1.id).expect("toggle pin");
    assert!(pinned);
    let pinned_pages = get_pinned_pages(&conn).expect("pinned pages");
    assert_eq!(pinned_pages.len(), 1);
    assert_eq!(pinned_pages[0].id, page1.id);

    // Unpin
    toggle_pin_page(&conn, &page1.id).expect("unpin");
    let pinned_after = get_pinned_pages(&conn).expect("pinned pages");
    assert_eq!(pinned_after.len(), 0);

    // Rename
    rename_page(&conn, &page1.id, "Brand New Title").expect("rename");
    let after_rename = get_page(&conn, &page1.id)
        .expect("get page")
        .expect("found");
    assert_eq!(after_rename.title, "Brand New Title");

    // Icon, description, cover
    update_page_icon(&conn, &page1.id, "🎯").expect("icon");
    update_page_description(&conn, &page1.id, "Important goals").expect("desc");
    update_page_cover(&conn, &page1.id, Some("cover.jpg")).expect("cover");

    let final_check = get_page(&conn, &page1.id).expect("get").expect("found");
    assert_eq!(final_check.icon, "🎯");
    assert_eq!(final_check.description.as_deref(), Some("Important goals"));
    assert_eq!(final_check.cover_image.as_deref(), Some("cover.jpg"));
}

#[test]
fn test_hierarchy_tree_and_cycle_prevention() {
    let (db, _temp) = setup_test_db();
    let conn = db.lock().expect("lock db");

    let root = create_page(&conn, None, "Root", None).expect("root");
    let child1 = create_page(&conn, Some(&root.id), "Child 1", None).expect("child1");
    let subchild1 = create_page(&conn, Some(&child1.id), "Subchild 1", None).expect("subchild1");
    let child2 = create_page(&conn, Some(&root.id), "Child 2", None).expect("child2");

    // Tree verification
    let tree = get_page_tree(&conn, None).expect("get tree");
    assert_eq!(tree.len(), 4);
    assert_eq!(tree[0].id, root.id);
    assert_eq!(tree[0].depth, 0);
    assert_eq!(tree[0].children_count, 2);

    // Cycle prevention: root cannot be moved under its own descendant (subchild1)
    let move_cycle = move_page(&conn, &root.id, Some(&subchild1.id)).expect("move cycle");
    assert!(
        !move_cycle,
        "Root moving under its descendant must be rejected"
    );

    // Page cannot be its own parent
    let self_parent = move_page(&conn, &root.id, Some(&root.id)).expect("self parent");
    assert!(!self_parent, "Page cannot be its own parent");

    // Valid move: move child2 under child1
    let valid_move = move_page(&conn, &child2.id, Some(&child1.id)).expect("valid move");
    assert!(valid_move);

    let tree_after = get_page_tree(&conn, None).expect("tree after");
    let child1_node = tree_after
        .iter()
        .find(|n| n.id == child1.id)
        .expect("find child1");
    assert_eq!(child1_node.children_count, 2);

    // Reorder pages
    let reordered = reorder_pages(
        &conn,
        Some(&child1.id),
        &[child2.id.clone(), subchild1.id.clone()],
    )
    .expect("reorder");
    assert!(reordered);

    // Subtree soft delete
    let deleted = soft_delete_page_subtree(&conn, &root.id).expect("soft delete");
    assert!(deleted);

    let tree_empty = get_page_tree(&conn, None).expect("empty tree");
    assert_eq!(tree_empty.len(), 0);
}

#[test]
fn test_history_and_link_metadata() {
    let (db, _temp) = setup_test_db();
    let conn = db.lock().expect("lock db");

    let page = create_page(&conn, None, "Doc", None).expect("page");

    // Record history
    let h1 = record_page_history(&conn, &page.id, "<p>Draft 1</p>", None).expect("h1");
    assert!(!h1.is_empty());

    let h2 =
        record_page_history(&conn, &page.id, "<p>Draft 2</p>", Some("enc_draft2")).expect("h2");
    assert!(!h2.is_empty());

    let history = get_page_history(&conn, &page.id).expect("get history");
    assert_eq!(history.len(), 2);
    assert_eq!(history[0].id, h2);
    assert_eq!(history[1].id, h1);

    // Restore h1
    let restored = restore_page_revision(&conn, &page.id, &h1).expect("restore");
    assert!(restored);

    let after_restore = get_page(&conn, &page.id).expect("get").expect("found");
    assert_eq!(after_restore.content, "<p>Draft 1</p>");
    assert_eq!(after_restore.encrypted_content, None);

    // Link metadata cache
    let meta = LinkMetadata {
        url: "https://example.com/rust".to_string(),
        title: Some("Rust Book".to_string()),
        channel: Some("Rustaceans".to_string()),
        duration: Some(120.5),
        is_playlist: Some(false),
        playlist_count: None,
        upload_date: Some("2026-01-01".to_string()),
        image_url: Some("https://example.com/cover.png".to_string()),
    };

    let saved_meta = save_link_metadata(&conn, &meta).expect("save meta");
    assert!(saved_meta);

    let fetched_meta = get_link_metadata(&conn, "https://example.com/rust")
        .expect("get meta")
        .expect("found");
    assert_eq!(fetched_meta.title.as_deref(), Some("Rust Book"));
    assert_eq!(fetched_meta.channel.as_deref(), Some("Rustaceans"));
    assert_eq!(fetched_meta.duration, Some(120.5));

    let deleted_meta = delete_link_metadata(&conn, "https://example.com/rust").expect("del meta");
    assert!(deleted_meta);

    let after_del = get_link_metadata(&conn, "https://example.com/rust").expect("get meta");
    assert!(after_del.is_none());
}

#[test]
fn test_get_pages_unfiltered_returns_more_than_150_and_handles_legacy_column_types() {
    let (db, _temp) = setup_test_db();
    let conn = db.lock().expect("lock db");

    for index in 0..165 {
        let id = format!("page-{index}");
        conn.execute(
            "INSERT INTO pages (id, title, content, icon, sort_order, created_at, updated_at)
             VALUES (?1, ?2, NULL, NULL, ?3, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
            rusqlite::params![id, format!("Page {index}"), index as f64],
        )
        .expect("insert legacy page");
    }

    let all_pages = get_pages(&conn, None).expect("get all unfiltered pages");
    assert_eq!(all_pages.len(), 165);
    assert!(all_pages.iter().any(|page| page.sort_order == 164));

    let metas = get_page_metas(&conn).expect("get lightweight page metas");
    assert_eq!(metas.len(), 165);
    assert!(metas
        .iter()
        .any(|meta| (meta.sort_order - 164.0).abs() < f64::EPSILON));
}
