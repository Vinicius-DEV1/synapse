use super::FinanceRepository;
use crate::db::Database;
use crate::domain::finance::{calculations, FinancialSummary};
use crate::error::{Result, SynapseError};

impl FinanceRepository {
    // --- Summary ---
    pub fn get_financial_summary(db: &Database) -> Result<FinancialSummary> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::get_financial_summary_conn(&conn)
    }

    pub fn get_financial_summary_conn(conn: &rusqlite::Connection) -> Result<FinancialSummary> {
        let mut stmt = conn.prepare(
            "SELECT type, SUM(amount) as total FROM transactions 
             WHERE deleted_at IS NULL 
               AND (status IS NULL OR status != 'pending') 
               AND (is_paid IS NULL OR is_paid != 0) 
             GROUP BY type",
        )?;

        let mut income = 0.0;
        let mut expense = 0.0;

        let rows = stmt.query_map([], |row| {
            let t: String = row.get(0)?;
            let total: f64 = row.get(1)?;
            Ok((t, total))
        })?;

        for r in rows {
            let (t, total) = r?;
            if t == "income" {
                income += total;
            } else if t == "expense" {
                expense += total;
            }
        }

        drop(stmt);

        let accounts = Self::get_accounts_conn(conn)?;
        Ok(calculations::build_financial_summary(
            income, expense, &accounts,
        ))
    }
}
