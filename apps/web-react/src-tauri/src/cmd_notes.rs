use crate::db::{run_blocking, DbState};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use synapse_core::domain::notes::models::{PageMetaRecord, PageRecord};
use synapse_core::domain::notes::pages;
use synapse_core::domain::notes::NotesRepository;
use tauri::{AppHandle, State};

fn get_page_history_cache() -> &'static Mutex<HashMap<String, i64>> {
    static CACHE: OnceLock<Mutex<HashMap<String, i64>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn should_record_page_history(conn: &rusqlite::Connection, page_id: &str) -> bool {
    let now_epoch = chrono::Utc::now().timestamp();
    let mut cache = match get_page_history_cache().lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    let is_cooldown_active = cache
        .get(page_id)
        .map(|&last_time| now_epoch - last_time < 60)
        .unwrap_or(false);

    if is_cooldown_active {
        return false;
    }

    let should_db: bool = conn
        .query_row(
            "SELECT (strftime('%s', 'now') - strftime('%s', MAX(created_at))) > 60 FROM page_history WHERE page_id = ?",
            params![page_id],
            |row| row.get::<_, Option<bool>>(0),
        )
        .unwrap_or(None)
        .unwrap_or(true);

    if should_db {
        cache.insert(page_id.to_string(), now_epoch);
    }
    should_db
}

#[derive(Serialize, Deserialize)]
pub struct PageMeta {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub icon: String,
    pub sort_order: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crdt_state: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
    pub is_locked: i32,
    pub is_pinned: i32,
    pub pinned_order: f64,
    pub cover_image: Option<String>,
    pub description: Option<String>,
}

fn map_record_to_meta(r: PageRecord) -> PageMeta {
    PageMeta {
        id: r.id,
        parent_id: r.parent_id,
        title: r.title,
        icon: r.icon,
        sort_order: r.sort_order as f64,
        crdt_state: None,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at,
        is_locked: r.is_locked,
        is_pinned: r.is_pinned,
        pinned_order: r.pinned_order,
        cover_image: r.cover_image,
        description: r.description,
    }
}

fn map_meta_record(r: PageMetaRecord) -> PageMeta {
    PageMeta {
        id: r.id,
        parent_id: r.parent_id,
        title: r.title,
        icon: r.icon,
        sort_order: r.sort_order,
        crdt_state: None,
        created_at: r.created_at,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at,
        is_locked: r.is_locked,
        is_pinned: r.is_pinned,
        pinned_order: r.pinned_order,
        cover_image: r.cover_image,
        description: r.description,
    }
}

#[derive(Serialize, Deserialize)]
pub struct PageContent {
    pub content: String,
    pub encrypted_content: Option<String>,
    pub crdt_state: Option<String>,
    pub updated_at: Option<String>,
}

#[tauri::command]
pub async fn notes_get_all_pages(db_state: State<'_, DbState>) -> Result<Vec<PageMeta>, String> {
    db_state
        .read(|conn| {
            let records = NotesRepository::get_page_metas_conn(conn).map_err(|e| e.to_string())?;
            Ok(records.into_iter().map(map_meta_record).collect())
        })
        .await
}

