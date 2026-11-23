use super::models::{Account, FinancialSummary};
use std::collections::HashMap;

/// Calculates current balance for accounts given initial balances and a transaction delta map.
pub fn apply_balance_deltas(accounts: &mut [Account], deltas: &HashMap<String, f64>) {
    for acc in accounts.iter_mut() {
        let initial = acc.initial_balance.unwrap_or(0.0);
        let delta = deltas.get(&acc.id).copied().unwrap_or(0.0);
        acc.current_balance = Some(initial + delta);
    }
}

/// Accumulates transaction effect into an account delta hashmap.
pub fn accumulate_transaction_delta(
    deltas: &mut HashMap<String, f64>,
    acc_id: &str,
    dest_id: Option<&str>,
    tx_type: &str,
    amount: f64,
) {
    let resolved_acc = if acc_id.is_empty() {
        "default-wallet"
    } else {
        acc_id
    };

    match tx_type {
        "income" => {
            *deltas.entry(resolved_acc.to_string()).or_insert(0.0) += amount;
        }
        "expense" => {
            *deltas.entry(resolved_acc.to_string()).or_insert(0.0) -= amount;
        }
        "transfer" => {
            *deltas.entry(resolved_acc.to_string()).or_insert(0.0) -= amount;
            if let Some(dest) = dest_id.filter(|s| !s.is_empty()) {
                *deltas.entry(dest.to_string()).or_insert(0.0) += amount;
            }
        }
        "loan_made" => {
            *deltas.entry(resolved_acc.to_string()).or_insert(0.0) -= amount;
        }
        "loan_taken" => {
            *deltas.entry(resolved_acc.to_string()).or_insert(0.0) += amount;
        }
        _ => {}
    }
}

/// Summarizes income, expense, delta balance and total current balance.
pub fn build_financial_summary(
    income: f64,
    expense: f64,
    accounts: &[Account],
) -> FinancialSummary {
    let total_balance: f64 = accounts
        .iter()
        .map(|acc| acc.current_balance.unwrap_or(0.0))
        .sum();

    FinancialSummary {
        income,
        expense,
        balance: income - expense,
        total_balance,
    }
}
