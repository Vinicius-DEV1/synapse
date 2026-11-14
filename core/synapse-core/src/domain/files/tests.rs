use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_files_domain() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();

    // Create root folder
    let root = FilesRepository::create_folder(&db, "Documents", None, Some("#3b82f6"))
        .expect("create folder")
        .expect("folder");
    assert_eq!(root.name, "Documents");

    // Create subfolder
    let sub = FilesRepository::create_folder(&db, "Research", Some(&root.id), Some("#10b981"))
        .expect("create sub")
        .expect("sub");
    assert_eq!(sub.name, "Research");

    // List folders
    let roots = FilesRepository::get_folders(&db, None).expect("get root folders");
    assert_eq!(roots.len(), 1);
    let subs = FilesRepository::get_folders(&db, Some(&root.id)).expect("get sub folders");
    assert_eq!(subs.len(), 1);

    // Rename subfolder
    assert!(FilesRepository::rename_folder(&db, &sub.id, "Deep Research").expect("rename"));
    let subs2 = FilesRepository::get_folders(&db, Some(&root.id)).expect("get sub folders");
    assert_eq!(subs2[0].name, "Deep Research");

    // Insert file directly to test file operations
    {
        let conn = db.lock().unwrap();
        let _ = conn.execute(
            "INSERT INTO files (id, name, file_type, file_size, folder_id, created_at, updated_at) \
             VALUES ('f1', 'report.pdf', 'document', 1024, ?1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
            [&sub.id],
        );
    }

    let files = FilesRepository::get_files_for_section(&db, "folders", Some(&sub.id)).expect("get files");
    assert_eq!(files.len(), 1);
    assert_eq!(files[0].name, "report.pdf");

    // Duplicate file
    let _copy_id = FilesRepository::duplicate_file(&db, "f1", Some(&sub.id)).expect("duplicate").expect("copy");
    let files2 = FilesRepository::get_files_for_section(&db, "folders", Some(&sub.id)).expect("get files");
    assert_eq!(files2.len(), 2);

    // Link file to page
    assert!(FilesRepository::link_file_to_page(&db, "f1", "p1").expect("link"));
    let linked = FilesRepository::get_file_linked_pages(&db, "f1").expect("linked");
    assert_eq!(linked.len(), 1);
    assert_eq!(linked[0], "p1");

    // Unlink
    assert!(FilesRepository::unlink_file_from_page(&db, "f1", "p1").expect("unlink"));
    let linked2 = FilesRepository::get_file_linked_pages(&db, "f1").expect("linked");
    assert!(linked2.is_empty());

    // Delete folder (soft deletes folder and child files)
    assert!(FilesRepository::delete_folder(&db, &sub.id).expect("delete folder"));
    let subs_after = FilesRepository::get_folders(&db, Some(&root.id)).expect("get sub folders");
    assert!(subs_after.is_empty());
}
