use crate::crypto::{
    decrypt_module_key_with_key, derive_key_from_password, encrypt_module_key_with_key,
    hash_auth_password_v2,
};
use rusqlite::{params, Connection};
use std::collections::HashMap;
use zeroize::{Zeroize, Zeroizing};

const MODULES: [(&str, &str); 11] = [
    ("library", "library_key_enc"),
    ("finance", "finance_key_enc"),
    ("notes", "notes_key_enc"),
    ("culture", "culture_key_enc"),
    ("anki", "anki_key_enc"),
    ("focus", "focus_key_enc"),
    ("files", "files_key_enc"),
    ("vault", "vault_key_enc"),
    ("calendar", "calendar_key_enc"),
    ("practice", "practice_key_enc"),
    ("core", "core_key_enc"),
];

struct KeychainRecord {
    id: String,
    envelopes: Vec<Option<String>>,
}

struct RecoveredKeys(HashMap<String, String>);

impl Drop for RecoveredKeys {
    fn drop(&mut self) {
        for key in self.0.values_mut() {
            key.zeroize();
        }
    }
}

pub fn replace_keychain_module_keys(
    connection: &Connection,
    account_password: &str,
    replacement_keys: HashMap<String, String>,
) -> Result<(), String> {
    let account_password = Zeroizing::new(account_password.to_owned());
    let replacement_keys = normalize_keys(replacement_keys)?;
    let account_key = Zeroizing::new(derive_key_from_password(account_password.as_str()));
    let wrapped = wrap_keys(&replacement_keys.0, &account_key)?;
    let verifier = hash_auth_password_v2(account_password.as_str());

    with_immediate_transaction(connection, || {
        let record = read_record(connection)?;
        let existing = recover_keys(&record, &account_key)?;
        ensure_same_module_keys(&existing.0, &replacement_keys.0)?;
        write_record(connection, &record.id, &verifier, &wrapped)
    })
}

pub fn rewrap_keychain_for_account(
    connection: &Connection,
    previous_password: &str,
    account_password: &str,
    replacement_keys: HashMap<String, String>,
) -> Result<(), String> {
    let previous_password = Zeroizing::new(previous_password.to_owned());
    let account_password = Zeroizing::new(account_password.to_owned());
    let replacement_keys = normalize_keys(replacement_keys)?;
    let previous_key = Zeroizing::new(derive_key_from_password(previous_password.as_str()));
    let account_key = Zeroizing::new(derive_key_from_password(account_password.as_str()));
    let wrapped = wrap_keys(&replacement_keys.0, &account_key)?;
    let verifier = hash_auth_password_v2(account_password.as_str());

    with_immediate_transaction(connection, || {
        let record = read_record(connection)?;
        let existing = recover_keys(&record, &previous_key)?;
        ensure_same_module_keys(&existing.0, &replacement_keys.0)?;
        write_record(connection, &record.id, &verifier, &wrapped)
    })
}

fn normalize_keys(keys: HashMap<String, String>) -> Result<RecoveredKeys, String> {
    let mut keys = RecoveredKeys(keys);
    keys.0
        .retain(|name, _| MODULES.iter().any(|(module, _)| module == name));
    for (module, _) in MODULES {
        let key = keys
            .0
            .get_mut(module)
            .ok_or_else(|| format!("The account key set is missing the {module} module key."))?;
        if key.len() != 64 || !key.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            return Err(format!("The {module} module key has an invalid format."));
        }
        key.make_ascii_lowercase();
    }
    Ok(keys)
}

fn wrap_keys(
    keys: &HashMap<String, String>,
    wrapping_key: &[u8; 32],
) -> Result<Vec<String>, String> {
    MODULES
        .iter()
        .map(|(module, _)| {
            let key = keys.get(*module).ok_or_else(|| {
                format!("The account key set is missing the {module} module key.")
            })?;
            encrypt_module_key_with_key(key, wrapping_key)
        })
        .collect()
}

