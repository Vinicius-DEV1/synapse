use std::ffi::OsString;
use std::io;
use std::path::{Path, PathBuf};

const MIGRATION_MARKER: &str = ".synapse-legacy-copy-in-progress";

/// Copies missing files and directories recursively, publishing files atomically.
fn copy_dir_all(src: &Path, dst: &Path) -> io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let source = entry.path();
        let target = dst.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_all(&source, &target)?;
        } else {
            copy_file_if_missing(&source, &target)?;
        }
    }
    Ok(())
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

    match std::fs::rename(&temporary, target) {
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
    copy_dir_all(legacy_dir, canonical_dir)?;
    std::fs::remove_file(marker)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{migrate_legacy_data_dir_from, MIGRATION_MARKER};
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
        std::fs::write(dirs.legacy.join("caderno.sqlite"), b"database")
            .expect("write legacy database");
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
