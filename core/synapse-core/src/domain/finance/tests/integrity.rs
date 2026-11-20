use super::super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn linked_loan_cashflows_cannot_be_detached_or_retyped() {
    let database_file = NamedTempFile::new().unwrap();
    let database = Database::open(database_file.path()).unwrap();
    let account = FinanceRepository::get_accounts(&database)
        .unwrap()
        .remove(0);
    let loan = {
        let connection = database.lock().unwrap();
        FinanceRepository::add_transaction_struct(
            &connection,
            Transaction {
                description: "Shared loan".to_owned(),
                amount: 20.0,
                expected_amount: Some(20.0),
                type_: "loan_made".to_owned(),
                category: "Personal".to_owned(),
                date: "2026-11-20".to_owned(),
                status: Some("in_progress".to_owned()),
                is_paid: Some(0),
                account_id: Some(account.id.clone()),
                ..Transaction::default()
            },
        )
        .unwrap()
    };
    let payment = record_loan_payment(&database, &loan.id, Some(5.0), &account.id, None).unwrap();

    let mut invalid_payment = payment.clone();
    invalid_payment.type_ = "expense".to_owned();
    assert!(update_transaction_with_links(&database, invalid_payment).is_err());

    let mut invalid_loan_edit = loan.clone();
    invalid_loan_edit.type_ = "expense".to_owned();
    assert!(update_transaction_with_links(&database, invalid_loan_edit).is_err());

    let transactions = FinanceRepository::get_transactions(&database, None, None).unwrap();
    let saved_loan = transactions.iter().find(|item| item.id == loan.id).unwrap();
    let saved_payment = transactions
        .iter()
        .find(|item| item.id == payment.id)
        .unwrap();
    assert_eq!(saved_loan.paid_amount, Some(5.0));
    assert_eq!(saved_payment.type_, "income");
    assert_eq!(
        saved_payment.linked_loan_id.as_deref(),
        Some(loan.id.as_str())
    );
}

#[test]
fn invalid_calendar_dates_do_not_create_finance_operations() {
    let database_file = NamedTempFile::new().unwrap();
    let database = Database::open(database_file.path()).unwrap();
    let account = FinanceRepository::get_accounts(&database)
        .unwrap()
        .remove(0);
    let loan = {
        let connection = database.lock().unwrap();
        FinanceRepository::add_transaction_struct(
            &connection,
            Transaction {
                description: "Payable".to_owned(),
                amount: 20.0,
                expected_amount: Some(20.0),
                type_: "loan_taken".to_owned(),
                category: "Personal".to_owned(),
                date: "2026-11-20".to_owned(),
                status: Some("in_progress".to_owned()),
                is_paid: Some(0),
                account_id: Some(account.id.clone()),
                ..Transaction::default()
            },
        )
        .unwrap()
    };
    assert!(record_loan_payment(
        &database,
        &loan.id,
        Some(5.0),
        &account.id,
        Some("2026-02-30"),
    )
    .is_err());

    let wish = {
        let connection = database.lock().unwrap();
        FinanceRepository::add_wishlist_struct(
            &connection,
            WishlistItem {
                title: "Desk".to_owned(),
                price: 25.0,
                priority: "medium".to_owned(),
                ..WishlistItem::default()
            },
        )
        .unwrap()
    };
    assert!(acquire_wishlist_item(
        &database,
        &wish.id,
        "Desk",
        25.0,
        &account.id,
        "Furniture",
        "2026-13-01",
        true,
    )
    .is_err());
    assert_eq!(FinanceRepository::get_wishlist(&database).unwrap().len(), 1);
    assert_eq!(
        FinanceRepository::get_transactions(&database, None, None)
            .unwrap()
            .len(),
        1
    );
}

#[test]
fn account_operations_preserve_one_valid_active_account() {
    let database_file = NamedTempFile::new().unwrap();
    let database = Database::open(database_file.path()).unwrap();
    assert!(FinanceRepository::delete_account(&database, "default-wallet").is_err());
    assert!(
        FinanceRepository::create_account(&database, "Invalid", None, None, Some(f64::NAN),)
            .is_err()
    );

    let additional =
        FinanceRepository::create_account(&database, "Savings", None, None, Some(100.0)).unwrap();
    FinanceRepository::delete_account(&database, "default-wallet").unwrap();
    let accounts = FinanceRepository::get_accounts(&database).unwrap();
    assert_eq!(accounts.len(), 1);
    assert_eq!(accounts[0].id, additional.id);
    assert!(FinanceRepository::delete_account(&database, &additional.id).is_err());
}

#[test]
fn account_balances_include_loan_principal_before_payment() {
    let database_file = NamedTempFile::new().unwrap();
    let database = Database::open(database_file.path()).unwrap();
    let account = FinanceRepository::get_accounts(&database)
        .unwrap()
        .remove(0);
    {
        let connection = database.lock().unwrap();
        for (description, amount, transaction_type) in [
            ("Lent", 100.0, "loan_made"),
            ("Borrowed", 40.0, "loan_taken"),
        ] {
            FinanceRepository::add_transaction_struct(
                &connection,
                Transaction {
                    description: description.to_owned(),
                    amount,
                    type_: transaction_type.to_owned(),
                    category: "Personal".to_owned(),
                    date: "2026-11-20".to_owned(),
                    status: Some("in_progress".to_owned()),
                    is_paid: Some(0),
                    account_id: Some(account.id.clone()),
                    ..Transaction::default()
                },
            )
            .unwrap();
        }
    }

    let updated_account = FinanceRepository::get_accounts(&database)
        .unwrap()
        .into_iter()
        .find(|item| item.id == account.id)
        .unwrap();
    assert_eq!(updated_account.current_balance, Some(-60.0));
}
