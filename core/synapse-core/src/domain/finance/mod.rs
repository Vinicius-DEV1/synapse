pub mod accounts;
pub mod calculations;
pub mod models;
pub mod transactions;
pub mod wishlist;

#[cfg(test)]
mod tests;

pub use calculations::*;
pub use models::*;

use crate::db::Database;
use crate::error::{Result, SynapseError};

pub struct FinanceRepository;

impl FinanceRepository {
    // --- Accounts ---
    pub fn get_accounts(db: &Database) -> Result<Vec<Account>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::get_accounts_conn(&conn)
    }

    pub fn get_accounts_conn(conn: &rusqlite::Connection) -> Result<Vec<Account>> {
        accounts::get_accounts(conn)
    }

    pub fn create_account(
        db: &Database,
        name: &str,
        color: Option<&str>,
        icon: Option<&str>,
        initial_balance: Option<f64>,
    ) -> Result<Account> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::create_account_conn(&conn, name, color, icon, initial_balance)
    }

    pub fn create_account_conn(
        conn: &rusqlite::Connection,
        name: &str,
        color: Option<&str>,
        icon: Option<&str>,
        initial_balance: Option<f64>,
    ) -> Result<Account> {
        accounts::create_account(conn, name, color, icon, initial_balance)
    }

    pub fn create_account_struct(conn: &rusqlite::Connection, account: Account) -> Result<Account> {
        accounts::create_account_struct(conn, account)
    }

    pub fn update_account(
        db: &Database,
        account_id: &str,
        name: &str,
        color: Option<&str>,
        icon: Option<&str>,
        initial_balance: Option<f64>,
    ) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::update_account_conn(&conn, account_id, name, color, icon, initial_balance)
    }

    pub fn update_account_conn(
        conn: &rusqlite::Connection,
        account_id: &str,
        name: &str,
        color: Option<&str>,
        icon: Option<&str>,
        initial_balance: Option<f64>,
    ) -> Result<()> {
        accounts::update_account(conn, account_id, name, color, icon, initial_balance)
    }

    pub fn update_account_struct(conn: &rusqlite::Connection, account: Account) -> Result<i32> {
        accounts::update_account_struct(conn, account)
    }

    pub fn delete_account(db: &Database, account_id: &str) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::delete_account_conn(&conn, account_id).map(|_| ())
    }

    pub fn delete_account_conn(conn: &rusqlite::Connection, account_id: &str) -> Result<bool> {
        accounts::delete_account(conn, account_id)
    }

    // --- Transactions ---
    pub fn get_transactions(
        db: &Database,
        type_filter: Option<&str>,
        account_filter: Option<&str>,
    ) -> Result<Vec<Transaction>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::get_transactions_conn(&conn, type_filter, account_filter)
    }

    pub fn get_transactions_conn(
        conn: &rusqlite::Connection,
        type_filter: Option<&str>,
        account_filter: Option<&str>,
    ) -> Result<Vec<Transaction>> {
        transactions::get_transactions(conn, type_filter, account_filter)
    }

    pub fn add_transaction(
        db: &Database,
        description: &str,
        amount: f64,
        type_: &str,
        category: Option<&str>,
        date: Option<&str>,
        account_id: Option<&str>,
    ) -> Result<Transaction> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::add_transaction_conn(&conn, description, amount, type_, category, date, account_id)
    }

    pub fn add_transaction_conn(
        conn: &rusqlite::Connection,
        description: &str,
        amount: f64,
        type_: &str,
        category: Option<&str>,
        date: Option<&str>,
        account_id: Option<&str>,
    ) -> Result<Transaction> {
        transactions::add_transaction(conn, description, amount, type_, category, date, account_id)
    }

    pub fn add_transaction_struct(conn: &rusqlite::Connection, transaction: Transaction) -> Result<Transaction> {
        transactions::add_transaction_struct(conn, transaction)
    }

    pub fn add_transfer(
        db: &Database,
        description: &str,
        amount: f64,
        from_account_id: &str,
        to_account_id: &str,
        date: Option<&str>,
    ) -> Result<Transaction> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::add_transfer_conn(&conn, description, amount, from_account_id, to_account_id, date)
    }

    pub fn add_transfer_conn(
        conn: &rusqlite::Connection,
        description: &str,
        amount: f64,
        from_account_id: &str,
        to_account_id: &str,
        date: Option<&str>,
    ) -> Result<Transaction> {
        transactions::add_transfer(conn, description, amount, from_account_id, to_account_id, date)
    }

    pub fn update_transaction(
        db: &Database,
        tx_id: &str,
        description: &str,
        amount: f64,
        type_: &str,
        category: Option<&str>,
        date: Option<&str>,
        account_id: Option<&str>,
        destination_account_id: Option<&str>,
    ) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::update_transaction_conn(&conn, tx_id, description, amount, type_, category, date, account_id, destination_account_id)
    }

    pub fn update_transaction_conn(
        conn: &rusqlite::Connection,
        tx_id: &str,
        description: &str,
        amount: f64,
        type_: &str,
        category: Option<&str>,
        date: Option<&str>,
        account_id: Option<&str>,
        destination_account_id: Option<&str>,
    ) -> Result<()> {
        transactions::update_transaction(conn, tx_id, description, amount, type_, category, date, account_id, destination_account_id)
    }

    pub fn update_transaction_struct(conn: &rusqlite::Connection, transaction: Transaction) -> Result<i32> {
        transactions::update_transaction_struct(conn, transaction)
    }

    pub fn delete_transaction(db: &Database, tx_id: &str) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::delete_transaction_conn(&conn, tx_id).map(|_| ())
    }

    pub fn delete_transaction_conn(conn: &rusqlite::Connection, tx_id: &str) -> Result<bool> {
        transactions::delete_transaction(conn, tx_id)
    }

    // --- Summary ---
    pub fn get_financial_summary(db: &Database) -> Result<FinancialSummary> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::get_financial_summary_conn(&conn)
    }

    pub fn get_financial_summary_conn(conn: &rusqlite::Connection) -> Result<FinancialSummary> {
        let mut stmt = conn.prepare(
            "SELECT type, SUM(amount) as total FROM transactions 
             WHERE deleted_at IS NULL 
               AND (status IS NULL OR status != 'pending') 
               AND (is_paid IS NULL OR is_paid != 0) 
             GROUP BY type",
        )?;

        let mut income = 0.0;
        let mut expense = 0.0;

        let rows = stmt.query_map([], |row| {
            let t: String = row.get(0)?;
            let total: f64 = row.get(1)?;
            Ok((t, total))
        })?;

        for r in rows {
            let (t, total) = r?;
            if t == "income" {
                income += total;
            } else if t == "expense" {
                expense += total;
            }
        }

        drop(stmt);

        let accounts = Self::get_accounts_conn(conn)?;
        Ok(calculations::build_financial_summary(income, expense, &accounts))
    }

    // --- Wishlist ---
    pub fn get_wishlist(db: &Database) -> Result<Vec<WishlistItem>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::get_wishlist_conn(&conn)
    }

    pub fn get_wishlist_conn(conn: &rusqlite::Connection) -> Result<Vec<WishlistItem>> {
        wishlist::get_wishlist(conn)
    }

    pub fn add_wishlist_item(
        db: &Database,
        title: &str,
        price: f64,
        priority: Option<&str>,
        category: Option<&str>,
        link: Option<&str>,
        description: Option<&str>,
    ) -> Result<WishlistItem> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::add_wishlist_item_conn(&conn, title, price, priority, category, link, description)
    }

    pub fn add_wishlist_item_conn(
        conn: &rusqlite::Connection,
        title: &str,
        price: f64,
        priority: Option<&str>,
        category: Option<&str>,
        link: Option<&str>,
        description: Option<&str>,
    ) -> Result<WishlistItem> {
        wishlist::add_wishlist_item(conn, title, price, priority, category, link, description)
    }

    pub fn add_wishlist_struct(conn: &rusqlite::Connection, item: WishlistItem) -> Result<WishlistItem> {
        wishlist::add_wishlist_struct(conn, item)
    }

    pub fn update_wishlist_struct(conn: &rusqlite::Connection, item: WishlistItem) -> Result<i32> {
        wishlist::update_wishlist_struct(conn, item)
    }

    pub fn delete_wishlist_item(db: &Database, item_id: &str) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::delete_wishlist_item_conn(&conn, item_id).map(|_| ())
    }

    pub fn delete_wishlist_conn(conn: &rusqlite::Connection, item_id: &str) -> Result<bool> {
        wishlist::delete_wishlist_item(conn, item_id)
    }

    pub fn delete_wishlist_item_conn(conn: &rusqlite::Connection, item_id: &str) -> Result<bool> {
        wishlist::delete_wishlist_item(conn, item_id)
    }
}
