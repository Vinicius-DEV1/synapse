use crate::db::DbState;
use synapse_core::domain::finance::{Account, FinanceRepository, Transaction, WishlistItem};
use tauri::State;

#[tauri::command]
pub async fn finance_get_accounts(db_state: State<'_, DbState>) -> Result<Vec<Account>, String> {
    db_state
        .read(|conn| FinanceRepository::get_accounts_conn(conn).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn finance_add_account(
    account: Account,
    db_state: State<'_, DbState>,
) -> Result<Account, String> {
    db_state
        .write(move |conn| {
            FinanceRepository::create_account_struct(conn, account).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn finance_update_account(
    account: Account,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    db_state
        .write(move |conn| {
            FinanceRepository::update_account_struct(conn, account).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn finance_delete_account(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            FinanceRepository::delete_account_conn(conn, &id).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn finance_get_transactions(
    db_state: State<'_, DbState>,
) -> Result<Vec<Transaction>, String> {
    db_state
        .read(|conn| {
            FinanceRepository::get_transactions_conn(conn, None, None).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn finance_add_transaction(
    transaction: Transaction,
    db_state: State<'_, DbState>,
) -> Result<Transaction, String> {
    db_state
        .write(move |conn| {
            FinanceRepository::add_transaction_struct(conn, transaction).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn finance_update_transaction(
    transaction: Transaction,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    db_state
        .write(move |conn| {
            FinanceRepository::update_transaction_struct(conn, transaction)
                .map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn finance_confirm_pending_transaction(
    id: String,
    amount: Option<f64>,
    date: Option<String>,
    account_id: Option<String>,
    description: Option<String>,
    category: Option<String>,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            FinanceRepository::confirm_pending_transaction_conn(
                conn,
                &id,
                amount,
                date.as_deref(),
                account_id.as_deref(),
                description.as_deref(),
                category.as_deref(),
            )
            .map(|_| true)
            .map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn finance_delete_transaction(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            FinanceRepository::delete_transaction_conn(conn, &id).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn finance_get_wishlist(
    db_state: State<'_, DbState>,
) -> Result<Vec<WishlistItem>, String> {
    db_state
        .read(|conn| FinanceRepository::get_wishlist_conn(conn).map_err(|e| e.to_string()))
        .await
}

#[tauri::command]
pub async fn finance_add_wishlist(
    item: WishlistItem,
    db_state: State<'_, DbState>,
) -> Result<WishlistItem, String> {
    db_state
        .write(move |conn| {
            FinanceRepository::add_wishlist_struct(conn, item).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn finance_update_wishlist(
    item: WishlistItem,
    db_state: State<'_, DbState>,
) -> Result<i32, String> {
    db_state
        .write(move |conn| {
            FinanceRepository::update_wishlist_struct(conn, item).map_err(|e| e.to_string())
        })
        .await
}

#[tauri::command]
pub async fn finance_delete_wishlist(
    id: String,
    db_state: State<'_, DbState>,
) -> Result<bool, String> {
    db_state
        .write(move |conn| {
            FinanceRepository::delete_wishlist_conn(conn, &id).map_err(|e| e.to_string())
        })
        .await
}
