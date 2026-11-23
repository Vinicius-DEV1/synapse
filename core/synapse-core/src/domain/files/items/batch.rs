use super::mutations::create_file;
use crate::domain::files::FileRecord;
use crate::error::Result;

pub fn create_files(conn: &rusqlite::Connection, files: &[FileRecord]) -> Result<bool> {
    let transaction = conn.unchecked_transaction()?;
    for file in files {
        if !create_file(
            &transaction,
            &file.id,
            &file.name,
            &file.file_type,
            file.file_size,
            file.local_path.as_deref().unwrap_or_default(),
            file.folder_id.as_deref(),
            file.mime_type.as_deref(),
        )? {
            return Ok(false);
        }
    }
    transaction.commit()?;
    Ok(true)
}
