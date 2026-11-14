use super::models::Transaction;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;

pub fn get_transactions(
    conn: &rusqlite::Connection,
    type_filter: Option<&str>,
    account_filter: Option<&str>,
) -> Result<Vec<Transaction>> {
    let mut sql = String::from(
        "SELECT id, description, amount, expected_amount, type, category, date, status, 
                is_paid, paid_amount, is_recurring, recurrence_period, due_date, 
                account_id, destination_account_id, linked_loan_id, created_at, updated_at 
         FROM transactions 
         WHERE deleted_at IS NULL ",
    );

    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

    if let Some(t) = type_filter.map(|s| s.trim()).filter(|s| !s.is_empty() && *s != "all") {
        sql.push_str("AND type = ? ");
        params_vec.push(rusqlite::types::Value::Text(t.to_string()));
    }

    if let Some(acc) = account_filter.map(|s| s.trim()).filter(|s| !s.is_empty() && *s != "all") {
        sql.push_str("AND (account_id = ? OR destination_account_id = ?) ");
        params_vec.push(rusqlite::types::Value::Text(acc.to_string()));
        params_vec.push(rusqlite::types::Value::Text(acc.to_string()));
    }

    sql.push_str("ORDER BY date DESC, created_at DESC LIMIT 200");

    let mut stmt = conn.prepare(&sql)?;
    let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|v| v as &dyn rusqlite::ToSql).collect();

    let txs = stmt
        .query_map(&params_slice[..], |row| {
            Ok(Transaction {
                id: row.get(0)?,
                description: row.get(1)?,
                amount: row.get(2)?,
                expected_amount: row.get(3)?,
                type_: row.get(4)?,
                category: row.get(5)?,
                date: row.get(6)?,
                status: row.get(7)?,
                is_paid: row.get(8)?,
                paid_amount: row.get(9)?,
                is_recurring: row.get(10)?,
                recurrence_period: row.get(11)?,
                due_date: row.get(12)?,
                account_id: row.get(13)?,
                destination_account_id: row.get(14)?,
                linked_loan_id: row.get(15)?,
                created_at: row.get(16)?,
                updated_at: row.get(17)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(txs)
}

pub fn add_transaction(
    conn: &rusqlite::Connection,
    description: &str,
    amount: f64,
    type_: &str,
    category: Option<&str>,
    date: Option<&str>,
    account_id: Option<&str>,
) -> Result<Transaction> {
    let trimmed_desc = description.trim();
    if trimmed_desc.is_empty() || !amount.is_finite() || amount < 0.0 {
        return Err(SynapseError::Validation("Invalid description or amount".into()));
    }

    let valid_types = ["income", "expense", "transfer", "loan_made", "loan_taken"];
    if !valid_types.contains(&type_) {
        return Err(SynapseError::Validation(format!("Unsupported type: {}", type_)));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let resolved_date = match date.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        Some(d) => d.to_string(),
        None => Utc::now().format("%Y-%m-%d").to_string(),
    };
    let resolved_cat = category
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("Geral")
        .to_string();
    let resolved_acc_id = account_id
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    conn.execute(
        "INSERT INTO transactions (id, description, amount, type, category, date, status, account_id, is_paid, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, 1, ?, ?)",
        params![id, trimmed_desc, amount, type_, resolved_cat, resolved_date, resolved_acc_id, now, now],
    )?;

    Ok(Transaction {
        id,
        description: trimmed_desc.to_string(),
        amount,
        expected_amount: None,
        type_: type_.to_string(),
        category: resolved_cat,
        date: resolved_date,
        status: Some("completed".to_string()),
        is_paid: Some(1),
        paid_amount: None,
        is_recurring: Some(0),
        recurrence_period: None,
        due_date: None,
        account_id: resolved_acc_id,
        destination_account_id: None,
        linked_loan_id: None,
        created_at: Some(now.clone()),
        updated_at: Some(now),
    })
}

pub fn add_transaction_struct(conn: &rusqlite::Connection, mut transaction: Transaction) -> Result<Transaction> {
    let id = if transaction.id.trim().is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        transaction.id.trim().to_string()
    };
    let created_at = transaction.created_at.unwrap_or_else(|| Utc::now().to_rfc3339());
    let is_paid = transaction.is_paid.unwrap_or(1);
    let is_recurring = transaction.is_recurring.unwrap_or(0);
    let account_id = transaction.account_id.filter(|s| !s.is_empty());
    let status = transaction.status.unwrap_or_else(|| "completed".to_string());

    conn.execute(
        "INSERT INTO transactions (
            id, description, amount, expected_amount, type, category, date, status, 
            is_paid, paid_amount, is_recurring, recurrence_period, due_date, 
            account_id, destination_account_id, linked_loan_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
        params![
            id,
            transaction.description,
            transaction.amount,
            transaction.expected_amount,
            transaction.type_,
            transaction.category,
            transaction.date,
            status,
            is_paid,
            transaction.paid_amount,
            is_recurring,
            transaction.recurrence_period,
            transaction.due_date,
            account_id,
            transaction.destination_account_id,
            transaction.linked_loan_id,
            created_at,
        ],
    )?;

    transaction.id = id;
    transaction.created_at = Some(created_at);
    transaction.is_paid = Some(is_paid);
    transaction.is_recurring = Some(is_recurring);
    transaction.account_id = account_id;
    transaction.status = Some(status);
    Ok(transaction)
}

pub fn add_transfer(
    conn: &rusqlite::Connection,
    description: &str,
    amount: f64,
    from_account_id: &str,
    to_account_id: &str,
    date: Option<&str>,
) -> Result<Transaction> {
    let trimmed_desc = description.trim();
    let from_id = from_account_id.trim();
    let to_id = to_account_id.trim();

    if trimmed_desc.is_empty() || !amount.is_finite() || amount <= 0.0 || from_id.is_empty() || to_id.is_empty() || from_id == to_id {
        return Err(SynapseError::Validation("Invalid transfer parameters".into()));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let resolved_date = match date.map(|s| s.trim()).filter(|s| !s.is_empty()) {
        Some(d) => d.to_string(),
        None => Utc::now().format("%Y-%m-%d").to_string(),
    };

    conn.execute(
        "INSERT INTO transactions (id, description, amount, type, category, date, status, account_id, destination_account_id, is_paid, created_at, updated_at) 
         VALUES (?, ?, ?, 'transfer', 'Transferência', ?, 'completed', ?, ?, 1, ?, ?)",
        params![id, trimmed_desc, amount, resolved_date, from_id, to_id, now, now],
    )?;

    Ok(Transaction {
        id,
        description: trimmed_desc.to_string(),
        amount,
        expected_amount: None,
        type_: "transfer".to_string(),
        category: "Transferência".to_string(),
        date: resolved_date,
        status: Some("completed".to_string()),
        is_paid: Some(1),
        paid_amount: None,
        is_recurring: Some(0),
        recurrence_period: None,
        due_date: None,
        account_id: Some(from_id.to_string()),
        destination_account_id: Some(to_id.to_string()),
        linked_loan_id: None,
        created_at: Some(now.clone()),
        updated_at: Some(now),
    })
}

pub fn update_transaction(
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
    let trimmed_id = tx_id.trim();
    let trimmed_desc = description.trim();
    let supported_types = ["income", "expense", "transfer"];

    if trimmed_id.is_empty() || trimmed_desc.is_empty() || !amount.is_finite() || amount < 0.0 || !supported_types.contains(&type_) {
        return Err(SynapseError::Validation("Invalid transaction parameters".into()));
    }

    let resolved_category = category
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("Geral");
    let now = Utc::now().to_rfc3339();

    let count = if date.is_none() && account_id.is_none() && destination_account_id.is_none() {
        conn.execute(
            "UPDATE transactions SET description = ?1, amount = ?2, type = ?3, category = ?4, updated_at = ?5 
             WHERE id = ?6 AND deleted_at IS NULL",
            params![trimmed_desc, amount, type_, resolved_category, now, trimmed_id],
        )?
    } else {
        let d = date.unwrap_or("").trim();
        let acc = account_id.map(|s| s.trim()).filter(|s| !s.is_empty());
        let dest = destination_account_id.map(|s| s.trim()).filter(|s| !s.is_empty());

        conn.execute(
            "UPDATE transactions SET description = ?1, amount = ?2, type = ?3, category = ?4, date = ?5, 
                    account_id = ?6, destination_account_id = ?7, updated_at = ?8 
             WHERE id = ?9 AND deleted_at IS NULL",
            params![trimmed_desc, amount, type_, resolved_category, d, acc, dest, now, trimmed_id],
        )?
    };

    if count == 0 {
        return Err(SynapseError::NotFound(format!("Transaction {} not found", trimmed_id)));
    }

    Ok(())
}

pub fn update_transaction_struct(conn: &rusqlite::Connection, transaction: Transaction) -> Result<i32> {
    let is_paid = transaction.is_paid.unwrap_or(1);
    let is_recurring = transaction.is_recurring.unwrap_or(0);
    let account_id = transaction.account_id.filter(|s| !s.is_empty());
    let status = transaction.status.unwrap_or_else(|| "completed".to_string());

    let count = conn.execute(
        "UPDATE transactions 
         SET description = ?, amount = ?, expected_amount = ?, type = ?, category = ?, date = ?, status = ?, 
             is_paid = ?, paid_amount = ?, is_recurring = ?, recurrence_period = ?, due_date = ?, 
             account_id = ?, destination_account_id = ?, linked_loan_id = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?",
        params![
            transaction.description,
            transaction.amount,
            transaction.expected_amount,
            transaction.type_,
            transaction.category,
            transaction.date,
            status,
            is_paid,
            transaction.paid_amount,
            is_recurring,
            transaction.recurrence_period,
            transaction.due_date,
            account_id,
            transaction.destination_account_id,
            transaction.linked_loan_id,
            transaction.id,
        ],
    )?;

    Ok(count as i32)
}

pub fn delete_transaction(conn: &rusqlite::Connection, tx_id: &str) -> Result<bool> {
    let trimmed_id = tx_id.trim();
    if trimmed_id.is_empty() {
        return Err(SynapseError::Validation("ID cannot be empty".into()));
    }

    let now = Utc::now().to_rfc3339();
    let _ = conn.execute(
        "UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE linked_loan_id = ? AND deleted_at IS NULL",
        params![now, now, trimmed_id],
    );

    let count = conn.execute(
        "UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        params![now, trimmed_id],
    )?;

    Ok(count > 0)
}
