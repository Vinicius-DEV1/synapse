use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub initial_balance: Option<f64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Transaction {
    pub id: String,
    pub description: String,
    pub amount: f64,
    #[serde(rename = "type")]
    pub type_: String,
    pub category: String,
    pub date: String,
    pub status: Option<String>,
    pub is_paid: Option<i32>,
    pub paid_amount: Option<f64>,
    pub is_recurring: Option<i32>,
    pub recurrence_period: Option<String>,
    pub due_date: Option<String>,
    pub account_id: Option<String>,
    pub destination_account_id: Option<String>,
    pub linked_loan_id: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WishlistItem {
    pub id: String,
    pub title: String,
    pub price: f64,
    pub priority: String,
    pub category: Option<String>,
    pub expected_date: Option<String>,
    pub description: Option<String>,
    pub link: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[tauri::command]
pub fn finance_get_accounts(db_state: State<'_, DbState>) -> Result<Vec<Account>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare(
        "SELECT id, name, color, icon, initial_balance, created_at, updated_at, deleted_at 
         FROM finance_accounts 
         WHERE deleted_at IS NULL 
         ORDER BY created_at ASC"
    ).map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(Account {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                initial_balance: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                deleted_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }
    Ok(items)
}

#[tauri::command]
pub fn finance_add_account(
    account: Account,
    db_state: State<'_, DbState>,
) -> Result<Account, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = if account.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        account.id.clone()
    };

    let color = account.color.unwrap_or_else(|| "#10b981".to_string());
    let icon = account.icon.unwrap_or_else(|| "wallet".to_string());
    let initial_balance = account.initial_balance.unwrap_or(0.0);

    conn.execute(
        "INSERT INTO finance_accounts (id, name, color, icon, initial_balance) VALUES (?, ?, ?, ?, ?)",
        params![id, account.name, color, icon, initial_balance],
    ).map_err(|e| e.to_string())?;

    let mut ret = account;
    ret.id = id;
    ret.color = Some(color);
    ret.icon = Some(icon);
    ret.initial_balance = Some(initial_balance);
    Ok(ret)
}

#[tauri::command]
pub fn finance_update_account(
    account: Account,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let color = account.color.unwrap_or_else(|| "#10b981".to_string());
    let icon = account.icon.unwrap_or_else(|| "wallet".to_string());
    let initial_balance = account.initial_balance.unwrap_or(0.0);

    let count = conn.execute(
        "UPDATE finance_accounts 
         SET name = ?, color = ?, icon = ?, initial_balance = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?",
        params![account.name, color, icon, initial_balance, account.id],
    ).map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn finance_delete_account(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("UPDATE finance_accounts SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub fn finance_get_transactions(db_state: State<'_, DbState>) -> Result<Vec<Transaction>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare(
        "SELECT id, description, amount, type, category, date, status, is_paid, paid_amount, is_recurring, recurrence_period, due_date, account_id, destination_account_id, linked_loan_id, created_at 
         FROM transactions 
         WHERE deleted_at IS NULL 
         ORDER BY date DESC, created_at DESC"
    ).map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(Transaction {
                id: row.get(0)?,
                description: row.get(1)?,
                amount: row.get(2)?,
                type_: row.get(3)?,
                category: row.get(4)?,
                date: row.get(5)?,
                status: row.get(6)?,
                is_paid: row.get(7)?,
                paid_amount: row.get(8)?,
                is_recurring: row.get(9)?,
                recurrence_period: row.get(10)?,
                due_date: row.get(11)?,
                account_id: row.get(12)?,
                destination_account_id: row.get(13)?,
                linked_loan_id: row.get(14)?,
                created_at: row.get(15)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }
    Ok(items)
}

#[tauri::command]
pub fn finance_add_transaction(
    transaction: Transaction,
    db_state: State<'_, DbState>,
) -> Result<Transaction, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = if transaction.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        transaction.id.clone()
    };

    let status = transaction.status.clone().unwrap_or_else(|| "completed".to_string());
    let is_recurring = transaction.is_recurring.unwrap_or(0);
    let is_paid = transaction.is_paid.unwrap_or(1);
    let paid_amount = transaction.paid_amount.unwrap_or(0.0);
    let account_id = transaction.account_id.clone().unwrap_or_else(|| "default-wallet".to_string());

    conn.execute(
        "INSERT INTO transactions (id, description, amount, type, category, date, status, is_paid, paid_amount, is_recurring, recurrence_period, due_date, account_id, destination_account_id, linked_loan_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            id,
            transaction.description,
            transaction.amount,
            transaction.type_,
            transaction.category,
            transaction.date,
            status,
            is_paid,
            paid_amount,
            is_recurring,
            transaction.recurrence_period,
            transaction.due_date,
            account_id,
            transaction.destination_account_id,
            transaction.linked_loan_id
        ]
    ).map_err(|e| e.to_string())?;

    let mut ret = transaction;
    ret.id = id;
    ret.status = Some(status);
    ret.is_paid = Some(is_paid);
    ret.paid_amount = Some(paid_amount);
    ret.account_id = Some(account_id);
    Ok(ret)
}

