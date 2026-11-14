use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_finance_account_and_balance_lifecycle() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();

    // 1. Initial default-wallet is seeded by migration
    let accounts = FinanceRepository::get_accounts(&db).unwrap();
    assert!(!accounts.is_empty());
    let default_acc = &accounts[0];
    assert_eq!(default_acc.id, "default-wallet");
    assert_eq!(default_acc.current_balance, Some(0.0));

    // 2. Create checking and savings accounts
    let checking = FinanceRepository::create_account(&db, "Checking", Some("#2563eb"), Some("bank"), Some(1000.0)).unwrap();
    let savings = FinanceRepository::create_account(&db, "Savings", Some("#10b981"), Some("wallet"), Some(500.0)).unwrap();

    // 3. Add income to checking
    let _ = FinanceRepository::add_transaction(&db, "Salary", 2000.0, "income", Some("Work"), None, Some(&checking.id)).unwrap();

    // 4. Add expense from checking
    let _ = FinanceRepository::add_transaction(&db, "Rent", 800.0, "expense", Some("Housing"), None, Some(&checking.id)).unwrap();

    // 5. Transfer from checking to savings
    let _ = FinanceRepository::add_transfer(&db, "Monthly Savings", 300.0, &checking.id, &savings.id, None).unwrap();

    // 6. Check updated balances
    let accounts = FinanceRepository::get_accounts(&db).unwrap();
    let checking_updated = accounts.iter().find(|a| a.id == checking.id).unwrap();
    let savings_updated = accounts.iter().find(|a| a.id == savings.id).unwrap();

    // Checking: 1000 + 2000 - 800 - 300 = 1900.0
    assert_eq!(checking_updated.current_balance, Some(1900.0));
    // Savings: 500 + 300 = 800.0
    assert_eq!(savings_updated.current_balance, Some(800.0));

    // 7. Check summary
    let summary = FinanceRepository::get_financial_summary(&db).unwrap();
    assert_eq!(summary.income, 2000.0);
    assert_eq!(summary.expense, 800.0);
    assert_eq!(summary.balance, 1200.0);
    assert_eq!(summary.total_balance, 2700.0); // 1900 + 800 + 0 (default)
}
