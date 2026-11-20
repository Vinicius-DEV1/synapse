use super::super::models::Transaction;
use crate::error::Result;

pub fn get_transactions(
    conn: &rusqlite::Connection,
    type_filter: Option<&str>,
    account_filter: Option<&str>,
) -> Result<Vec<Transaction>> {
    let mut sql = String::from(
        "SELECT id, description, amount, expected_amount, type, category, date, status, 
                is_paid, paid_amount, is_recurring, recurrence_period, due_date, 
                account_id, destination_account_id, linked_loan_id, created_at, updated_at, person 
         FROM transactions 
         WHERE deleted_at IS NULL ",
    );

    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

    if let Some(t) = type_filter
        .map(|s| s.trim())
        .filter(|s| !s.is_empty() && *s != "all")
    {
        sql.push_str("AND type = ? ");
        params_vec.push(rusqlite::types::Value::Text(t.to_string()));
    }

    if let Some(acc) = account_filter
        .map(|s| s.trim())
        .filter(|s| !s.is_empty() && *s != "all")
    {
        sql.push_str("AND (account_id = ? OR destination_account_id = ?) ");
        params_vec.push(rusqlite::types::Value::Text(acc.to_string()));
        params_vec.push(rusqlite::types::Value::Text(acc.to_string()));
    }

    sql.push_str("ORDER BY date DESC, created_at DESC");

    let mut stmt = conn.prepare(&sql)?;
    let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec
        .iter()
        .map(|v| v as &dyn rusqlite::ToSql)
        .collect();

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
                person: row.get(18)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(txs)
}
