use super::super::models::Transaction;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;

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

    if trimmed_id.is_empty()
        || trimmed_desc.is_empty()
        || !amount.is_finite()
        || amount < 0.0
        || !supported_types.contains(&type_)
    {
        return Err(SynapseError::Validation(
            "Invalid transaction parameters".into(),
        ));
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
        let dest = destination_account_id
            .map(|s| s.trim())
            .filter(|s| !s.is_empty());

        conn.execute(
            "UPDATE transactions SET description = ?1, amount = ?2, type = ?3, category = ?4, date = ?5, 
                    account_id = ?6, destination_account_id = ?7, updated_at = ?8 
             WHERE id = ?9 AND deleted_at IS NULL",
            params![trimmed_desc, amount, type_, resolved_category, d, acc, dest, now, trimmed_id],
        )?
    };

    if count == 0 {
        return Err(SynapseError::NotFound(format!(
            "Transaction {} not found",
            trimmed_id
        )));
    }

    Ok(())
}

pub fn update_transaction_struct(
    conn: &rusqlite::Connection,
    transaction: Transaction,
) -> Result<i32> {
    validate_transaction(&transaction)?;
    let transaction_id = transaction.id.trim();
    if transaction_id.is_empty() {
        return Err(SynapseError::Validation(
            "Transaction ID cannot be empty".into(),
        ));
    }
    let is_loan = matches!(transaction.type_.as_str(), "loan_made" | "loan_taken");
    let is_paid = transaction.is_paid.unwrap_or(if is_loan { 0 } else { 1 });
    let is_recurring = transaction.is_recurring.unwrap_or(0);
    let account_id = transaction
        .account_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .or_else(|| Some("default-wallet".to_owned()));
    let status = transaction.status.unwrap_or_else(|| {
        if is_loan {
            "in_progress".to_owned()
        } else if is_paid == 0 {
            "pending".to_owned()
        } else {
            "completed".to_owned()
        }
    });
    let person = transaction
        .person
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    let count = conn.execute(
        "UPDATE transactions 
         SET description = ?, amount = ?, expected_amount = ?, type = ?, category = ?, date = ?, status = ?, 
             is_paid = ?, paid_amount = ?, is_recurring = ?, recurrence_period = ?, due_date = ?, 
             account_id = ?, destination_account_id = ?, linked_loan_id = ?, person = ?, updated_at = ? 
         WHERE id = ? AND deleted_at IS NULL",
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
            person,
            Utc::now().to_rfc3339(),
            transaction_id,
        ],
    )?;

    Ok(count as i32)
}

pub(super) fn validate_transaction(transaction: &Transaction) -> Result<()> {
    const MAX_CURRENCY_AMOUNT: f64 = i64::MAX as f64 / 100.0;
    const SUPPORTED_TYPES: [&str; 5] = ["income", "expense", "transfer", "loan_made", "loan_taken"];
    if transaction.description.trim().is_empty()
        || !transaction.amount.is_finite()
        || transaction.amount <= 0.0
        || transaction.amount > MAX_CURRENCY_AMOUNT
        || !SUPPORTED_TYPES.contains(&transaction.type_.as_str())
    {
        return Err(SynapseError::Validation(
            "Invalid transaction description, amount, or type".into(),
        ));
    }

    for (field, amount) in [
        ("expected amount", transaction.expected_amount),
        ("paid amount", transaction.paid_amount),
    ] {
        if amount
            .is_some_and(|value| !value.is_finite() || value < 0.0 || value > MAX_CURRENCY_AMOUNT)
        {
            return Err(SynapseError::Validation(format!(
                "Transaction {field} must be finite and non-negative"
            )));
        }
    }

    if matches!(transaction.type_.as_str(), "loan_made" | "loan_taken")
        && transaction.expected_amount.unwrap_or(transaction.amount)
            < transaction.paid_amount.unwrap_or(0.0)
    {
        return Err(SynapseError::Validation(
            "Loan total cannot be less than its amount already paid".into(),
        ));
    }

    if transaction.type_ == "transfer" {
        let source = transaction.account_id.as_deref().unwrap_or_default().trim();
        let destination = transaction
            .destination_account_id
            .as_deref()
            .unwrap_or_default()
            .trim();
        if source.is_empty() || destination.is_empty() || source == destination {
            return Err(SynapseError::Validation(
                "A transfer requires two different accounts".into(),
            ));
        }
    }
    Ok(())
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
        params![now, now, trimmed_id],
    )?;

    Ok(count > 0)
}
