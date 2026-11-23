//! Diagrams domain integration tests.

use super::models::DiagramRecord;
use super::DiagramsRepository;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_diagrams_lifecycle_and_crud() {
    let temp_file = NamedTempFile::new().unwrap();
    let db = Database::open(temp_file.path()).unwrap();

    let diag = DiagramRecord {
        id: "diag_1".to_string(),
        title: "Arquitetura Synapse".to_string(),
        icon: "🎨".to_string(),
        content: "[{\"type\":\"rect\"}]".to_string(),
        encrypted_content: None,
        created_at: None,
        updated_at: None,
        deleted_at: None,
    };

    DiagramsRepository::create_diagram(&db, &diag).unwrap();

    let list = DiagramsRepository::get_diagrams(&db).unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].title, "Arquitetura Synapse");

    let fetched = DiagramsRepository::get_diagram(&db, "diag_1").unwrap();
    assert!(fetched.is_some());
    let fetched = fetched.unwrap();
    assert_eq!(fetched.content, "[{\"type\":\"rect\"}]");

    // Update diagram
    assert!(DiagramsRepository::save_diagram(
        &db,
        "diag_1",
        "Arquitetura Synapse Atualizada",
        "[{\"type\":\"circle\"}]",
        None,
        "📐"
    )
    .unwrap());

    let updated = DiagramsRepository::get_diagram(&db, "diag_1")
        .unwrap()
        .unwrap();
    assert_eq!(updated.title, "Arquitetura Synapse Atualizada");
    assert_eq!(updated.content, "[{\"type\":\"circle\"}]");
    assert_eq!(updated.icon, "📐");

    // Soft delete
    assert!(DiagramsRepository::delete_diagram(&db, "diag_1").unwrap());
    let list_after = DiagramsRepository::get_diagrams(&db).unwrap();
    assert_eq!(list_after.len(), 0);
}
