use super::FinanceRepository;
use crate::db::Database;
use crate::domain::finance::{accounts, Account};
use crate::error::{Result, SynapseError};

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
}
