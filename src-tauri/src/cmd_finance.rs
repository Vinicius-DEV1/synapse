use tauri::State;
use serde::{Deserialize, Serialize};
use crate::db::DbState;
use rusqlite::params;

#[derive(Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub description: String,
    pub amount: f64,
    pub type_: String,
    pub category: String,
    pub date: String,
    pub is_recurring: i32,
    pub recurrence_period: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct WishlistItem {
    pub id: String,
    pub title: String,
    pub price: f64,
    pub priority: String,
    pub category: Option<String>,
    pub expected_date: Option<String>,
    pub description: Option<String>,
    pub link: Option<String>,
}

#[tauri::command]
pub fn finance_get_transactions(db_state: State<'_, DbState>) -> Result<Vec<Transaction>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT id, description, amount, type, category, date, is_recurring, recurrence_period FROM transactions")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt.query_map([], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            description: row.get(1)?,
            amount: row.get(2)?,
            type_: row.get(3)?,
            category: row.get(4)?,
            date: row.get(5)?,
            is_recurring: row.get(6)?,
            recurrence_period: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i { items.push(item); }
    }
    Ok(items)
}

#[tauri::command]
pub fn finance_add_transaction(transaction: Transaction, db_state: State<'_, DbState>) -> Result<Transaction, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let id = if transaction.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { transaction.id.clone() };
    
    conn.execute(
        "INSERT INTO transactions (id, description, amount, type, category, date, is_recurring, recurrence_period) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, transaction.description, transaction.amount, transaction.type_, transaction.category, transaction.date, transaction.is_recurring, transaction.recurrence_period]
    ).map_err(|e| e.to_string())?;
    
    let mut ret = transaction;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn finance_update_transaction(transaction: Transaction, db_state: State<'_, DbState>) -> Result<i32, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let count = conn.execute(
        "UPDATE transactions SET description = ?, amount = ?, type = ?, category = ?, date = ?, is_recurring = ?, recurrence_period = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![transaction.description, transaction.amount, transaction.type_, transaction.category, transaction.date, transaction.is_recurring, transaction.recurrence_period, transaction.id]
    ).map_err(|e| e.to_string())?;
        
    Ok(count as i32)
}

#[tauri::command]
pub fn finance_delete_transaction(id: String, db_state: State<'_, DbState>) -> Result<bool, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    conn.execute("DELETE FROM transactions WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
        
    Ok(true)
}

#[tauri::command]
pub fn finance_get_wishlist(db_state: State<'_, DbState>) -> Result<Vec<WishlistItem>, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let mut stmt = conn.prepare("SELECT id, title, price, priority, category, expected_date, description, link FROM wishlist")
        .map_err(|e| e.to_string())?;
        
    let iter = stmt.query_map([], |row| {
        Ok(WishlistItem {
            id: row.get(0)?,
            title: row.get(1)?,
            price: row.get(2)?,
            priority: row.get(3)?,
            category: row.get(4)?,
            expected_date: row.get(5)?,
            description: row.get(6)?,
            link: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for i in iter {
        if let Ok(item) = i { items.push(item); }
    }
    Ok(items)
}

#[tauri::command]
pub fn finance_add_wishlist(item: WishlistItem, db_state: State<'_, DbState>) -> Result<WishlistItem, String> {
    let guard = db_state.conn.lock().unwrap();
    let conn = guard.as_ref().ok_or("Banco não inicializado")?;
    
    let id = if item.id.is_empty() { uuid::Uuid::new_v4().to_string() } else { item.id.clone() };
    
    conn.execute(
        "INSERT INTO wishlist (id, title, price, priority, category, expected_date, description, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, item.title, item.price, item.priority, item.category, item.expected_date, item.description, item.link]
    ).map_err(|e| e.to_string())?;
    
    let mut ret = item;
    ret.id = id;
    Ok(ret)
}

#[tauri::command]
pub fn finance_update_wishlist(item: WishlistItem, db_state: State<'_, DbState>) -> Result<i32, String> {
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
    
    conn.execute("DELETE FROM wishlist WHERE id = ?", [&id])
        .map_err(|e| e.to_string())?;
        
    Ok(true)
}
