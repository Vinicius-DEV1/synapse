use super::{accounts, transactions, wishlist, Transaction, WishlistItem};
use crate::db::Database;
use crate::error::{Result, SynapseError};

/// Confirms a pending cashflow row, which changes its effect on account balances.
pub fn confirm_pending_transaction(database: &Database, transaction_id: &str) -> Result<()> {
    confirm_pending_transaction_with_details(database, transaction_id, None, None, None, None, None)
}

/// Confirms a pending cashflow row with updated final parameters on an open database transaction.
pub fn confirm_pending_transaction_conn(
    conn: &rusqlite::Connection,
    transaction_id: &str,
    amount: Option<f64>,
    date: Option<&str>,
    account_id: Option<&str>,
    description: Option<&str>,
    category: Option<&str>,
) -> Result<()> {
    let transaction_id = transaction_id.trim();
    if transaction_id.is_empty() {
        return Err(SynapseError::Validation(
            "Transaction ID cannot be empty".into(),
        ));
    }
    let mut item = transactions::get_transactions(conn, None, None)?
        .into_iter()
        .find(|item| item.id == transaction_id)
        .ok_or_else(|| SynapseError::NotFound(format!("Transaction {transaction_id} not found")))?;
    if !matches!(item.type_.as_str(), "income" | "expense" | "transfer") {
        return Err(SynapseError::Validation(
            "Only regular cashflow transactions can be confirmed".into(),
        ));
    }
    if item.status.as_deref() != Some("pending") && item.is_paid != Some(0) {
        return Err(SynapseError::Validation(
            "Transaction is not pending".into(),
        ));
    }

    if let Some(amt) = amount {
        if !amt.is_finite() || amt < 0.0 {
            return Err(SynapseError::Validation("Invalid transaction amount".into()));
        }
        item.amount = amt;
    }
    if let Some(d) = date {
        let d_trimmed = d.trim();
        if !d_trimmed.is_empty() {
            item.date = d_trimmed.to_owned();
        }
    }
    if let Some(acc) = account_id {
        let acc_trimmed = acc.trim();
        if !acc_trimmed.is_empty() {
            item.account_id = Some(acc_trimmed.to_owned());
        }
    }
    if let Some(desc) = description {
        let desc_trimmed = desc.trim();
        if !desc_trimmed.is_empty() {
            item.description = desc_trimmed.to_owned();
        }
    }
    if let Some(cat) = category {
        let cat_trimmed = cat.trim();
        if !cat_trimmed.is_empty() {
            item.category = cat_trimmed.to_owned();
        }
    }

    item.status = Some("completed".to_owned());
    item.is_paid = Some(1);
    if transactions::update_transaction_struct(conn, item)? != 1 {
        return Err(SynapseError::NotFound(format!(
            "Transaction {transaction_id} not found"
        )));
    }
    Ok(())
}

/// Confirms a pending cashflow row with updated final parameters (amount, date, account, description, category).
pub fn confirm_pending_transaction_with_details(
    database: &Database,
    transaction_id: &str,
    amount: Option<f64>,
    date: Option<&str>,
    account_id: Option<&str>,
    description: Option<&str>,
    category: Option<&str>,
) -> Result<()> {
    let mut connection = database.lock().map_err(SynapseError::Database)?;
    let transaction = connection.transaction()?;
    confirm_pending_transaction_conn(
        &transaction,
        transaction_id,
        amount,
        date,
        account_id,
        description,
        category,
    )?;
    transaction.commit()?;
    Ok(())
}

/// Updates a transaction and reconciles any linked loan aggregate in one commit.
pub fn update_transaction_with_links(
    database: &Database,
    updated: Transaction,
) -> Result<Transaction> {
    let id = updated.id.trim().to_owned();
    if id.is_empty() {
        return Err(SynapseError::Validation(
            "Transaction ID cannot be empty".into(),
        ));
    }
    let mut connection = database.lock().map_err(SynapseError::Database)?;
    let transaction = connection.transaction()?;
    let existing_items = transactions::get_transactions(&transaction, None, None)?;
    let existing = existing_items
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or_else(|| SynapseError::NotFound(format!("Transaction {id} not found")))?;

    if existing.linked_loan_id.is_some()
        && (updated.linked_loan_id != existing.linked_loan_id
            || updated.type_ != existing.type_
            || updated.status.as_deref() != Some("completed")
            || updated.is_paid == Some(0))
    {
        return Err(SynapseError::Validation(
            "Linked loan payments must remain completed cashflow rows".into(),
        ));
    }

    let linked_payments: Vec<&Transaction> = existing_items
        .iter()
        .filter(|item| item.linked_loan_id.as_deref() == Some(id.as_str()))
        .collect();
    if !linked_payments.is_empty()
        && matches!(existing.type_.as_str(), "loan_made" | "loan_taken")
        && !matches!(updated.type_.as_str(), "loan_made" | "loan_taken")
    {
        return Err(SynapseError::Validation(
            "A loan with recorded payments cannot be changed into a regular transaction".into(),
        ));
    }

    if let Some(parent_id) = existing.linked_loan_id.as_deref() {
        if (updated.amount * 100.0).round() as i128 != (existing.amount * 100.0).round() as i128 {
            if let Some(mut parent) = existing_items
                .iter()
                .find(|item| item.id == parent_id)
                .cloned()
            {
                if matches!(parent.type_.as_str(), "loan_made" | "loan_taken") {
                    let adjusted_paid = ((parent.paid_amount.unwrap_or(0.0) * 100.0).round()
                        as i128
                        + (updated.amount * 100.0).round() as i128
                        - (existing.amount * 100.0).round() as i128)
                        .max(0);
                    parent.paid_amount = Some(adjusted_paid as f64 / 100.0);
                    refresh_loan_status(&mut parent);
                    transactions::update_transaction_struct(&transaction, parent)?;
                }
            }
        }
    }

    if matches!(existing.type_.as_str(), "loan_made" | "loan_taken")
        && (existing.description != updated.description || existing.type_ != updated.type_)
    {
        let is_receivable = updated.type_ == "loan_made";
        for mut payment in existing_items
            .iter()
            .filter(|item| item.linked_loan_id.as_deref() == Some(id.as_str()))
            .cloned()
        {
            if existing.description != updated.description {
                payment.description = format!(
                    "{}: {}",
                    if is_receivable {
                        "Recebimento"
                    } else {
                        "Pagamento"
                    },
                    updated.description
                );
            }
            if existing.type_ != updated.type_ {
                payment.type_ = if is_receivable { "income" } else { "expense" }.to_owned();
                payment.category = if is_receivable {
                    "Recebimento de Empréstimo"
                } else {
                    "Pagamento de Dívida"
                }
                .to_owned();
            }
            transactions::update_transaction_struct(&transaction, payment)?;
        }
    }

    if transactions::update_transaction_struct(&transaction, updated)? != 1 {
        return Err(SynapseError::NotFound(format!(
            "Transaction {id} not found"
        )));
    }
    let result = transactions::get_transactions(&transaction, None, None)?
        .into_iter()
        .find(|item| item.id == id)
        .ok_or_else(|| SynapseError::NotFound(format!("Transaction {id} not found")))?;
    transaction.commit()?;
    Ok(result)
}

