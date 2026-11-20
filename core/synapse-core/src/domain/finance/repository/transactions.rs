use super::FinanceRepository;
use crate::db::Database;
use crate::domain::finance::{transactions, Transaction};
use crate::error::{Result, SynapseError};

impl FinanceRepository {
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
        Self::add_transaction_conn(
            &conn,
            description,
            amount,
            type_,
            category,
            date,
            account_id,
        )
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

    pub fn add_transaction_struct(
        conn: &rusqlite::Connection,
        transaction: Transaction,
    ) -> Result<Transaction> {
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
        Self::add_transfer_conn(
            &conn,
            description,
            amount,
            from_account_id,
            to_account_id,
            date,
        )
    }

    pub fn add_transfer_conn(
        conn: &rusqlite::Connection,
        description: &str,
        amount: f64,
        from_account_id: &str,
        to_account_id: &str,
        date: Option<&str>,
    ) -> Result<Transaction> {
        transactions::add_transfer(
            conn,
            description,
            amount,
            from_account_id,
            to_account_id,
            date,
        )
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
        Self::update_transaction_conn(
            &conn,
            tx_id,
            description,
            amount,
            type_,
            category,
            date,
            account_id,
            destination_account_id,
        )
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
        transactions::update_transaction(
            conn,
            tx_id,
            description,
            amount,
            type_,
            category,
            date,
            account_id,
            destination_account_id,
        )
    }

    pub fn update_transaction_struct(
        conn: &rusqlite::Connection,
        transaction: Transaction,
    ) -> Result<i32> {
        transactions::update_transaction_struct(conn, transaction)
    }

    pub fn delete_transaction(db: &Database, tx_id: &str) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::delete_transaction_conn(&conn, tx_id).map(|_| ())
    }

    pub fn delete_transaction_conn(conn: &rusqlite::Connection, tx_id: &str) -> Result<bool> {
        transactions::delete_transaction(conn, tx_id)
    }
}
