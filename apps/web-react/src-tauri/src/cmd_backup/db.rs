use std::path::Path;

/// Decrypts all encrypted columns in a temporary SQLite database copy and wipes the keychain table.
pub fn decrypt_database_copy(
    db_path: &Path,
    keys: &Option<crate::cmd_auth::UnlockedKeys>,
) -> Result<i64, String> {
    let keys = keys
        .as_ref()
        .ok_or("Keys not available — user must be authenticated")?;

    let conn = rusqlite::Connection::open(db_path)
        .map_err(|e| format!("Failed to open database copy: {}", e))?;

    let mut total_decrypted: i64 = 0;

    // Decrypt pages
    if let Some(ref notes_key) = keys.notes {
        let mut stmt = conn
            .prepare("SELECT id, encrypted_content FROM pages WHERE encrypted_content IS NOT NULL")
            .map_err(|e| e.to_string())?;

        let rows: Vec<(String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for (id, enc) in &rows {
            if let Ok(decrypted) = crate::crypto::decrypt_content(notes_key, enc) {
                let _ = conn.execute(
                    "UPDATE pages SET content = ?, encrypted_content = NULL WHERE id = ?",
                    rusqlite::params![decrypted, id],
                );
                total_decrypted += 1;
            }
        }
    }

    // Decrypt page_history
    if let Some(ref notes_key) = keys.notes {
        let mut stmt = conn
            .prepare("SELECT id, encrypted_content FROM page_history WHERE encrypted_content IS NOT NULL")
            .map_err(|e| e.to_string())?;

        let rows: Vec<(String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for (id, enc) in &rows {
            if let Ok(decrypted) = crate::crypto::decrypt_content(notes_key, enc) {
                let _ = conn.execute(
                    "UPDATE page_history SET content = ?, encrypted_content = NULL WHERE id = ?",
                    rusqlite::params![decrypted, id],
                );
                total_decrypted += 1;
            }
        }
    }

    // Decrypt diagrams
    if let Some(ref notes_key) = keys.notes {
        let mut stmt = conn
            .prepare("SELECT id, encrypted_content FROM diagrams WHERE encrypted_content IS NOT NULL")
            .map_err(|e| e.to_string())?;

        let rows: Vec<(String, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for (id, enc) in &rows {
            if let Ok(decrypted) = crate::crypto::decrypt_content(notes_key, enc) {
                let _ = conn.execute(
                    "UPDATE diagrams SET content = ?, encrypted_content = NULL WHERE id = ?",
                    rusqlite::params![decrypted, id],
                );
                total_decrypted += 1;
            }
        }
    }

    // Decrypt files metadata (local_path, drive_file_id)
    if let Some(ref files_key) = keys.files {
        let mut stmt = conn
            .prepare("SELECT id, local_path, drive_file_id FROM files")
            .map_err(|e| e.to_string())?;

        let rows: Vec<(String, Option<String>, Option<String>)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for (id, local_path, drive_id) in &rows {
            let dec_path = local_path
                .as_ref()
                .and_then(|p| crate::crypto::decrypt_content(files_key, p).ok());
            let dec_drive = drive_id
                .as_ref()
                .and_then(|d| crate::crypto::decrypt_content(files_key, d).ok());

            if dec_path.is_some() || dec_drive.is_some() {
                let _ = conn.execute(
                    "UPDATE files SET local_path = ?, drive_file_id = ? WHERE id = ?",
                    rusqlite::params![
                        dec_path.or_else(|| local_path.clone()),
                        dec_drive.or_else(|| drive_id.clone()),
                        id
                    ],
                );
                total_decrypted += 1;
            }
        }
    }

    // Decrypt vault items
    if let Some(ref vault_key) = keys.vault {
        let mut stmt = conn
            .prepare("SELECT id, password, notes, custom_fields FROM vault_items")
            .map_err(|e| e.to_string())?;

        let rows: Vec<(String, Option<String>, Option<String>, Option<String>)> = stmt
            .query_map([], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for (id, password, notes, custom) in &rows {
            let dec_pass = password
                .as_ref()
                .and_then(|p| crate::crypto::decrypt_content(vault_key, p).ok());
            let dec_notes = notes
                .as_ref()
                .and_then(|n| crate::crypto::decrypt_content(vault_key, n).ok());
            let dec_custom = custom
                .as_ref()
                .and_then(|c| crate::crypto::decrypt_content(vault_key, c).ok());

            if dec_pass.is_some() || dec_notes.is_some() || dec_custom.is_some() {
                let _ = conn.execute(
                    "UPDATE vault_items SET password = ?, notes = ?, custom_fields = ? WHERE id = ?",
                    rusqlite::params![
                        dec_pass.or_else(|| password.clone()),
                        dec_notes.or_else(|| notes.clone()),
                        dec_custom.or_else(|| custom.clone()),
                        id
                    ],
                );
                total_decrypted += 1;
            }
        }

        // Also decrypt vault password history
        let mut stmt2 = conn
            .prepare("SELECT id, password FROM vault_password_history")
            .map_err(|e| e.to_string())?;

        let rows2: Vec<(String, String)> = stmt2
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        for (id, password) in &rows2 {
            if let Ok(dec) = crate::crypto::decrypt_content(vault_key, password) {
                let _ = conn.execute(
                    "UPDATE vault_password_history SET password = ? WHERE id = ?",
                    rusqlite::params![dec, id],
                );
                total_decrypted += 1;
            }
        }
    }

    // Remove the keychain table from decrypted backup (no longer needed, and sensitive)
    let _ = conn.execute("DELETE FROM keychain", []);

    // Vacuum database copy to wipe freed pages and prevent residual key recovery from SQLite slack space
    let _ = conn.execute("VACUUM", []);

    Ok(total_decrypted)
}

/// Retrieves all external Google Drive file IDs and titles stored across media tables.
pub fn get_drive_file_ids(db_path: &Path) -> Vec<(String, String)> {
    let conn = match rusqlite::Connection::open(db_path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let mut result = Vec::new();

    // Videos with drive_file_id
    if let Ok(mut stmt) = conn.prepare(
        "SELECT drive_file_id, title FROM videos WHERE drive_file_id IS NOT NULL AND drive_file_id != ''",
    ) {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }) {
            for row in rows.flatten() {
                result.push(row);
            }
        }
    }

    // Books with drive_file_id
    if let Ok(mut stmt) = conn.prepare(
        "SELECT drive_file_id, title FROM library_books WHERE drive_file_id IS NOT NULL AND drive_file_id != ''",
    ) {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }) {
            for row in rows.flatten() {
                result.push(row);
            }
        }
    }

    // Lofis with drive_file_id
    if let Ok(mut stmt) = conn.prepare(
        "SELECT drive_file_id, title FROM lofis WHERE drive_file_id IS NOT NULL AND drive_file_id != ''",
    ) {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }) {
            for row in rows.flatten() {
                result.push(row);
            }
        }
    }

    result
}