#[tauri::command]
pub async fn notes_get_page_content(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<PageContent, String> {
    let notes_key = db_state.clone_keys()?.and_then(|keys| keys.notes);
    let state = db_state.inner().clone();

    run_blocking(move || {
        let page_opt = {
            let reader = state.acquire_reader()?;
            NotesRepository::get_page_conn(&reader, &id).map_err(|e| e.to_string())?
        };

        let mut content = match page_opt {
            Some(p) => PageContent {
                content: p.content,
                encrypted_content: p.encrypted_content,
                crdt_state: p.crdt_state,
                updated_at: p.updated_at,
            },
            None => return Err("Page not found".to_string()),
        };

        // Decrypt on-the-fly after releasing the pooled reader connection
        if let (Some(enc), Some(key)) = (&content.encrypted_content, &notes_key) {
            if let Ok(decrypted) = crate::crypto::decrypt_content(key, enc) {
                content.content = match &content.crdt_state {
                    Some(crdt) if !crdt.is_empty() => {
                        synapse_core::domain::notes::hydrate_html_from_crdt(&decrypted, crdt)
                    }
                    _ => decrypted,
                };
            }
        }

        Ok(content)
    })
    .await
}

#[derive(Deserialize, Default)]
#[serde(default)]
pub struct CreatePagePayload {
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    pub title: Option<String>,
    pub icon: Option<String>,
}

#[tauri::command]
pub async fn notes_create_page(
    page: CreatePagePayload,
    db_state: State<'_, DbState>,
) -> Result<PageMeta, String> {
    db_state
        .write(move |conn| {
            let title = page.title.unwrap_or_else(|| "Nova Página".into());
            let icon = page.icon.unwrap_or_else(|| "📄".into());

            let record = pages::create_page(conn, page.parent_id.as_deref(), &title, Some(&icon))
                .map_err(|e| e.to_string())?;

            Ok(map_record_to_meta(record))
        })
        .await
}

fn deserialize_optional_nullable<'de, D>(
    deserializer: D,
) -> Result<Option<Option<String>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(Some(Option::<String>::deserialize(deserializer)?))
}

#[derive(Deserialize, Default)]
#[serde(default)]
pub struct UpdatePagePayload {
    pub id: String,
    pub title: Option<String>,
    pub icon: Option<String>,
    pub content: Option<String>,
    pub encrypted_content: Option<String>,
    pub crdt_state: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_nullable")]
    pub parent_id: Option<Option<String>>,
    pub is_pinned: Option<i32>,
    pub pinned_order: Option<f64>,
    #[serde(default, deserialize_with = "deserialize_optional_nullable")]
    pub cover_image: Option<Option<String>>,
    pub description: Option<String>,
    pub is_locked: Option<i32>,
    #[serde(default, deserialize_with = "deserialize_optional_nullable")]
    pub password_salt: Option<Option<String>>,
}

#[derive(Deserialize)]
pub struct PageOrderUpdate {
    pub id: String,
    pub sort_order: f64,
}