#[tauri::command]
pub fn finance_update_transaction(
    transaction: Transaction,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let is_recurring = transaction.is_recurring.unwrap_or(0);
    let is_paid = transaction.is_paid.unwrap_or(1);
    let paid_amount = transaction.paid_amount.unwrap_or(0.0);
    let status = transaction.status.clone().unwrap_or_else(|| "completed".to_string());
    let account_id = transaction.account_id.clone().unwrap_or_else(|| "default-wallet".to_string());

    let count = conn.execute(
        "UPDATE transactions 
         SET description = ?, amount = ?, type = ?, category = ?, date = ?, status = ?, is_paid = ?, paid_amount = ?, is_recurring = ?, recurrence_period = ?, due_date = ?, account_id = ?, destination_account_id = ?, linked_loan_id = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?",
        params![
            transaction.description,
            transaction.amount,
            transaction.type_,
            transaction.category,
            transaction.date,
            status,
            is_paid,
            paid_amount,
            is_recurring,
            transaction.recurrence_period,
            transaction.due_date,
            account_id,
            transaction.destination_account_id,
            transaction.linked_loan_id,
            transaction.id
        ]
    ).map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn finance_delete_transaction(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("UPDATE transactions SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub fn finance_get_wishlist(db_state: State<'_, DbState>) -> Result<Vec<WishlistItem>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let mut stmt = conn.prepare(
        "SELECT id, title, price, priority, category, expected_date, description, link, created_at, updated_at 
         FROM wishlist 
         WHERE deleted_at IS NULL 
         ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(WishlistItem {
                id: row.get(0)?,
                title: row.get(1)?,
                price: row.get(2)?,
                priority: row.get(3)?,
                category: row.get(4)?,
                expected_date: row.get(5)?,
                description: row.get(6)?,
                link: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i {
            items.push(item);
        }
    }
    Ok(items)
}

#[tauri::command]
pub fn finance_add_wishlist(
    item: WishlistItem,
    db_state: State<'_, DbState>,
) -> Result<WishlistItem, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let id = if item.id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        item.id.clone()
    };

    conn.execute(
        "INSERT INTO wishlist (id, title, price, priority, category, expected_date, description, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, item.title, item.price, item.priority, item.category, item.expected_date, item.description, item.link]
    ).map_err(|e| e.to_string())?;

    let mut ret = item;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn finance_update_wishlist(
    item: WishlistItem,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    let count = conn.execute(
        "UPDATE wishlist SET title = ?, price = ?, priority = ?, category = ?, expected_date = ?, description = ?, link = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![item.title, item.price, item.priority, item.category, item.expected_date, item.description, item.link, item.id]
    ).map_err(|e| e.to_string())?;

    Ok(count as i32)
}

#[tauri::command]
pub fn finance_delete_wishlist(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;

    conn.execute("UPDATE wishlist SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

