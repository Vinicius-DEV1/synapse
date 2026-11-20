use super::super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn loan_payments_update_cashflow_and_parent_atomically() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();
    let account = FinanceRepository::get_accounts(&db).unwrap().remove(0);
    let loan = {
        let conn = db.lock().unwrap();
        FinanceRepository::add_transaction_struct(
            &conn,
            Transaction {
                description: "Camera loan".to_owned(),
                amount: 100.0,
                expected_amount: Some(120.0),
                type_: "loan_made".to_owned(),
                category: "Personal".to_owned(),
                date: "2026-11-20".to_owned(),
                status: Some("in_progress".to_owned()),
                is_paid: Some(0),
                account_id: Some(account.id.clone()),
                person: Some("Alex".to_owned()),
                ..Transaction::default()
            },
        )
        .unwrap()
    };

    let first_payment =
        record_loan_payment(&db, &loan.id, Some(40.0), &account.id, Some("2026-11-20")).unwrap();
    assert_eq!(
        first_payment.linked_loan_id.as_deref(),
        Some(loan.id.as_str())
    );
    assert_eq!(first_payment.type_, "income");
    let current = FinanceRepository::get_transactions(&db, None, None).unwrap();
    let loan_after_first = current.iter().find(|item| item.id == loan.id).unwrap();
    assert_eq!(loan_after_first.paid_amount, Some(40.0));
    assert_eq!(loan_after_first.status.as_deref(), Some("in_progress"));

    let final_payment =
        record_loan_payment(&db, &loan.id, None, &account.id, Some("2026-11-21")).unwrap();
    assert_eq!(final_payment.amount, 80.0);
    assert!(record_loan_payment(&db, &loan.id, Some(1.0), &account.id, None).is_err());
    let current = FinanceRepository::get_transactions(&db, None, None).unwrap();
    let completed_loan = current.iter().find(|item| item.id == loan.id).unwrap();
    assert_eq!(completed_loan.paid_amount, Some(120.0));
    assert_eq!(completed_loan.status.as_deref(), Some("completed"));
    assert_eq!(
        current
            .iter()
            .filter(|item| item.linked_loan_id.as_deref() == Some(&loan.id))
            .count(),
        2
    );
}

#[test]
fn finance_summary_scopes_period_and_account_without_mutating_balance() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();
    let account = FinanceRepository::get_accounts(&db).unwrap().remove(0);
    for (description, amount, date, status) in [
        ("November income", 250.0, "2026-11-02", "completed"),
        ("October income", 75.0, "2026-10-02", "completed"),
        ("Pending expense", 30.0, "2026-11-03", "pending"),
    ] {
        let conn = db.lock().unwrap();
        FinanceRepository::add_transaction_struct(
            &conn,
            Transaction {
                description: description.to_owned(),
                amount,
                type_: if description.contains("expense") {
                    "expense"
                } else {
                    "income"
                }
                .to_owned(),
                category: "General".to_owned(),
                date: date.to_owned(),
                status: Some(status.to_owned()),
                is_paid: Some(i32::from(status != "pending")),
                account_id: Some(account.id.clone()),
                ..Transaction::default()
            },
        )
        .unwrap();
    }
    let summary = get_financial_summary_for(&db, Some(&account.id), Some("2026-11")).unwrap();
    assert_eq!(summary.income, 250.0);
    assert_eq!(summary.expense, 0.0);
    assert_eq!(summary.balance, 250.0);
}

