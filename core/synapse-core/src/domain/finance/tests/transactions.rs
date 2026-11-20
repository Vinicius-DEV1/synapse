use super::super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_delete_transaction_soft_deletes_the_requested_row() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();
    let transaction = FinanceRepository::add_transaction(
        &db,
        "Coffee",
        4.5,
        "expense",
        Some("Food"),
        None,
        Some("default-wallet"),
    )
    .unwrap();

    assert!(FinanceRepository::delete_transaction(&db, &transaction.id).is_ok());
    assert!(FinanceRepository::get_transactions(&db, None, None)
        .unwrap()
        .is_empty());
    assert!(
        !FinanceRepository::delete_transaction_conn(&db.lock().unwrap(), &transaction.id).unwrap()
    );
}

#[test]
fn transaction_api_preserves_loan_fields_and_returns_more_than_two_hundred_rows() {
    let temp_db = NamedTempFile::new().unwrap();
    let database_path = temp_db.path().to_path_buf();
    let transaction_id;

    {
        let db = Database::open(&database_path).unwrap();
        let loan = Transaction {
            description: "Laptop loan".to_owned(),
            amount: 800.0,
            expected_amount: Some(950.0),
            type_: "loan_made".to_owned(),
            category: "Geral".to_owned(),
            date: "2026-11-20".to_owned(),
            status: Some("in_progress".to_owned()),
            is_paid: Some(0),
            paid_amount: Some(150.0),
            account_id: Some("default-wallet".to_owned()),
            person: Some("  Marina  ".to_owned()),
            ..Transaction::default()
        };
        let conn = db.lock().unwrap();
        let saved = FinanceRepository::add_transaction_struct(&conn, loan).unwrap();
        transaction_id = saved.id.clone();
        assert_eq!(saved.person.as_deref(), Some("Marina"));
        assert!(saved.updated_at.is_some());
        drop(conn);

        for index in 0..205 {
            FinanceRepository::add_transaction(
                &db,
                &format!("Expense {index}"),
                1.0,
                "expense",
                None,
                None,
                Some("default-wallet"),
            )
            .unwrap();
        }

        let transactions = FinanceRepository::get_transactions(&db, None, None).unwrap();
        assert_eq!(transactions.len(), 206);
        assert_eq!(
            transactions
                .iter()
                .find(|transaction| transaction.id == transaction_id)
                .and_then(|transaction| transaction.person.as_deref()),
            Some("Marina")
        );
    }

    let reopened = Database::open(&database_path).unwrap();
    let transactions = FinanceRepository::get_transactions(&reopened, None, None).unwrap();
    let loan = transactions
        .iter()
        .find(|transaction| transaction.id == transaction_id)
        .unwrap();
    assert_eq!(loan.expected_amount, Some(950.0));
    assert_eq!(loan.person.as_deref(), Some("Marina"));
    assert_eq!(loan.is_paid, Some(0));
}
