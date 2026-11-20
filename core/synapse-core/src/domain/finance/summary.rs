use super::calculations::build_financial_summary;
use super::{accounts, transactions, FinancialSummary};
use crate::db::Database;
use crate::error::Result;

/// Calculates the React finance metrics for an optional account and YYYY-MM period.
pub fn get_financial_summary_for(
    database: &Database,
    account_id: Option<&str>,
    period: Option<&str>,
) -> Result<FinancialSummary> {
    let connection = database
        .lock()
        .map_err(crate::error::SynapseError::Database)?;
    let accounts = accounts::get_accounts(&connection)?;
    let transactions = transactions::get_transactions(&connection, None, account_id)?;
    let scoped_account = account_id
        .map(str::trim)
        .filter(|id| !id.is_empty() && *id != "all");
    let scoped_period = period
        .map(str::trim)
        .filter(|value| value.len() == 7 && value.as_bytes()[4] == b'-');
    let mut income_cents: i128 = 0;
    let mut expense_cents: i128 = 0;

    for transaction in transactions {
        if transaction.is_paid == Some(0) || transaction.status.as_deref() == Some("pending") {
            continue;
        }
        if scoped_period.is_some_and(|month| !transaction.date.starts_with(month)) {
            continue;
        }

        let amount_cents = (transaction.amount * 100.0).round() as i128;
        let source_account = transaction
            .account_id
            .as_deref()
            .filter(|id| !id.is_empty())
            .unwrap_or("default-wallet");
        match transaction.type_.as_str() {
            "income" if scoped_account.is_none() || scoped_account == Some(source_account) => {
                income_cents += amount_cents
            }
            "expense" if scoped_account.is_none() || scoped_account == Some(source_account) => {
                expense_cents += amount_cents
            }
            "transfer" if scoped_account.is_some() => {
                if transaction.destination_account_id.as_deref() == scoped_account {
                    income_cents += amount_cents;
                }
                if source_account == scoped_account.unwrap_or_default() {
                    expense_cents += amount_cents;
                }
            }
            _ => {}
        }
    }

    let income = income_cents as f64 / 100.0;
    let expense = expense_cents as f64 / 100.0;
    if let Some(account_id) = scoped_account {
        let balance = accounts
            .iter()
            .find(|account| account.id == account_id)
            .and_then(|account| account.current_balance)
            .unwrap_or(0.0);
        Ok(FinancialSummary {
            income,
            expense,
            balance: income - expense,
            total_balance: balance,
        })
    } else {
        Ok(build_financial_summary(income, expense, &accounts))
    }
}
