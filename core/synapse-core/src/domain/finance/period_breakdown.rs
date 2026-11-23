//! Period-scoped financial summary & category breakdown calculator matching React DashboardMetrics.

use super::summary::get_financial_summary_for;
use super::{transactions, FinancialSummary};
use crate::db::Database;
use crate::error::{Result, SynapseError};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CategoryBreakdownItem {
    pub category: String,
    pub amount: f64,
    pub percentage: f64,
    pub count: usize,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PeriodDashboardMetrics {
    pub summary: FinancialSummary,
    pub expense_by_category: Vec<CategoryBreakdownItem>,
    pub income_by_category: Vec<CategoryBreakdownItem>,
}

fn aggregate_categories(map: HashMap<String, (f64, usize)>, total: f64) -> Vec<CategoryBreakdownItem> {
    let mut items: Vec<CategoryBreakdownItem> = map
        .into_iter()
        .map(|(category, (amount, count))| CategoryBreakdownItem {
            category,
            amount,
            percentage: if total > 0.0 {
                ((amount / total) * 1000.0).round() / 10.0
            } else {
                0.0
            },
            count,
        })
        .collect();
    items.sort_by(|a, b| b.amount.partial_cmp(&a.amount).unwrap_or(std::cmp::Ordering::Equal));
    items
}

/// Computes period summary and sorted income/expense category breakdowns.
pub fn get_period_dashboard_metrics(
    db: &Database,
    account_id: Option<&str>,
    period: Option<&str>,
) -> Result<PeriodDashboardMetrics> {
    let summary = get_financial_summary_for(db, account_id, period)?;
    let conn = db.lock().map_err(SynapseError::Database)?;
    let txs = transactions::get_transactions(&conn, None, account_id)?;
    let scoped_period = period
        .map(str::trim)
        .filter(|v| v.len() == 7 && v.as_bytes()[4] == b'-');

    let mut exp_map: HashMap<String, (f64, usize)> = HashMap::new();
    let mut inc_map: HashMap<String, (f64, usize)> = HashMap::new();
    let mut exp_total = 0.0;
    let mut inc_total = 0.0;

    for tx in txs {
        if tx.is_paid == Some(0) || tx.status.as_deref() == Some("pending") {
            continue;
        }
        if scoped_period.is_some_and(|m| !tx.date.starts_with(m)) {
            continue;
        }
        let cat = if tx.category.trim().is_empty() {
            "Geral".to_string()
        } else {
            tx.category.trim().to_string()
        };
        match tx.type_.as_str() {
            "expense" => {
                exp_total += tx.amount;
                let e = exp_map.entry(cat).or_insert((0.0, 0));
                e.0 += tx.amount;
                e.1 += 1;
            }
            "income" => {
                inc_total += tx.amount;
                let e = inc_map.entry(cat).or_insert((0.0, 0));
                e.0 += tx.amount;
                e.1 += 1;
            }
            _ => {}
        }
    }

    Ok(PeriodDashboardMetrics {
        summary,
        expense_by_category: aggregate_categories(exp_map, exp_total),
        income_by_category: aggregate_categories(inc_map, inc_total),
    })
}
