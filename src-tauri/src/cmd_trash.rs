use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct TrashItem {
    pub id: String,
    pub title: String,
    pub item_type: String,
    pub deleted_at: String,
}

#[tauri::command]
pub fn trash_get_all(db_state: tauri::State<crate::db::DbState>) -> Result<Vec<TrashItem>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let query = "
        SELECT id, title, deleted_at, 'page' as item_type FROM pages WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, name as title, deleted_at, 'anki_deck' as item_type FROM anki_decks WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, front as title, deleted_at, 'anki_card' as item_type FROM anki_cards WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, name as title, deleted_at, 'file' as item_type FROM files WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, name as title, deleted_at, 'vault' as item_type FROM vault_groups WHERE deleted_at IS NOT NULL
        UNION ALL
        SELECT id, description as title, deleted_at, 'finance' as item_type FROM transactions WHERE deleted_at IS NOT NULL
        ORDER BY deleted_at DESC
    ";

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(TrashItem {
                id: row.get(0)?,
                title: row.get(1)?,
                deleted_at: row.get(2)?,
                item_type: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }

    Ok(items)
}

#[tauri::command]
pub fn trash_restore(
    id: String,
    item_type: String,
    db_state: tauri::State<crate::db::DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let table = match item_type.as_str() {
        "page" => "pages",
        "anki_deck" => "anki_decks",
        "anki_card" => "anki_cards",
        "file" => "files",
        "vault" => "vault_groups",
        "finance" => "transactions",
        _ => return Err("Tipo não suportado".into()),
    };

    let query = format!(
        "UPDATE {} SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        table
    );
    conn.execute(&query, rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    if item_type == "file" {
        let _ = conn.execute("UPDATE library_highlights SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE book_id = ?", [&id]);
        let _ = conn.execute("UPDATE library_bookmarks SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE book_id = ?", [&id]);
    }

    Ok(true)
}

#[tauri::command]
pub fn trash_delete_permanently(
    id: String,
    item_type: String,
    db_state: tauri::State<crate::db::DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco nǜo inicializado")?;

    let table = match item_type.as_str() {
        "page" => "pages",
        "anki_deck" => "anki_decks",
        "anki_card" => "anki_cards",
        "file" => "files",
        "vault" => "vault_groups",
        "finance" => "transactions",
        _ => return Err("Tipo nǜo suportado".into()),
    };

    let query = format!("DELETE FROM {} WHERE id = ?", table);
    conn.execute(&query, rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    if item_type == "file" {
        let _ = conn.execute("DELETE FROM library_highlights WHERE book_id = ?", [&id]);
        let _ = conn.execute("DELETE FROM library_bookmarks WHERE book_id = ?", [&id]);
        let _ = conn.execute("DELETE FROM library_reading_sessions WHERE book_id = ?", [&id]);
        let _ = conn.execute("DELETE FROM library_ocr_cache WHERE book_id = ?", [&id]);
    }

    Ok(true)
}

#[tauri::command]
pub fn trash_empty(db_state: tauri::State<crate::db::DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco nǜo inicializado")?;

    let tables = vec![
        "pages",
        "anki_decks",
        "anki_cards",
        "files",
        "vault_groups",
        "transactions",
        "file_folders",
    ];

    for table in tables {
        let query = format!("DELETE FROM {} WHERE deleted_at IS NOT NULL", table);
        let _ = conn.execute(&query, []);
    }

    Ok(true)
}
