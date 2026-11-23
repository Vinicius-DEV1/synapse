use super::super::models::Transaction;
use super::update::validate_transaction;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;

pub fn add_transaction(
    conn: &rusqlite::Connection,
    description: &str,
    amount: f64,
    type_: &str,
    category: Option<&str>,
    date: Option<&str>,
    account_id: Option<&str>,
) -> Result<Transaction> {
    add_transaction_with_status(
        conn,
        description,
        amount,
        type_,
        category,
        date,
        account_id,
        None,
    )
}

pub fn add_transaction_with_status(
    conn: &rusqlite::Connection,
    description: &str,
    amount: f64,
    type_: &str,
    category: Option<&str>,
    date: Option<&str>,
    account_id: Option<&str>,
    status: Option<&str>,
) -> Result<Transaction> {
    let trimmed_desc = description.trim();
    if trimmed_desc.is_empty() || !amount.is_finite() || amount < 0.0 {
        return Err(SynapseError::Validation(
            "Invalid description or amount".into(),
        ));
    }

    let valid_types = ["income", "expense", "transfer", "loan_made", "loan_taken"];
    if !valid_types.contains(&type_) {
        return Err(SynapseError::Validation(format!(
            "Unsupported type: {}",
            type_
        )));
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

    let resolved_status = status
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("completed");
    let is_paid_val = if resolved_status == "pending" { 0 } else { 1 };

    conn.execute(
        "INSERT INTO transactions (id, description, amount, type, category, date, status, account_id, is_paid, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, trimmed_desc, amount, type_, resolved_cat, resolved_date, resolved_status, resolved_acc_id, is_paid_val, now, now],
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
        person: None,
        created_at: Some(now.clone()),
        updated_at: Some(now),
    })
}

pub fn add_transaction_struct(
    conn: &rusqlite::Connection,
    mut transaction: Transaction,
) -> Result<Transaction> {
    validate_transaction(&transaction)?;
    let id = if transaction.id.trim().is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        transaction.id.trim().to_string()
    };
    let now = Utc::now().to_rfc3339();
    let created_at = transaction.created_at.unwrap_or_else(|| now.clone());
    let is_loan = matches!(transaction.type_.as_str(), "loan_made" | "loan_taken");
    let is_paid = transaction.is_paid.unwrap_or(if is_loan { 0 } else { 1 });
    let is_recurring = transaction.is_recurring.unwrap_or(0);
    let account_id = transaction
        .account_id
        .take()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| Some("default-wallet".to_owned()));
    let status = transaction.status.take().unwrap_or_else(|| {
        if is_loan {
            "in_progress".to_owned()
        } else if is_paid == 0 {
            "pending".to_owned()
        } else {
            "completed".to_owned()
        }
    });
    transaction.description = transaction.description.trim().to_owned();
    transaction.category = if transaction.category.trim().is_empty() {
        if transaction.type_ == "transfer" {
            "Transferência".to_owned()
        } else {
            "Geral".to_owned()
        }
    } else {
        transaction.category.trim().to_owned()
    };
    if transaction.date.trim().is_empty() {
        transaction.date = Utc::now().format("%Y-%m-%d").to_string();
    }
    transaction.person = transaction
        .person
        .take()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());

    conn.execute(
        "INSERT INTO transactions (
            id, description, amount, expected_amount, type, category, date, status, 
            is_paid, paid_amount, is_recurring, recurrence_period, due_date, 
            account_id, destination_account_id, linked_loan_id, person, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
            transaction.person,
            created_at,
            now,
        ],
    )?;

    transaction.id = id;
    transaction.created_at = Some(created_at);
    transaction.is_paid = Some(is_paid);
    transaction.is_recurring = Some(is_recurring);
    transaction.account_id = account_id;
    transaction.status = Some(status);
    transaction.updated_at = Some(now);
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

    if trimmed_desc.is_empty()
        || !amount.is_finite()
        || amount <= 0.0
        || from_id.is_empty()
        || to_id.is_empty()
        || from_id == to_id
    {
        return Err(SynapseError::Validation(
            "Invalid transfer parameters".into(),
        ));
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
        person: None,
        created_at: Some(now.clone()),
        updated_at: Some(now),
    })
}
