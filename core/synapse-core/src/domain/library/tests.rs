use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

fn setup_test_db() -> (Database, NamedTempFile) {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::open(temp_file.path()).expect("Failed to open database");
    (db, temp_file)
}

#[test]
fn test_book_crud_and_query() {
    let (db, _temp) = setup_test_db();

    let book = BookRecord {
        id: "book-1".to_string(),
        title: "Clean Code".to_string(),
        author: Some("Robert C. Martin".to_string()),
        file_path: Some("/books/cleancode.pdf".to_string()),
        drive_file_id: None,
        cover_color: Some("#3b82f6".to_string()),
        cover_image: None,
        collections: Some("[]".to_string()),
        total_pages: Some(464),
        current_page: Some(50),
        reading_status: Some("reading".to_string()),
        last_read_page: Some("50".to_string()),
        epub_locations: None,
        reading_preferences: None,
        language: Some("en".to_string()),
        last_read_at: None,
        original_name: Some("cleancode.pdf".to_string()),
        published_year: Some(2008),
        publisher: Some("Prentice Hall".to_string()),
        description: Some("A Handbook of Agile Software Craftsmanship".to_string()),
        is_local: Some(true),
        is_archived: Some(false),
        archived_at: None,
        created_at: None,
        updated_at: None,
        deleted_at: None,
    };

    LibraryRepository::insert_book(&db, &book).expect("Insert book");

    let fetched = LibraryRepository::get_book(&db, "book-1").expect("Get book");
    assert!(fetched.is_some());
    let b = fetched.unwrap();
    assert_eq!(b.title, "Clean Code");
    assert_eq!(b.total_pages, Some(464));

    // Update progress
    assert!(
        LibraryRepository::update_book_progress(&db, "book-1", 100, 464, None)
            .expect("Update progress")
    );
    let fetched_after = LibraryRepository::get_book(&db, "book-1").unwrap().unwrap();
    assert_eq!(fetched_after.current_page, Some(100));
    assert_eq!(fetched_after.reading_status, Some("reading".to_string()));

    // Queries
    let all = LibraryRepository::get_books(&db, None).expect("Get all books");
    assert_eq!(all.len(), 1);

    let filtered = LibraryRepository::get_books(&db, Some("Clean")).expect("Filtered");
    assert_eq!(filtered.len(), 1);

    let none = LibraryRepository::get_books(&db, Some("Design Patterns")).expect("Filtered empty");
    assert_eq!(none.len(), 0);

    // Delete
    assert!(LibraryRepository::soft_delete_book(&db, "book-1").expect("Delete book"));
    let after_del = LibraryRepository::get_books(&db, None).expect("Get after delete");
    assert_eq!(after_del.len(), 0);
}

#[test]
fn test_collections_and_relations() {
    let (db, _temp) = setup_test_db();

    let col = LibraryRepository::create_collection(&db, "Software", "#22c55e").expect("Create col");
    assert!(col.is_some());
    let col = col.unwrap();
    assert_eq!(col.name, "Software");

    let collections = LibraryRepository::get_collections(&db).expect("Get cols");
    assert_eq!(collections.len(), 1);

    // Update
    assert!(
        LibraryRepository::update_collection(&db, &col.id, "Software Engineering", "#10b981")
            .expect("Update col")
    );
    let updated_cols = LibraryRepository::get_collections(&db).expect("Get updated cols");
    assert_eq!(updated_cols[0].name, "Software Engineering");

    // Book relation
    let book = BookRecord {
        id: "book-rel".to_string(),
        title: "Refactoring".to_string(),
        author: Some("Martin Fowler".to_string()),
        file_path: None,
        drive_file_id: None,
        cover_color: None,
        cover_image: None,
        collections: None,
        total_pages: Some(400),
        current_page: Some(0),
        reading_status: None,
        last_read_page: None,
        epub_locations: None,
        reading_preferences: None,
        language: None,
        last_read_at: None,
        original_name: None,
        published_year: None,
        publisher: None,
        description: None,
        is_local: None,
        is_archived: None,
        archived_at: None,
        created_at: None,
        updated_at: None,
        deleted_at: None,
    };
    LibraryRepository::insert_book(&db, &book).unwrap();

    assert!(
        LibraryRepository::set_book_collections(&db, "book-rel", &[col.id.clone()])
            .expect("Set relations")
    );

    // Delete
    assert!(LibraryRepository::delete_collection(&db, &col.id).expect("Delete col"));
    let empty_cols = LibraryRepository::get_collections(&db).expect("Empty cols");
    assert_eq!(empty_cols.len(), 0);
}

#[test]
fn test_bookmarks_highlights_and_stats() {
    let (db, _temp) = setup_test_db();

    let book = BookRecord {
        id: "book-stats".to_string(),
        title: "The Pragmatic Programmer".to_string(),
        author: Some("Andy Hunt".to_string()),
        file_path: None,
        drive_file_id: None,
        cover_color: None,
        cover_image: None,
        collections: None,
        total_pages: Some(350),
        current_page: Some(20),
        reading_status: Some("reading".to_string()),
        last_read_page: None,
        epub_locations: None,
        reading_preferences: None,
        language: None,
        last_read_at: None,
        original_name: None,
        published_year: None,
        publisher: None,
        description: None,
        is_local: None,
        is_archived: None,
        archived_at: None,
        created_at: None,
        updated_at: None,
        deleted_at: None,
    };
    LibraryRepository::insert_book(&db, &book).unwrap();

    // Bookmark
    let bm = LibraryRepository::add_bookmark(&db, "book-stats", 42, Some("Important chapter"))
        .expect("Add bookmark");
    assert_eq!(bm.page_number, 42);
    let bms = LibraryRepository::get_bookmarks(&db, "book-stats").expect("Get bookmarks");
    assert_eq!(bms.len(), 1);

    // Highlight
    let hl = LibraryRepository::add_highlight(
        &db,
        "book-stats",
        42,
        "Care About Your Craft",
        Some("#fde047"),
        None,
    )
    .expect("Add highlight");
    assert_eq!(hl.text_content, "Care About Your Craft");
    let hls = LibraryRepository::get_highlights(&db, "book-stats").expect("Get highlights");
    assert_eq!(hls.len(), 1);

    // Reading Session & Stats
    let session_id =
        LibraryRepository::start_reading_session(&db, "book-stats", 20).expect("Start session");
    assert!(session_id.is_some());
    let sid = session_id.unwrap();

    assert!(LibraryRepository::end_reading_session(&db, &sid, 35, 20).expect("End session"));

    let stats = LibraryRepository::get_reading_stats(&db).expect("Get stats");
    assert_eq!(stats.total_books_started, 1);
    assert_eq!(stats.total_highlights, 1);
    assert_eq!(stats.total_pages_read, 16); // |35 - 20| + 1 = 16
    assert_eq!(stats.current_streak, 1);
    assert_eq!(stats.longest_streak, 1);
}
