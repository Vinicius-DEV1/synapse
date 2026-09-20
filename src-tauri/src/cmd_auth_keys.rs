use crate::crypto::decrypt_module_key_with_key;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct AuthStatus {
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct UnlockedKeys {
    pub library: Option<String>,
    pub finance: Option<String>,
    pub notes: Option<String>,
    pub culture: Option<String>,
    pub anki: Option<String>,
    pub focus: Option<String>,
    pub files: Option<String>,
    pub vault: Option<String>,
    pub calendar: Option<String>,
    pub practice: Option<String>,
    pub core: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct LoginResponse {
    pub success: bool,
    pub error: Option<String>,
    pub modules: Vec<String>,
    pub keys: Option<UnlockedKeys>,
}

pub struct KeychainRow {
    pub auth_hash: String,
    pub library_enc: Option<String>,
    pub finance_enc: Option<String>,
    pub notes_enc: Option<String>,
    pub culture_enc: Option<String>,
    pub anki_enc: Option<String>,
    pub focus_enc: Option<String>,
    pub files_enc: Option<String>,
    pub vault_enc: Option<String>,
    pub calendar_enc: Option<String>,
    pub practice_enc: Option<String>,
    pub core_enc: Option<String>,
}

pub fn resolve_unlocked_keys(
    row: &KeychainRow,
    modern_key: &[u8; 32],
) -> (UnlockedKeys, Vec<String>) {
    let try_decrypt = |enc: &Option<String>| -> Option<String> {
        if let Some(e) = enc {
            if let Ok(dec) = decrypt_module_key_with_key(e, modern_key) {
                return Some(dec);
            }
        }
        None
    };

    let library = try_decrypt(&row.library_enc);
    let finance = try_decrypt(&row.finance_enc);
    let notes = try_decrypt(&row.notes_enc);

    let calendar = try_decrypt(&row.calendar_enc).or_else(|| notes.clone());
    let practice = try_decrypt(&row.practice_enc).or_else(|| notes.clone());
    let core = try_decrypt(&row.core_enc).or_else(|| notes.clone());
    let culture = try_decrypt(&row.culture_enc).or_else(|| notes.clone());
    let anki = try_decrypt(&row.anki_enc).or_else(|| notes.clone());
    let focus = try_decrypt(&row.focus_enc).or_else(|| notes.clone());
    let files = try_decrypt(&row.files_enc).or_else(|| notes.clone());
    let vault = try_decrypt(&row.vault_enc).or_else(|| notes.clone());

    let mut modules = Vec::new();
    if library.is_some() {
        modules.push("library".into());
    }
    if finance.is_some() {
        modules.push("finance".into());
    }
    if notes.is_some() {
        modules.push("notes".into());
    }
    if culture.is_some() {
        modules.push("culture".into());
    }
    if anki.is_some() {
        modules.push("anki".into());
    }
    if focus.is_some() {
        modules.push("focus".into());
    }
    if files.is_some() {
        modules.push("files".into());
    }
    if vault.is_some() {
        modules.push("vault".into());
    }
    if calendar.is_some() {
        modules.push("calendar".into());
    }
    if practice.is_some() {
        modules.push("practice".into());
    }
    if core.is_some() {
        modules.push("core".into());
    }

    let keys = UnlockedKeys {
        library,
        finance,
        notes,
        culture,
        anki,
        focus,
        files,
        vault,
        calendar,
        practice,
        core,
    };

    (keys, modules)
}
