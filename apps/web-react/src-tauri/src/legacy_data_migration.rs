use rusqlite::{Connection, DatabaseName, OpenFlags};
use std::ffi::{OsStr, OsString};
use std::io;
use std::path::{Path, PathBuf};

const MIGRATION_MARKER: &str = ".synapse-legacy-copy-in-progress";

/// Copies missing files and directories recursively, publishing files atomically.
fn copy_dir_all(src: &Path, dst: &Path) -> io::Result<()> {
    copy_dir_contents(src, dst, false)
}

fn copy_legacy_files(src: &Path, dst: &Path) -> io::Result<()> {
    copy_dir_contents(src, dst, true)
}

fn copy_dir_contents(src: &Path, dst: &Path, skip_root_sqlite_files: bool) -> io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let source = entry.path();
        let target = dst.join(entry.file_name());
        if skip_root_sqlite_files && is_legacy_database_file(&entry.file_name()) {
            continue;
        }
        if entry.file_type()?.is_dir() {
            copy_dir_all(&source, &target)?;
        } else {
            copy_file_if_missing(&source, &target)?;
        }
    }
    Ok(())
}

fn is_legacy_database_file(name: &OsStr) -> bool {
    [
        "caderno.sqlite",
        "caderno.sqlite-wal",
        "caderno.sqlite-shm",
        "caderno.sqlite-journal",
    ]
    .iter()
    .any(|candidate| name == OsStr::new(candidate))
}

fn copy_file_if_missing(source: &Path, target: &Path) -> io::Result<()> {
    if target_is_existing_file(target)? {
        return Ok(());
    }
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let temporary = temporary_path(target)?;
    match std::fs::copy(source, &temporary) {
        Ok(_) => {}
        Err(copy_error) => return Err(cleanup_after_error(&temporary, copy_error)),
    }

    publish_temporary_file(&temporary, target)
}

fn copy_sqlite_database_if_missing(source: &Path, target: &Path) -> io::Result<()> {
    if target_is_existing_file(target)? {
        return Ok(());
    }
    let temporary = temporary_path(target)?;
    let connection = Connection::open_with_flags(
        source,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|error| io::Error::other(format!("Failed to open legacy SQLite database: {error}")))?;
    if let Err(error) = connection.backup(DatabaseName::Main, &temporary, None) {
        return Err(cleanup_after_error(
            &temporary,
            io::Error::other(format!(
                "Failed to create a consistent SQLite backup: {error}"
            )),
        ));
    }
    publish_temporary_file(&temporary, target)
}

fn publish_temporary_file(temporary: &Path, target: &Path) -> io::Result<()> {
    match std::fs::rename(temporary, target) {
        Ok(()) => Ok(()),
        Err(rename_error) => match target_is_existing_file(target) {
            Ok(true) => {
                cleanup_temporary_file(&temporary)?;
                Ok(())
            }
            Ok(false) => Err(cleanup_after_error(&temporary, rename_error)),
            Err(target_error) => Err(cleanup_after_error(
                &temporary,
                io::Error::new(
                    rename_error.kind(),
                    format!("{rename_error}; could not inspect the destination: {target_error}"),
                ),
            )),
        },
    }
}

fn target_is_existing_file(target: &Path) -> io::Result<bool> {
    match std::fs::metadata(target) {
        Ok(metadata) if metadata.is_file() => Ok(true),
        Ok(_) => Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            format!(
                "Migration target is not a regular file: {}",
                target.display()
            ),
        )),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(false),
        Err(error) => Err(error),
    }
}

fn temporary_path(target: &Path) -> io::Result<PathBuf> {
    let parent = target.parent().unwrap_or_else(|| Path::new("."));
    let name = target.file_name().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            "Migration target has no file name",
        )
    })?;
    let mut temporary_name = OsString::from(".");
    temporary_name.push(name);
    temporary_name.push(format!(".migration-tmp-{}", std::process::id()));
    let temporary = parent.join(temporary_name);
    match std::fs::remove_file(&temporary) {
        Ok(()) => Ok(temporary),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(temporary),
        Err(error) => Err(error),
    }
}

fn cleanup_after_error(temporary: &Path, primary_error: io::Error) -> io::Error {
    match cleanup_temporary_file(temporary) {
        Ok(()) => primary_error,
        Err(cleanup_error) => io::Error::new(
            primary_error.kind(),
            format!("{primary_error}; temporary-file cleanup also failed: {cleanup_error}"),
        ),
    }
}

fn cleanup_temporary_file(temporary: &Path) -> io::Result<()> {
    match std::fs::remove_file(temporary) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error),
    }
}

/// Resumes an interrupted legacy copy without replacing files in an existing canonical database.
pub(super) fn migrate_legacy_data_dir(canonical_dir: &Path) -> io::Result<()> {
    let Some(data_dir) = dirs::data_dir() else {
        return Ok(());
    };
    let legacy_dir = data_dir.join("caderno");
    migrate_legacy_data_dir_from(&legacy_dir, canonical_dir)
}

fn migrate_legacy_data_dir_from(legacy_dir: &Path, canonical_dir: &Path) -> io::Result<()> {
    if !legacy_dir.is_dir() || legacy_dir == canonical_dir {
        return Ok(());
    }

    let legacy_db = legacy_dir.join("caderno.sqlite");
    if !legacy_db.is_file() {
        return Ok(());
    }

    let canonical_db = canonical_dir.join("caderno.sqlite");
    let marker = canonical_dir.join(MIGRATION_MARKER);
    if canonical_db.is_file() && !marker.exists() {
        return Ok(());
    }

    println!(
        "[Migration] Migrating legacy data from {:?} to {:?}",
        legacy_dir, canonical_dir
    );
    std::fs::create_dir_all(canonical_dir)?;
    std::fs::write(&marker, b"in-progress")?;
    copy_legacy_files(legacy_dir, canonical_dir)?;
    copy_sqlite_database_if_missing(&legacy_db, &canonical_db)?;
    std::fs::remove_file(marker)?;
    Ok(())
}

#[cfg(test)]
mod tests {
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
            let root = std::env::temp_dir()
                .join(format!("synapse-legacy-migration-{}", uuid::Uuid::new_v4()));
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
        std::fs::write(dirs.legacy.join("caderno.sqlite"), b"database")
            .expect("write legacy database");
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

        migrate_legacy_data_dir_from(&dirs.legacy, &dirs.canonical)
            .expect("skip completed migration");

        assert_eq!(
            std::fs::read(dirs.canonical.join("caderno.sqlite")).expect("read canonical database"),
            b"current database"
        );
        assert!(!dirs.canonical.join(MIGRATION_MARKER).exists());
    }
}