fn read_record(connection: &Connection) -> Result<KeychainRecord, String> {
    connection
        .query_row(
            "SELECT id, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc, focus_key_enc, files_key_enc, vault_key_enc, calendar_key_enc, practice_key_enc, core_key_enc FROM keychain LIMIT 1",
            [],
            |row| {
                let mut envelopes = Vec::with_capacity(MODULES.len());
                for column_index in 1..=MODULES.len() {
                    envelopes.push(row.get(column_index)?);
                }
                Ok(KeychainRecord {
                    id: row.get(0)?,
                    envelopes,
                })
            },
        )
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => "The local keychain is not configured.".into(),
            _ => format!("Could not read the local keychain: {error}"),
        })
}

fn recover_keys(record: &KeychainRecord, wrapping_key: &[u8; 32]) -> Result<RecoveredKeys, String> {
    let mut keys = HashMap::with_capacity(MODULES.len());
    for ((module, _), envelope) in MODULES.iter().zip(record.envelopes.iter()) {
        if let Some(envelope) = envelope.as_ref().filter(|value| !value.is_empty()) {
            let key = decrypt_module_key_with_key(envelope, wrapping_key).map_err(|_| {
                format!("The existing {module} key envelope could not be verified.")
            })?;
            keys.insert((*module).to_owned(), key);
        }
    }
    if keys.is_empty() {
        return Err("The local keychain has no verifiable module key envelopes.".into());
    }

    let fallback = keys
        .get("notes")
        .or_else(|| keys.values().next())
        .cloned()
        .ok_or_else(|| "The local keychain has no recoverable module keys.".to_owned())?;
    for (module, _) in MODULES {
        keys.entry(module.to_owned())
            .or_insert_with(|| fallback.clone());
    }
    Ok(RecoveredKeys(keys))
}

fn ensure_same_module_keys(
    current: &HashMap<String, String>,
    replacement: &HashMap<String, String>,
) -> Result<(), String> {
    for (module, _) in MODULES {
        if current.get(module) != replacement.get(module) {
            return Err(format!(
                "The verified local and cloud {module} keys disagree; the local keychain was not changed."
            ));
        }
    }
    Ok(())
}

fn write_record(
    connection: &Connection,
    id: &str,
    verifier: &str,
    wrapped: &[String],
) -> Result<(), String> {
    let updated = connection
        .execute(
            "UPDATE keychain SET auth_hash = ?1, library_key_enc = ?2, finance_key_enc = ?3, notes_key_enc = ?4, culture_key_enc = ?5, anki_key_enc = ?6, focus_key_enc = ?7, files_key_enc = ?8, vault_key_enc = ?9, calendar_key_enc = ?10, practice_key_enc = ?11, core_key_enc = ?12 WHERE id = ?13",
            params![
                verifier,
                wrapped[0], wrapped[1], wrapped[2], wrapped[3], wrapped[4],
                wrapped[5], wrapped[6], wrapped[7], wrapped[8], wrapped[9], wrapped[10], id,
            ],
        )
        .map_err(|error| format!("Could not update the local keychain: {error}"))?;
    if updated != 1 {
        return Err(
            "The local keychain changed during migration; no credentials were changed.".into(),
        );
    }
    Ok(())
}

fn with_immediate_transaction<T>(
    connection: &Connection,
    action: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    connection
        .execute_batch("BEGIN IMMEDIATE")
        .map_err(|error| format!("Could not lock the local keychain for migration: {error}"))?;
    match action() {
        Ok(value) => {
            connection
                .execute_batch("COMMIT")
                .map_err(|error| format!("Could not commit the local key migration: {error}"))?;
            Ok(value)
        }
        Err(error) => {
            connection
                .execute_batch("ROLLBACK")
                .map_err(|rollback_error| {
                    format!("{error} Rollback also failed: {rollback_error}")
                })?;
            Err(error)
        }
    }
}

#[cfg(test)]
mod tests;
