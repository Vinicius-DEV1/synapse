use crate::db::DbState;
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use tauri::State;

#[derive(Serialize, Deserialize, Clone)]
pub struct VaultGroup {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub position: i32,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct VaultItem {
    pub id: String,
    pub group_id: String,
    pub label: String,
    pub username: Option<String>,
    pub email: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub custom_fields: Option<String>,
    pub is_favorite: i32,
    pub password_changed_at: Option<String>,
    pub password_strength: i32,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct VaultPasswordHistoryEntry {
    pub id: String,
    pub item_id: String,
    pub password: String,
    pub changed_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct BreachCheckResult {
    pub breached: bool,
    pub count: u64,
}

#[derive(Serialize, Deserialize)]
pub struct PasswordGenOptions {
    pub length: u32,
    pub uppercase: bool,
    pub lowercase: bool,
    pub numbers: bool,
    pub symbols: bool,
}

fn get_vault_key(db_state: &State<'_, DbState>) -> Result<String, String> {
    let keys_guard = db_state.keys.lock().unwrap();
    let keys = keys_guard.as_ref().ok_or("Não autenticado")?;
    let vault_key = keys.vault.as_ref().ok_or("Chave do cofre não encontrada")?;
    Ok(vault_key.clone())
}

// === GRUPOS ===

#[tauri::command]
pub fn vault_get_groups(db_state: State<'_, DbState>) -> Result<Vec<VaultGroup>, String> {
    let vault_key = get_vault_key(&db_state)?;
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, name, icon, color, position, created_at, updated_at, deleted_at FROM vault_groups WHERE deleted_at IS NULL ORDER BY position ASC, created_at ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(VaultGroup {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                color: row.get(3)?,
                position: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut groups = Vec::new();
    for row in rows {
        if let Ok(mut g) = row {
            if let Ok(dec_name) = crate::crypto::decrypt_content(&vault_key, &g.name) {
                g.name = dec_name;
            }
            if let Some(ref icon_enc) = g.icon {
                if let Ok(dec_icon) = crate::crypto::decrypt_content(&vault_key, icon_enc) {
                    g.icon = Some(dec_icon);
                }
            }
            if let Some(ref color_enc) = g.color {
                if let Ok(dec_color) = crate::crypto::decrypt_content(&vault_key, color_enc) {
                    g.color = Some(dec_color);
                }
            }
            groups.push(g);
        }
    }

    Ok(groups)
}

#[tauri::command]
pub fn vault_upsert_group(group: VaultGroup, db_state: State<'_, DbState>) -> Result<(), String> {
    let vault_key = get_vault_key(&db_state)?;

    let enc_name = crate::crypto::encrypt_content(&vault_key, &group.name)?;
    let enc_icon = if let Some(ref icon) = group.icon {
        Some(crate::crypto::encrypt_content(&vault_key, icon)?)
    } else {
        None
    };
    let enc_color = if let Some(ref color) = group.color {
        Some(crate::crypto::encrypt_content(&vault_key, color)?)
    } else {
        None
    };

    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute(
        "INSERT OR REPLACE INTO vault_groups (id, name, icon, color, position, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![group.id, enc_name, enc_icon, enc_color, group.position, group.created_at, group.updated_at, group.deleted_at],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn vault_delete_group(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE vault_groups SET deleted_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![now, now, id],
    )
    .map_err(|e| e.to_string())?;

    // Deleta credenciais associadas
    conn.execute(
        "UPDATE vault_items SET deleted_at = ?, updated_at = ? WHERE group_id = ?",
        rusqlite::params![now, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// === CREDENCIAIS ===

#[derive(Debug, Deserialize)]
pub struct GroupOrderUpdate {
    pub id: String,
    pub position: i32,
}

#[tauri::command]
pub fn vault_reorder_groups(
    updates: Vec<GroupOrderUpdate>,
    db_state: State<'_, DbState>,
) -> Result<(), String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    for update in updates {
        conn.execute(
            "UPDATE vault_groups SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            rusqlite::params![update.position, update.id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn vault_get_items(
    group_id: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<Vec<VaultItem>, String> {
    let vault_key = get_vault_key(&db_state)?;
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut items = Vec::new();

    if let Some(gid) = group_id {
        let mut stmt = conn.prepare("SELECT id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at, deleted_at FROM vault_items WHERE group_id = ? AND deleted_at IS NULL ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![gid], |row| Ok(row_to_vault_item(row)))
            .map_err(|e| e.to_string())?;
        for row in rows {
            if let Ok(mut item) = row {
                decrypt_vault_item(&mut item, &vault_key);
                items.push(item);
            }
        }
    } else {
        let mut stmt = conn.prepare("SELECT id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at, deleted_at FROM vault_items WHERE deleted_at IS NULL ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| Ok(row_to_vault_item(row)))
            .map_err(|e| e.to_string())?;
        for row in rows {
            if let Ok(mut item) = row {
                decrypt_vault_item(&mut item, &vault_key);
                items.push(item);
            }
        }
    }

    Ok(items)
}

#[tauri::command]
pub fn vault_get_item(id: String, db_state: State<'_, DbState>) -> Result<VaultItem, String> {
    let vault_key = get_vault_key(&db_state)?;
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at, deleted_at FROM vault_items WHERE id = ?")
        .map_err(|e| e.to_string())?;

    let mut item = stmt
        .query_row(rusqlite::params![id], |row| Ok(row_to_vault_item(row)))
        .map_err(|e| e.to_string())?;

    decrypt_vault_item(&mut item, &vault_key);
    Ok(item)
}

#[tauri::command]
pub fn vault_upsert_item(item: VaultItem, db_state: State<'_, DbState>) -> Result<(), String> {
    let vault_key = get_vault_key(&db_state)?;
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let enc_label = crate::crypto::encrypt_content(&vault_key, &item.label)?;
    let enc_user = item
        .username
        .as_ref()
        .map(|s| crate::crypto::encrypt_content(&vault_key, s))
        .transpose()?;
    let enc_email = item
        .email
        .as_ref()
        .map(|s| crate::crypto::encrypt_content(&vault_key, s))
        .transpose()?;
    let enc_pass = item
        .password
        .as_ref()
        .map(|s| crate::crypto::encrypt_content(&vault_key, s))
        .transpose()?;
    let enc_url = item
        .url
        .as_ref()
        .map(|s| crate::crypto::encrypt_content(&vault_key, s))
        .transpose()?;
    let enc_notes = item
        .notes
        .as_ref()
        .map(|s| crate::crypto::encrypt_content(&vault_key, s))
        .transpose()?;
    let enc_custom = item
        .custom_fields
        .as_ref()
        .map(|s| crate::crypto::encrypt_content(&vault_key, s))
        .transpose()?;

    // Checar se a senha mudou para salvar no historico
    if let Some(ref new_pass_enc) = enc_pass {
        let old_pass_enc: Result<Option<String>, _> = conn.query_row(
            "SELECT password FROM vault_items WHERE id = ?",
            rusqlite::params![item.id],
            |row| row.get(0),
        );

        if let Ok(Some(old)) = old_pass_enc {
            if old != *new_pass_enc && !old.is_empty() {
                let hist_id = uuid::Uuid::new_v4().to_string();
                let now = chrono::Utc::now().to_rfc3339();
                let _ = conn.execute(
                    "INSERT INTO vault_password_history (id, item_id, password, changed_at) VALUES (?, ?, ?, ?)",
                    rusqlite::params![hist_id, item.id, old, now],
                );
            }
        }
    }

    conn.execute(
        "INSERT OR REPLACE INTO vault_items (id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![item.id, item.group_id, enc_label, enc_user, enc_email, enc_pass, enc_url, enc_notes, enc_custom, item.is_favorite, item.password_changed_at, item.password_strength, item.created_at, item.updated_at, item.deleted_at],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn vault_delete_item(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE vault_items SET deleted_at = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![now, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn vault_search_items(
    query: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<VaultItem>, String> {
    let items = vault_get_items(None, db_state)?;
    let q = query.to_lowercase();

    let filtered = items
        .into_iter()
        .filter(|i| {
            i.label.to_lowercase().contains(&q)
                || i.username
                    .as_ref()
                    .map(|s| s.to_lowercase().contains(&q))
                    .unwrap_or(false)
                || i.email
                    .as_ref()
                    .map(|s| s.to_lowercase().contains(&q))
                    .unwrap_or(false)
                || i.url
                    .as_ref()
                    .map(|s| s.to_lowercase().contains(&q))
                    .unwrap_or(false)
                || i.notes
                    .as_ref()
                    .map(|s| s.to_lowercase().contains(&q))
                    .unwrap_or(false)
        })
        .collect();

    Ok(filtered)
}

// === HISTORICO ===

#[tauri::command]
pub fn vault_get_password_history(
    item_id: String,
    db_state: State<'_, DbState>,
) -> Result<Vec<VaultPasswordHistoryEntry>, String> {
    let vault_key = get_vault_key(&db_state)?;
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare("SELECT id, item_id, password, changed_at, deleted_at FROM vault_password_history WHERE item_id = ? AND deleted_at IS NULL ORDER BY changed_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params![item_id], |row| {
            Ok(VaultPasswordHistoryEntry {
                id: row.get(0)?,
                item_id: row.get(1)?,
                password: row.get(2)?,
                changed_at: row.get(3)?,
                deleted_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut history = Vec::new();
    for row in rows {
        if let Ok(mut entry) = row {
            if let Ok(dec_pass) = crate::crypto::decrypt_content(&vault_key, &entry.password) {
                entry.password = dec_pass;
            }
            history.push(entry);
        }
    }

    Ok(history)
}

// === UTILITARIOS ===

#[tauri::command]
pub fn vault_generate_password(options: PasswordGenOptions) -> Result<String, String> {
    let mut chars = String::new();
    if options.uppercase {
        chars.push_str("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    if options.lowercase {
        chars.push_str("abcdefghijklmnopqrstuvwxyz");
    }
    if options.numbers {
        chars.push_str("0123456789");
    }
    if options.symbols {
        chars.push_str("!@#$%^&*()_+-=[]{}|;:,.<>?");
    }

    if chars.is_empty() {
        return Err("Pelo menos uma opção deve ser selecionada".into());
    }

    let mut rng = rand::thread_rng();
    let chars_bytes = chars.as_bytes();
    let mut password = String::new();

    for _ in 0..options.length {
        let idx = rng.gen_range(0..chars_bytes.len());
        password.push(chars_bytes[idx] as char);
    }

    Ok(password)
}

#[tauri::command]
pub async fn vault_check_breach(password: String) -> Result<BreachCheckResult, String> {
    let mut hasher = Sha1::new();
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    let hash_hex = hex::encode(result).to_uppercase();

    let prefix = &hash_hex[0..5];
    let suffix = &hash_hex[5..];

    let url = format!("https://api.pwnedpasswords.com/range/{}", prefix);

    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;

    let text = response.text().await.map_err(|e| e.to_string())?;

    let mut count = 0;
    for line in text.lines() {
        if let Some((hash_suffix, count_str)) = line.split_once(':') {
            if hash_suffix == suffix {
                count = count_str.trim().parse::<u64>().unwrap_or(0);
                break;
            }
        }
    }

    Ok(BreachCheckResult {
        breached: count > 0,
        count,
    })
}

#[tauri::command]
pub fn vault_check_strength(password: String) -> Result<i32, String> {
    let len = password.len();
    let has_upper = password.chars().any(|c| c.is_uppercase());
    let has_lower = password.chars().any(|c| c.is_lowercase());
    let has_num = password.chars().any(|c| c.is_numeric());
    let has_sym = password.chars().any(|c| !c.is_alphanumeric());

    let mut score = 0;
    if len > 8 {
        score += 1;
    }
    if len >= 12 {
        score += 1;
    }
    if has_upper && has_lower {
        score += 1;
    }
    if has_num && has_sym {
        score += 1;
    }

    if len >= 16 && (has_upper || has_lower) && (has_num || has_sym) {
        score = std::cmp::max(score, 4);
    }

    // Limitar score a 4
    if score > 4 {
        score = 4;
    }

    // Penalidades
    if password.to_lowercase() == "password"
        || password == "123456"
        || password == "12345678"
        || password.to_lowercase() == "admin"
    {
        score = 0;
    }

    Ok(score)
}

// Helpers

fn row_to_vault_item(row: &rusqlite::Row) -> VaultItem {
    VaultItem {
        id: row.get(0).unwrap_or_default(),
        group_id: row.get(1).unwrap_or_default(),
        label: row.get(2).unwrap_or_default(),
        username: row.get(3).unwrap_or_default(),
        email: row.get(4).unwrap_or_default(),
        password: row.get(5).unwrap_or_default(),
        url: row.get(6).unwrap_or_default(),
        notes: row.get(7).unwrap_or_default(),
        custom_fields: row.get(8).unwrap_or_default(),
        is_favorite: row.get(9).unwrap_or(0),
        password_changed_at: row.get(10).unwrap_or_default(),
        password_strength: row.get(11).unwrap_or(0),
        created_at: row.get(12).unwrap_or_default(),
        updated_at: row.get(13).unwrap_or_default(),
        deleted_at: row.get(14).unwrap_or_default(),
    }
}

fn decrypt_vault_item(item: &mut VaultItem, key: &str) {
    if let Ok(dec) = crate::crypto::decrypt_content(key, &item.label) {
        item.label = dec;
    }
    if let Some(ref val) = item.username {
        if let Ok(dec) = crate::crypto::decrypt_content(key, val) {
            item.username = Some(dec);
        }
    }
    if let Some(ref val) = item.email {
        if let Ok(dec) = crate::crypto::decrypt_content(key, val) {
            item.email = Some(dec);
        }
    }
    if let Some(ref val) = item.password {
        if let Ok(dec) = crate::crypto::decrypt_content(key, val) {
            item.password = Some(dec);
        }
    }
    if let Some(ref val) = item.url {
        if let Ok(dec) = crate::crypto::decrypt_content(key, val) {
            item.url = Some(dec);
        }
    }
    if let Some(ref val) = item.notes {
        if let Ok(dec) = crate::crypto::decrypt_content(key, val) {
            item.notes = Some(dec);
        }
    }
    if let Some(ref val) = item.custom_fields {
        if let Ok(dec) = crate::crypto::decrypt_content(key, val) {
            item.custom_fields = Some(dec);
        }
    }
}
