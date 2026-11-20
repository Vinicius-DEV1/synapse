use super::{transactions, Transaction};
use crate::db::Database;
use crate::error::{Result, SynapseError};
use chrono::Utc;

/// Saves a loan payment and updates its loan total in one SQLite transaction.
pub fn record_loan_payment(
    database: &Database,
    loan_id: &str,
    amount: Option<f64>,
    account_id: &str,
    payment_date: Option<&str>,
) -> Result<Transaction> {
    let loan_id = loan_id.trim();
    let account_id = account_id.trim();
    if loan_id.is_empty()
        || account_id.is_empty()
        || amount.is_some_and(|value| !value.is_finite() || value <= 0.0)
        || payment_date.is_some_and(|date| {
            !date.trim().is_empty() && !super::operations::is_valid_date(date.trim())
        })
    {
        return Err(SynapseError::Validation(
            "Invalid loan payment parameters".into(),
        ));
    }

    let mut connection = database.lock().map_err(SynapseError::Database)?;
    let transaction = connection.transaction()?;
    if !super::accounts::get_accounts(&transaction)?
        .iter()
        .any(|account| account.id == account_id)
    {
        return Err(SynapseError::NotFound(format!(
            "Account {account_id} not found"
        )));
    }
    let mut loan = transactions::get_transactions(&transaction, None, None)?
        .into_iter()
        .find(|item| item.id == loan_id)
        .ok_or_else(|| SynapseError::NotFound(format!("Loan {loan_id} not found")))?;
    if !matches!(loan.type_.as_str(), "loan_made" | "loan_taken") {
        return Err(SynapseError::Validation(
            "The selected transaction is not a loan".into(),
        ));
    }

    let target_cents = cents(loan.expected_amount.unwrap_or(loan.amount));
    let paid_cents = cents(loan.paid_amount.unwrap_or(0.0));
    let pending_cents = target_cents.saturating_sub(paid_cents);
    let payment_cents = amount.map(cents).unwrap_or(pending_cents);
    if payment_cents == 0 || payment_cents > pending_cents {
        return Err(SynapseError::Validation(
            "Payment amount exceeds the remaining loan balance".into(),
        ));
    }

    let received = loan.type_ == "loan_made";
    let label = loan
        .person
        .as_deref()
        .filter(|person| !person.trim().is_empty())
        .unwrap_or(&loan.description);
    let payment = Transaction {
        description: format!(
            "{}: {label}",
            if received { "Recebimento" } else { "Pagamento" }
        ),
        amount: payment_cents as f64 / 100.0,
        type_: if received { "income" } else { "expense" }.to_owned(),
        category: if received {
            "Recebimento de Empréstimo"
        } else {
            "Pagamento de Dívida"
        }
        .to_owned(),
        date: payment_date
            .map(str::trim)
            .filter(|date| !date.is_empty())
            .map(str::to_owned)
            .unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string()),
        status: Some("completed".to_owned()),
        is_paid: Some(1),
        paid_amount: Some(payment_cents as f64 / 100.0),
        account_id: Some(account_id.to_owned()),
        linked_loan_id: Some(loan_id.to_owned()),
        person: loan.person.clone(),
        ..Transaction::default()
    };
    let saved_payment = transactions::add_transaction_struct(&transaction, payment)?;

    let updated_paid = paid_cents + payment_cents;
    loan.paid_amount = Some(updated_paid as f64 / 100.0);
    loan.is_paid = Some(i32::from(target_cents > 0 && updated_paid >= target_cents));
    loan.status = Some(
        if loan.is_paid == Some(1) {
            "completed"
        } else {
            "in_progress"
        }
        .to_owned(),
    );
    if transactions::update_transaction_struct(&transaction, loan)? != 1 {
        return Err(SynapseError::NotFound(format!("Loan {loan_id} not found")));
    }

    transaction.commit()?;
    Ok(saved_payment)
}

/// Reopens a loan by archiving its linked payments and restoring its unpaid state.
pub fn reopen_loan(database: &Database, loan_id: &str) -> Result<()> {
    let loan_id = loan_id.trim();
    if loan_id.is_empty() {
        return Err(SynapseError::Validation("Loan ID cannot be empty".into()));
    }
    let mut connection = database.lock().map_err(SynapseError::Database)?;
    let transaction = connection.transaction()?;
    let mut loan = transactions::get_transactions(&transaction, None, None)?
        .into_iter()
        .find(|item| item.id == loan_id)
        .ok_or_else(|| SynapseError::NotFound(format!("Loan {loan_id} not found")))?;
    if !matches!(loan.type_.as_str(), "loan_made" | "loan_taken") {
        return Err(SynapseError::Validation(
            "The selected transaction is not a loan".into(),
        ));
    }
    let linked_payment_ids: Vec<String> = transactions::get_transactions(&transaction, None, None)?
        .into_iter()
        .filter(|item| item.linked_loan_id.as_deref() == Some(loan_id))
        .map(|item| item.id)
        .collect();
    for payment_id in linked_payment_ids {
        transactions::delete_transaction(&transaction, &payment_id)?;
    }
    loan.paid_amount = Some(0.0);
    loan.is_paid = Some(0);
    loan.status = Some("in_progress".to_owned());
    if transactions::update_transaction_struct(&transaction, loan)? != 1 {
        return Err(SynapseError::NotFound(format!("Loan {loan_id} not found")));
    }
    transaction.commit()?;
    Ok(())
}

fn cents(amount: f64) -> u64 {
    (amount * 100.0).round().clamp(0.0, u64::MAX as f64) as u64
}
