use super::*;
use super::*;
use synapse_core::Database;
use tempfile::NamedTempFile;

#[test]
fn test_canonical_database_initialization() {
    let temp_file = NamedTempFile::new().unwrap();
    let db = Database::open(temp_file.path()).expect("Failed to initialize core database");
    let conn = db.lock().expect("Failed to acquire core database lock");
    for table in ["pages", "keychain", "habits"] {
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
                [table],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1, "Canonical table {table} should exist");
    }

    let res = conn
        .query_row("PRAGMA journal_mode", [], |row| row.get::<_, String>(0))
        .unwrap();
    assert_eq!(res.to_lowercase(), "wal");
}

#[test]
fn test_uniffi_fsrs_and_crypto() {
    let fsrs = SynapseFsrs::new();
    let result = fsrs.review(0.0, 0.0, 0, 3, 0).unwrap(); // Rating 3 = Good on New card
    assert!(result.stability > 0.0);
    assert!(result.scheduled_days > 0);

    assert!(fsrs.review(0.0, 0.0, 0, 0, 0).is_err());
    assert!(fsrs.review(0.0, 0.0, 4, 3, 0).is_err());
    assert!(fsrs.review(0.0, 0.0, 0, 3, -1).is_err());
    assert!(fsrs.review(f64::NAN, 0.0, 0, 3, 0).is_err());

    let pass = "minha_senha_super_secreta_123".to_string();
    let master_key_hex = derive_master_key(pass.clone());
    assert_eq!(master_key_hex.len(), 64);

    let mod_key = "a1".repeat(32);
    let enc = encrypt_module_key(mod_key.clone(), pass.clone()).unwrap();
    let dec = decrypt_module_key(enc, pass).unwrap();
    assert_eq!(dec, mod_key);
}

#[test]
fn test_uniffi_finance_store_persists_crud_and_loan_payments() {
    let temp_file = NamedTempFile::new().unwrap();
    let store =
        finance::SynapseFinanceStore::open(temp_file.path().to_string_lossy().to_string()).unwrap();
    let account = store.get_accounts().unwrap().remove(0);
    let loan = store
        .create_transaction(finance::FinanceTransaction {
            id: String::new(),
            description: "Bridge loan".to_owned(),
            amount: 20.0,
            expected_amount: Some(25.0),
            type_: "loan_made".to_owned(),
            category: "Personal".to_owned(),
            date: "2026-11-20".to_owned(),
            status: Some("in_progress".to_owned()),
            is_paid: Some(0),
            paid_amount: Some(0.0),
            is_recurring: Some(0),
            recurrence_period: None,
            due_date: None,
            account_id: Some(account.id.clone()),
            destination_account_id: None,
            linked_loan_id: None,
            person: Some("Morgan".to_owned()),
            created_at: None,
            updated_at: None,
        })
        .unwrap();
    let payment = store
        .record_loan_payment(loan.id.clone(), Some(10.0), account.id.clone(), None)
        .unwrap();
    assert_eq!(payment.linked_loan_id.as_deref(), Some(loan.id.as_str()));
    let saved_loan = store
        .get_transactions(None, None)
        .unwrap()
        .into_iter()
        .find(|item| item.id == loan.id)
        .unwrap();
    assert_eq!(saved_loan.paid_amount, Some(10.0));

    let wish = store
        .create_wishlist_item(finance::FinanceWishlistItem {
            id: String::new(),
            title: "Tablet".to_owned(),
            price: 300.0,
            priority: "medium".to_owned(),
            category: Some("Electronics".to_owned()),
            expected_date: None,
            description: None,
            link: None,
            created_at: None,
            updated_at: None,
        })
        .unwrap();
    store
        .acquire_wishlist_item(
            wish.id.clone(),
            "Tablet".to_owned(),
            280.0,
            account.id.clone(),
            "Electronics".to_owned(),
            "2026-11-20".to_owned(),
            true,
        )
        .unwrap();
    assert!(store.get_wishlist().unwrap().is_empty());
    assert_eq!(
        store
            .get_summary_for(Some(account.id.clone()), Some("2026-11".to_owned()))
            .unwrap()
            .income,
        10.0
    );
}
