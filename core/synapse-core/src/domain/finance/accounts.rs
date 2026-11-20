use super::calculations::apply_balance_deltas;
use super::models::Account;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;
use std::collections::HashMap;

pub fn get_accounts(conn: &rusqlite::Connection) -> Result<Vec<Account>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, color, icon, initial_balance, created_at, updated_at, deleted_at 
         FROM finance_accounts 
         WHERE deleted_at IS NULL 
         ORDER BY name ASC",
    )?;

    let mut accounts: Vec<Account> = stmt
        .query_map([], |row| {
            Ok(Account {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                initial_balance: row.get(4)?,
                current_balance: None,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    if accounts.is_empty() {
        return Ok(Vec::new());
    }

    // Calculate real-time balance deltas
    let mut tx_stmt = conn.prepare(
        "SELECT account_id, destination_account_id, type, amount 
         FROM transactions 
         WHERE deleted_at IS NULL 
           AND (
             type IN ('loan_made', 'loan_taken')
             OR ((status IS NULL OR status != 'pending') AND (is_paid IS NULL OR is_paid != 0))
           )",
    )?;

    let mut deltas: HashMap<String, f64> = HashMap::new();
    let rows = tx_stmt.query_map([], |row| {
        let acc_id: Option<String> = row.get(0)?;
        let dest_id: Option<String> = row.get(1)?;
        let tx_type: String = row.get(2)?;
        let amount: f64 = row.get(3)?;
        Ok((acc_id, dest_id, tx_type, amount))
    })?;

    for row in rows {
        let (raw_acc_id, dest_id, tx_type, amount) = row?;
        let acc_id = raw_acc_id
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "default-wallet".to_string());

        super::calculations::accumulate_transaction_delta(
            &mut deltas,
            &acc_id,
            dest_id.as_deref(),
            &tx_type,
            amount,
        );
    }

    apply_balance_deltas(&mut accounts, &deltas);
    Ok(accounts)
}

pub fn create_account(
    conn: &rusqlite::Connection,
    name: &str,
    color: Option<&str>,
    icon: Option<&str>,
    initial_balance: Option<f64>,
) -> Result<Account> {
    let trimmed_name = name.trim();
    if trimmed_name.is_empty() {
        return Err(SynapseError::Validation(
            "Account name cannot be empty".into(),
        ));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let resolved_color = color
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("#10b981")
        .to_string();
    let resolved_icon = icon
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("wallet")
        .to_string();
    let balance = initial_balance.unwrap_or(0.0);
    validate_initial_balance(balance)?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO finance_accounts (id, name, color, icon, initial_balance, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![id, trimmed_name, resolved_color, resolved_icon, balance, now, now],
    )?;

    Ok(Account {
        id,
        name: trimmed_name.to_string(),
        color: Some(resolved_color),
        icon: Some(resolved_icon),
        initial_balance: Some(balance),
        current_balance: Some(balance),
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    })
}

pub fn create_account_struct(conn: &rusqlite::Connection, account: Account) -> Result<Account> {
    let id = if account.id.trim().is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        account.id.trim().to_string()
    };
    let name = account.name.trim().to_string();
    if name.is_empty() {
        return Err(SynapseError::Validation(
            "Account name cannot be empty".into(),
        ));
    }
    let initial_balance = account.initial_balance.unwrap_or(0.0);
    validate_initial_balance(initial_balance)?;
    let color = account
        .color
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "#10b981".to_string());
    let icon = account
        .icon
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "wallet".to_string());
    let created_at = account
        .created_at
        .unwrap_or_else(|| Utc::now().to_rfc3339());
    let updated_at = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO finance_accounts (id, name, color, icon, initial_balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![id, name, color, icon, initial_balance, created_at, updated_at],
    )?;

    Ok(Account {
        id,
        name,
        color: Some(color),
        icon: Some(icon),
        initial_balance: Some(initial_balance),
        current_balance: Some(initial_balance),
        created_at: Some(created_at),
        updated_at: Some(updated_at),
        deleted_at: None,
    })
}

pub fn update_account(
    conn: &rusqlite::Connection,
    account_id: &str,
    name: &str,
    color: Option<&str>,
    icon: Option<&str>,
    initial_balance: Option<f64>,
) -> Result<()> {
    let trimmed_id = account_id.trim();
    let trimmed_name = name.trim();
    if trimmed_id.is_empty() || trimmed_name.is_empty() {
        return Err(SynapseError::Validation(
            "ID and name cannot be empty".into(),
        ));
    }

    let resolved_color = color
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("#10b981");
    let resolved_icon = icon
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("wallet");
    let balance = initial_balance.unwrap_or(0.0);
    validate_initial_balance(balance)?;
    let now = Utc::now().to_rfc3339();

    let count = conn.execute(
        "UPDATE finance_accounts 
         SET name = ?, color = ?, icon = ?, initial_balance = ?, updated_at = ? 
         WHERE id = ? AND deleted_at IS NULL",
        params![
            trimmed_name,
            resolved_color,
            resolved_icon,
            balance,
            now,
            trimmed_id
        ],
    )?;

    if count == 0 {
        return Err(SynapseError::NotFound(format!(
            "Account {} not found",
            trimmed_id
        )));
    }

    Ok(())
}

pub fn update_account_struct(conn: &rusqlite::Connection, account: Account) -> Result<i32> {
    let id = account.id.trim();
    let name = account.name.trim();
    if id.is_empty() || name.is_empty() {
        return Err(SynapseError::Validation(
            "Account ID and name cannot be empty".into(),
        ));
    }
    let initial_balance = account.initial_balance.unwrap_or(0.0);
    validate_initial_balance(initial_balance)?;
    let color = account
        .color
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "#10b981".to_string());
    let icon = account
        .icon
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "wallet".to_string());

    let count = conn.execute(
        "UPDATE finance_accounts 
         SET name = ?, color = ?, icon = ?, initial_balance = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND deleted_at IS NULL",
        params![name, color, icon, initial_balance, id],
    )?;

    Ok(count as i32)
}

pub fn delete_account(conn: &rusqlite::Connection, account_id: &str) -> Result<bool> {
    let trimmed_id = account_id.trim();
    if trimmed_id.is_empty() {
        return Err(SynapseError::Validation("ID cannot be empty".into()));
    }

    let now = Utc::now().to_rfc3339();
    let count = conn.execute(
        "UPDATE finance_accounts SET deleted_at = ?, updated_at = ?
         WHERE id = ? AND deleted_at IS NULL
           AND (SELECT COUNT(*) FROM finance_accounts WHERE deleted_at IS NULL) > 1",
        params![now, now, trimmed_id],
    )?;

    if count > 0 {
        return Ok(true);
    }
    let account_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM finance_accounts WHERE id = ? AND deleted_at IS NULL)",
        [trimmed_id],
        |row| row.get(0),
    )?;
    if account_exists {
        return Err(SynapseError::Validation(
            "At least one active finance account must remain".into(),
        ));
    }
    Ok(false)
}

fn validate_initial_balance(balance: f64) -> Result<()> {
    const MAX_CURRENCY_AMOUNT: f64 = i64::MAX as f64 / 100.0;
    if !balance.is_finite() || balance.abs() > MAX_CURRENCY_AMOUNT {
        return Err(SynapseError::Validation(
            "Initial balance must be a finite currency amount".into(),
        ));
    }
    Ok(())
}
