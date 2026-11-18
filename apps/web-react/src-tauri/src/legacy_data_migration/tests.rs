use super::{migrate_legacy_data_dir_from, MIGRATION_MARKER};
use rusqlite::Connection;
use std::path::PathBuf;

struct TestDirectories {
    root: PathBuf,
    legacy: PathBuf,
    canonical: PathBuf,
}

impl TestDirectories {
    fn new() -> Self {
        let root =
            std::env::temp_dir().join(format!("synapse-legacy-migration-{}", uuid::Uuid::new_v4()));
        let legacy = root.join("legacy");
        let canonical = root.join("canonical");
        std::fs::create_dir_all(&legacy).expect("create legacy test directory");
        Self {
            root,
            legacy,
            canonical,
        }
    }
}

impl Drop for TestDirectories {
    fn drop(&mut self) {
        std::fs::remove_dir_all(&self.root).expect("remove isolated migration test data");
    }
}

#[test]
fn interrupted_copy_resumes_when_the_database_file_already_exists() {
    let dirs = TestDirectories::new();
    std::fs::create_dir_all(dirs.canonical.join("media")).expect("create partial target");
    std::fs::write(dirs.legacy.join("caderno.sqlite"), b"database").expect("write legacy database");
    std::fs::create_dir_all(dirs.legacy.join("media")).expect("create legacy media directory");
    std::fs::write(dirs.legacy.join("media/book.epub"), b"book").expect("write legacy media");
    std::fs::write(dirs.canonical.join("caderno.sqlite"), b"database")
        .expect("simulate copied database");
    std::fs::write(dirs.canonical.join(MIGRATION_MARKER), b"in-progress")
        .expect("simulate interrupted migration marker");

    migrate_legacy_data_dir_from(&dirs.legacy, &dirs.canonical)
        .expect("resume interrupted migration");

    assert_eq!(
        std::fs::read(dirs.canonical.join("media/book.epub")).expect("read copied media"),
        b"book"
    );
    assert!(!dirs.canonical.join(MIGRATION_MARKER).exists());
}

#[test]
fn failed_copy_keeps_progress_marker_and_can_resume() {
    let dirs = TestDirectories::new();
    let legacy_database = Connection::open(dirs.legacy.join("caderno.sqlite"))
        .expect("create legacy SQLite database");
    legacy_database
        .execute_batch("CREATE TABLE migration_probe (id TEXT PRIMARY KEY);")
        .expect("initialize legacy SQLite database");
    drop(legacy_database);
    std::fs::create_dir_all(dirs.legacy.join("media")).expect("create legacy media directory");
    std::fs::write(dirs.legacy.join("media/book.epub"), b"book").expect("write legacy media");
    std::fs::create_dir_all(&dirs.canonical).expect("create canonical directory");
    std::fs::write(dirs.canonical.join("media"), b"conflicting file")
        .expect("create conflicting target");

    assert!(migrate_legacy_data_dir_from(&dirs.legacy, &dirs.canonical).is_err());
    assert!(dirs.canonical.join(MIGRATION_MARKER).exists());

    std::fs::remove_file(dirs.canonical.join("media")).expect("remove test conflict");
    migrate_legacy_data_dir_from(&dirs.legacy, &dirs.canonical)
        .expect("resume migration after resolving the conflict");

    assert_eq!(
        std::fs::read(dirs.canonical.join("media/book.epub")).expect("read copied media"),
        b"book"
    );
    assert!(!dirs.canonical.join(MIGRATION_MARKER).exists());
}

#[test]
fn legacy_migration_uses_a_consistent_backup_of_the_live_wal_database() {
    let dirs = TestDirectories::new();
    let source_path = dirs.legacy.join("caderno.sqlite");
    let source = Connection::open(&source_path).expect("open legacy SQLite database");
    source
        .execute_batch(
            "PRAGMA journal_mode=WAL;
             CREATE TABLE migration_probe (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
             INSERT INTO migration_probe (id, payload) VALUES ('probe', 'committed-in-wal');",
        )
        .expect("write committed legacy database row");
    assert!(dirs.legacy.join("caderno.sqlite-wal").exists());

    migrate_legacy_data_dir_from(&dirs.legacy, &dirs.canonical)
        .expect("copy legacy files with online SQLite backup");

    let target = Connection::open(dirs.canonical.join("caderno.sqlite"))
        .expect("open canonical database copy");
    let payload: String = target
        .query_row(
            "SELECT payload FROM migration_probe WHERE id = 'probe'",
            [],
            |row| row.get(0),
        )
        .expect("read committed WAL data from canonical copy");
    assert_eq!(payload, "committed-in-wal");
    assert!(source_path.exists());
    assert!(!dirs.canonical.join(MIGRATION_MARKER).exists());
}

#[test]
fn completed_canonical_database_is_not_overwritten_by_legacy_data() {
    let dirs = TestDirectories::new();
    std::fs::create_dir_all(&dirs.canonical).expect("create canonical directory");
    std::fs::write(dirs.legacy.join("caderno.sqlite"), b"old database")
        .expect("write legacy database");
    std::fs::write(dirs.canonical.join("caderno.sqlite"), b"current database")
        .expect("write canonical database");

    migrate_legacy_data_dir_from(&dirs.legacy, &dirs.canonical).expect("skip completed migration");

    assert_eq!(
        std::fs::read(dirs.canonical.join("caderno.sqlite")).expect("read canonical database"),
        b"current database"
    );
    assert!(!dirs.canonical.join(MIGRATION_MARKER).exists());
}
