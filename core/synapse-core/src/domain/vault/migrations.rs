//! Vault migration helpers for batch column encryption and decryption.

use crate::error::Result;
use rusqlite::{params, Connection};

/// Clears all entries in the keychain table.
pub fn clear_keychain(conn: &Connection) -> Result<()> {
    conn.execute("DELETE FROM keychain", [])?;
    Ok(())
}

/// Retrieves all pages with encrypted content for migration/decryption.
pub fn get_encrypted_pages(conn: &Connection) -> Result<Vec<(String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT id, encrypted_content FROM pages \
         WHERE encrypted_content IS NOT NULL AND encrypted_content != '' AND deleted_at IS NULL",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;
    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

/// Updates page plaintext content and clears encrypted content when decrypting.
pub fn set_page_decrypted_content(conn: &Connection, id: &str, content: &str) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE pages SET content = ?1, encrypted_content = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![content, id],
    )?;
    Ok(rows > 0)
}

/// Retrieves all page history revisions with encrypted content.
pub fn get_encrypted_page_history(conn: &Connection) -> Result<Vec<(String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT id, encrypted_content FROM page_history \
         WHERE encrypted_content IS NOT NULL AND encrypted_content != ''",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;
    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

/// Updates page history plaintext content and clears encrypted content.
pub fn set_page_history_decrypted_content(
    conn: &Connection,
    id: &str,
    content: &str,
) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE page_history SET content = ?1, encrypted_content = NULL WHERE id = ?2",
        params![content, id],
    )?;
    Ok(rows > 0)
}

/// Retrieves all diagrams with encrypted content.
pub fn get_encrypted_diagrams(conn: &Connection) -> Result<Vec<(String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT id, encrypted_content FROM diagrams \
         WHERE encrypted_content IS NOT NULL AND encrypted_content != '' AND deleted_at IS NULL",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;
    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

/// Updates diagram plaintext content and clears encrypted content.
pub fn set_diagram_decrypted_content(conn: &Connection, id: &str, content: &str) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE diagrams SET content = ?1, encrypted_content = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![content, id],
    )?;
    Ok(rows > 0)
}

/// Retrieves all vault groups (id, name, icon, color) for migration.
pub fn get_vault_groups_migration(
    conn: &Connection,
) -> Result<Vec<(String, String, Option<String>, Option<String>)>> {
    let mut stmt =
        conn.prepare("SELECT id, name, icon, color FROM vault_groups WHERE deleted_at IS NULL")?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<String>>(3)?,
        ))
    })?;
    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

/// Updates vault group fields during migration.
pub fn update_vault_group_migration(
    conn: &Connection,
    id: &str,
    name: &str,
    icon: Option<&str>,
    color: Option<&str>,
) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE vault_groups SET name = ?1, icon = ?2, color = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4",
        params![name, icon, color, id],
    )?;
    Ok(rows > 0)
}

/// Retrieves all password history entries (id, password) for migration.
pub fn get_vault_password_history_migration(conn: &Connection) -> Result<Vec<(String, String)>> {
    let mut stmt =
        conn.prepare("SELECT id, password FROM vault_password_history WHERE deleted_at IS NULL")?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;
    let mut list = Vec::new();
    for r in rows.flatten() {
        list.push(r);
    }
    Ok(list)
}

/// Updates password history entry during migration.
pub fn update_vault_password_history_migration(
    conn: &Connection,
    id: &str,
    password: &str,
) -> Result<bool> {
    let rows = conn.execute(
        "UPDATE vault_password_history SET password = ?1 WHERE id = ?2",
        params![password, id],
    )?;
    Ok(rows > 0)
}