/// Soft-deletes a transaction and rolls linked loan payments back atomically.
pub fn delete_transaction_with_links(database: &Database, transaction_id: &str) -> Result<bool> {
    let transaction_id = transaction_id.trim();
    if transaction_id.is_empty() {
        return Err(SynapseError::Validation(
            "Transaction ID cannot be empty".into(),
        ));
    }
    let mut connection = database.lock().map_err(SynapseError::Database)?;
    let transaction = connection.transaction()?;
    let existing_items = transactions::get_transactions(&transaction, None, None)?;
    let Some(item) = existing_items
        .iter()
        .find(|item| item.id == transaction_id)
        .cloned()
    else {
        return Ok(false);
    };

    if let Some(parent_id) = item.linked_loan_id.as_deref() {
        if let Some(mut parent) = existing_items
            .iter()
            .find(|item| item.id == parent_id)
            .cloned()
        {
            if matches!(parent.type_.as_str(), "loan_made" | "loan_taken") {
                let adjusted_paid = ((parent.paid_amount.unwrap_or(0.0) * 100.0).round() as i128
                    - (item.amount * 100.0).round() as i128)
                    .max(0);
                parent.paid_amount = Some(adjusted_paid as f64 / 100.0);
                refresh_loan_status(&mut parent);
                transactions::update_transaction_struct(&transaction, parent)?;
            }
        }
    }

    let deleted = transactions::delete_transaction(&transaction, transaction_id)?;
    transaction.commit()?;
    Ok(deleted)
}

fn refresh_loan_status(loan: &mut Transaction) {
    let total_cents = (loan.expected_amount.unwrap_or(loan.amount) * 100.0).round() as i128;
    let paid_cents = (loan.paid_amount.unwrap_or(0.0) * 100.0).round() as i128;
    let is_paid = total_cents > 0 && paid_cents >= total_cents;
    loan.is_paid = Some(i32::from(is_paid));
    loan.status = Some(if is_paid { "completed" } else { "in_progress" }.to_owned());
}

/// Creates the purchase expense and optionally archives the wish item atomically.
pub fn acquire_wishlist_item(
    database: &Database,
    wishlist_id: &str,
    description: &str,
    amount: f64,
    account_id: &str,
    category: &str,
    date: &str,
    remove_from_list: bool,
) -> Result<Transaction> {
    let wishlist_id = wishlist_id.trim();
    let description = description.trim();
    let account_id = account_id.trim();
    let category = category.trim();
    let date = date.trim();
    if wishlist_id.is_empty()
        || description.is_empty()
        || account_id.is_empty()
        || !amount.is_finite()
        || amount <= 0.0
        || !is_valid_date(date)
    {
        return Err(SynapseError::Validation(
            "Invalid wishlist acquisition parameters".into(),
        ));
    }

    let mut connection = database.lock().map_err(SynapseError::Database)?;
    let transaction = connection.transaction()?;
    let item: WishlistItem = wishlist::get_wishlist(&transaction)?
        .into_iter()
        .find(|item| item.id == wishlist_id)
        .ok_or_else(|| SynapseError::NotFound(format!("Wishlist item {wishlist_id} not found")))?;
    if !accounts::get_accounts(&transaction)?
        .iter()
        .any(|account| account.id == account_id)
    {
        return Err(SynapseError::NotFound(format!(
            "Account {account_id} not found"
        )));
    }

    let expense = transactions::add_transaction_struct(
        &transaction,
        Transaction {
            description: description.to_owned(),
            amount,
            type_: "expense".to_owned(),
            category: if category.is_empty() {
                item.category.unwrap_or_else(|| "Geral".to_owned())
            } else {
                category.to_owned()
            },
            date: date.to_owned(),
            status: Some("completed".to_owned()),
            is_paid: Some(1),
            account_id: Some(account_id.to_owned()),
            ..Transaction::default()
        },
    )?;
    if remove_from_list && !wishlist::delete_wishlist_item(&transaction, wishlist_id)? {
        return Err(SynapseError::NotFound(format!(
            "Wishlist item {wishlist_id} not found"
        )));
    }
    transaction.commit()?;
    Ok(expense)
}

pub(super) fn is_valid_date(date: &str) -> bool {
    chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d").is_ok()
}