#[tauri::command]
pub async fn notes_update_page(
    page: UpdatePagePayload,
    _app_handle: AppHandle,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let notes_key = if page.content.is_some() {
        db_state.clone_keys()?.and_then(|keys| keys.notes)
    } else {
        None
    };
    let state = db_state.inner().clone();

    run_blocking(move || -> Result<i32, String> {
        // Encrypt page content before acquiring the SQLite writer connection lock.
        let pre_encrypted = match (&page.content, &notes_key) {
            (Some(c), Some(key)) => crate::crypto::encrypt_content(key, c).ok(),
            _ => None,
        };

        let guard = state.lock_conn()?;
        let conn = guard.as_ref().ok_or("Banco não inicializado")?;

        let mut query = String::from("UPDATE pages SET");
        let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();
        let mut has_updates = false;

        if let Some(t) = page.title {
            query.push_str(" title = ?");
            params_vec.push(t.into());
            has_updates = true;
        }
        if let Some(i) = page.icon {
            if has_updates {
                query.push_str(",");
            }
            query.push_str(" icon = ?");
            params_vec.push(i.into());
            has_updates = true;
        }
        if let Some(c) = page.content {
            if has_updates {
                query.push_str(",");
            }
            if let Some(enc) = pre_encrypted {
                query.push_str(" content = '', encrypted_content = ?");
                params_vec.push(enc.clone().into());

                if should_record_page_history(conn, &page.id) {
                    let _ = NotesRepository::record_page_history_conn(conn, &page.id, "", Some(&enc));
                }
            } else {
                query.push_str(" content = ?, encrypted_content = NULL");
                params_vec.push(c.clone().into());

                if should_record_page_history(conn, &page.id) {
                    let _ = NotesRepository::record_page_history_conn(conn, &page.id, &c, None);
                }
            }
            has_updates = true;
        }
        if let Some(crdt) = page.crdt_state {
            if has_updates {
                query.push_str(",");
            }
            query.push_str(" crdt_state = ?");
            params_vec.push(crdt.into());
            has_updates = true;
        }
        if let Some(pid_opt) = page.parent_id {
            if has_updates {
                query.push_str(",");
            }
            query.push_str(" parent_id = ?");
            match pid_opt {
                Some(s) if !s.trim().is_empty() => params_vec.push(s.into()),
                _ => params_vec.push(rusqlite::types::Value::Null),
            }
            has_updates = true;
        }
        if let Some(pinned) = page.is_pinned {
            if has_updates {
                query.push_str(",");
            }
            query.push_str(" is_pinned = ?");
            params_vec.push(pinned.into());
            has_updates = true;
        }
        if let Some(order) = page.pinned_order {
            if has_updates {
                query.push_str(",");
            }
            query.push_str(" pinned_order = ?");
            params_vec.push(order.into());
            has_updates = true;
        }
        if let Some(cover_opt) = page.cover_image {
            if has_updates {
                query.push_str(",");
            }
            query.push_str(" cover_image = ?");
            match cover_opt {
                Some(s) if !s.is_empty() => params_vec.push(s.into()),
                _ => params_vec.push(rusqlite::types::Value::Null),
            }
            has_updates = true;
        }
        if let Some(desc) = page.description {
            if has_updates {
                query.push_str(",");
            }
            query.push_str(" description = ?");
            params_vec.push(desc.into());
            has_updates = true;
        }
        if let Some(locked) = page.is_locked {
            if has_updates {
                query.push_str(",");
            }
            query.push_str(" is_locked = ?");
            params_vec.push(locked.into());
            has_updates = true;
        }
        if let Some(salt_opt) = page.password_salt {
            if has_updates {
                query.push_str(",");
            }
            query.push_str(" password_salt = ?");
            match salt_opt {
                Some(s) if !s.is_empty() => params_vec.push(s.into()),
                _ => params_vec.push(rusqlite::types::Value::Null),
            }
            has_updates = true;
        }
        if let Some(enc_explicit) = page.encrypted_content {
            if has_updates {
                query.push_str(",");
            }
            query.push_str(" encrypted_content = ?");
            if enc_explicit.is_empty() {
                params_vec.push(rusqlite::types::Value::Null);
            } else {
                params_vec.push(enc_explicit.into());
            }
            has_updates = true;
        }

        if has_updates {
            let now = chrono::Utc::now().to_rfc3339();
            query.push_str(", updated_at = ?");
            params_vec.push(now.into());
        } else {
            return Ok(0);
        }

        query.push_str(" WHERE id = ?");
        params_vec.push(page.id.into());

        let count = conn
            .execute(&query, rusqlite::params_from_iter(params_vec))
            .map_err(|e| e.to_string())?;

        Ok(count as i32)
    })
    .await
}

#[tauri::command]
pub async fn notes_delete_page(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    db_state
        .write(move |conn| pages::soft_delete_page_subtree(conn, &id).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn notes_delete_pages(
    ids: Vec<String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    if ids.is_empty() {
        return Ok(true);
    }
    db_state
        .write(move |conn| {
            NotesRepository::soft_delete_pages_batch_conn(conn, &ids).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn notes_get_deleted_pages(
    db_state: State<'_, DbState>,
) -> Result<Vec<PageMeta>, String> {
    db_state
        .read(|conn| {
            let pages =
                NotesRepository::get_deleted_page_metas_conn(conn).map_err(|e| e.to_string())?;
            Ok(pages.into_iter().map(map_meta_record).collect())
        })
        .await
}

#[tauri::command]
pub async fn notes_restore_page(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    db_state
        .write(move |conn| pages::restore_page(conn, &id).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn notes_reorder_pages(
    updates: Vec<PageOrderUpdate>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    if updates.is_empty() {
        return Ok(true);
    }
    db_state
        .write(move |conn| {
            let pairs: Vec<(String, f64)> =
                updates.into_iter().map(|u| (u.id, u.sort_order)).collect();
            NotesRepository::reorder_pages_batch_conn(conn, &pairs).map_err(|e| e.to_string())
        })
        .await
}
