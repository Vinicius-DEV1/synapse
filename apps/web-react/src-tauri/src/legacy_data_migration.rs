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
#[path = "legacy_data_migration/tests.rs"]
mod tests;
