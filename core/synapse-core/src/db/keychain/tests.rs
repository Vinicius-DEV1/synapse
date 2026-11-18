use super::*;
use crate::crypto::{encrypt_module_key_with_key, generate_module_key};

fn setup_keychain(connection: &Connection, password: &str) -> HashMap<String, String> {
    connection
        .execute(
            "CREATE TABLE keychain (id TEXT PRIMARY KEY, auth_hash TEXT NOT NULL, library_key_enc TEXT, finance_key_enc TEXT, notes_key_enc TEXT, culture_key_enc TEXT, anki_key_enc TEXT, focus_key_enc TEXT, files_key_enc TEXT, vault_key_enc TEXT, calendar_key_enc TEXT, practice_key_enc TEXT, core_key_enc TEXT)",
            [],
        )
        .expect("keychain schema");
    let keys = MODULES
        .iter()
        .map(|(module, _)| ((*module).to_owned(), generate_module_key()))
        .collect::<HashMap<_, _>>();
    let wrapping_key = Zeroizing::new(derive_key_from_password(password));
    let envelopes = MODULES
        .iter()
        .map(|(module, _)| {
            encrypt_module_key_with_key(keys.get(*module).expect("module key"), &wrapping_key)
                .expect("key envelope")
        })
        .collect::<Vec<_>>();
    connection
        .execute(
            "INSERT INTO keychain VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                "keychain-id",
                hash_auth_password_v2(password),
                envelopes[0],
                envelopes[1],
                envelopes[2],
                envelopes[3],
                envelopes[4],
                envelopes[5],
                envelopes[6],
                envelopes[7],
                envelopes[8],
                envelopes[9],
                envelopes[10],
            ],
        )
        .expect("keychain row");
    keys
}

#[test]
fn account_migration_rewraps_keys_without_changing_module_keys() {
    let connection = Connection::open_in_memory().expect("database");
    let keys = setup_keychain(&connection, "previous-password");

    rewrap_keychain_for_account(
        &connection,
        "previous-password",
        "cloud-account-password",
        keys.clone(),
    )
    .expect("keychain migration");

    let record = read_record(&connection).expect("updated keychain");
    let new_key = Zeroizing::new(derive_key_from_password("cloud-account-password"));
    let recovered = recover_keys(&record, &new_key).expect("new password opens keychain");
    ensure_same_module_keys(&recovered.0, &keys).expect("module keys unchanged");
    let old_key = Zeroizing::new(derive_key_from_password("previous-password"));
    assert!(recover_keys(&record, &old_key).is_err());
}

#[test]
fn mismatched_cloud_keys_leave_the_keychain_unchanged() {
    let connection = Connection::open_in_memory().expect("database");
    let keys = setup_keychain(&connection, "previous-password");
    let original_hash: String = connection
        .query_row("SELECT auth_hash FROM keychain", [], |row| row.get(0))
        .expect("original verifier");
    let mut different_keys = keys.clone();
    different_keys.insert("notes".into(), generate_module_key());

    assert!(rewrap_keychain_for_account(
        &connection,
        "previous-password",
        "cloud-account-password",
        different_keys,
    )
    .is_err());

    let stored_hash: String = connection
        .query_row("SELECT auth_hash FROM keychain", [], |row| row.get(0))
        .expect("stored verifier");
    assert_eq!(stored_hash, original_hash);
}

#[test]
fn failed_old_credential_does_not_modify_keychain() {
    let connection = Connection::open_in_memory().expect("database");
    let keys = setup_keychain(&connection, "previous-password");
    let original_hash: String = connection
        .query_row("SELECT auth_hash FROM keychain", [], |row| row.get(0))
        .expect("original verifier");

    assert!(rewrap_keychain_for_account(
        &connection,
        "wrong-previous-password",
        "cloud-account-password",
        keys,
    )
    .is_err());

    let stored_hash: String = connection
        .query_row("SELECT auth_hash FROM keychain", [], |row| row.get(0))
        .expect("stored verifier");
    assert_eq!(stored_hash, original_hash);
}