#[test]
fn pending_confirmation_and_wishlist_acquisition_are_atomic() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();
    let account = FinanceRepository::get_accounts(&db).unwrap().remove(0);
    let pending = {
        let conn = db.lock().unwrap();
        FinanceRepository::add_transaction_struct(
            &conn,
            Transaction {
                description: "Pending bill".to_owned(),
                amount: 45.0,
                type_: "expense".to_owned(),
                category: "Utilities".to_owned(),
                date: "2026-11-20".to_owned(),
                status: Some("pending".to_owned()),
                is_paid: Some(0),
                account_id: Some(account.id.clone()),
                ..Transaction::default()
            },
        )
        .unwrap()
    };
    confirm_pending_transaction(&db, &pending.id).unwrap();
    assert_eq!(
        FinanceRepository::get_transactions(&db, None, None).unwrap()[0]
            .status
            .as_deref(),
        Some("completed")
    );

    let item = {
        let conn = db.lock().unwrap();
        FinanceRepository::add_wishlist_struct(
            &conn,
            WishlistItem {
                title: "Headphones".to_owned(),
                price: 80.0,
                priority: "high".to_owned(),
                category: Some("Electronics".to_owned()),
                ..WishlistItem::default()
            },
        )
        .unwrap()
    };
    assert!(acquire_wishlist_item(
        &db,
        &item.id,
        "Headphones",
        0.0,
        &account.id,
        "Electronics",
        "2026-11-20",
        true
    )
    .is_err());
    assert_eq!(FinanceRepository::get_wishlist(&db).unwrap().len(), 1);
    let expense = acquire_wishlist_item(
        &db,
        &item.id,
        "Headphones",
        75.0,
        &account.id,
        "Electronics",
        "2026-11-20",
        true,
    )
    .unwrap();
    assert_eq!(expense.type_, "expense");
    assert!(FinanceRepository::get_wishlist(&db).unwrap().is_empty());
}

#[test]
fn linked_loan_payments_reconcile_on_edit_and_delete() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();
    let account = FinanceRepository::get_accounts(&db).unwrap().remove(0);
    let loan = {
        let conn = db.lock().unwrap();
        FinanceRepository::add_transaction_struct(
            &conn,
            Transaction {
                description: "Old description".to_owned(),
                amount: 100.0,
                expected_amount: Some(100.0),
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
    let payment = record_loan_payment(&db, &loan.id, Some(40.0), &account.id, None).unwrap();
    let mut edited_payment = FinanceRepository::get_transactions(&db, None, None)
        .unwrap()
        .into_iter()
        .find(|item| item.id == payment.id)
        .unwrap();
    edited_payment.amount = 35.0;
    update_transaction_with_links(&db, edited_payment).unwrap();
    let saved_loan = FinanceRepository::get_transactions(&db, None, None)
        .unwrap()
        .into_iter()
        .find(|item| item.id == loan.id)
        .unwrap();
    assert_eq!(saved_loan.paid_amount, Some(35.0));

    assert!(delete_transaction_with_links(&db, &payment.id).unwrap());
    let saved_loan = FinanceRepository::get_transactions(&db, None, None)
        .unwrap()
        .into_iter()
        .find(|item| item.id == loan.id)
        .unwrap();
    assert_eq!(saved_loan.paid_amount, Some(0.0));
    assert_eq!(saved_loan.status.as_deref(), Some("in_progress"));
}

#[test]
fn reopening_a_loan_archives_linked_payments_and_resets_the_balance() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();
    let account = FinanceRepository::get_accounts(&db).unwrap().remove(0);
    let loan = {
        let conn = db.lock().unwrap();
        FinanceRepository::add_transaction_struct(
            &conn,
            Transaction {
                description: "Closed loan".to_owned(),
                amount: 50.0,
                expected_amount: Some(50.0),
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
    let payment = record_loan_payment(&db, &loan.id, None, &account.id, None).unwrap();
    assert_eq!(payment.amount, 50.0);
    reopen_loan(&db, &loan.id).unwrap();
    let rows = FinanceRepository::get_transactions(&db, None, None).unwrap();
    let reopened = rows.iter().find(|item| item.id == loan.id).unwrap();
    assert_eq!(reopened.paid_amount, Some(0.0));
    assert_eq!(reopened.status.as_deref(), Some("in_progress"));
    assert!(rows.iter().all(|item| item.id != payment.id));
}
