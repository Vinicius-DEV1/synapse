use super::helpers::{json_to_c_char, to_opt_str};
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::finance::FinanceRepository;

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_get_accounts(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match FinanceRepository::get_accounts(&*db) {
        Ok(accounts) => json_to_c_char(&accounts),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_accounts failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_create_account(
    db: *mut Database,
    name: *const c_char,
    color: *const c_char,
    icon: *const c_char,
    initial_balance: f64,
) -> c_int {
    if db.is_null() || name.is_null() {
        return -1;
    }
    let name_str = match to_opt_str(name) {
        Some(s) => s,
        None => return -1,
    };
    let color_str = to_opt_str(color);
    let icon_str = to_opt_str(icon);

    match FinanceRepository::create_account(&*db, name_str, color_str, icon_str, Some(initial_balance)) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] create_account failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_update_account(
    db: *mut Database,
    account_id: *const c_char,
    name: *const c_char,
    color: *const c_char,
    icon: *const c_char,
    initial_balance: f64,
) -> c_int {
    if db.is_null() || account_id.is_null() || name.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(account_id) {
        Some(s) => s,
        None => return -1,
    };
    let name_str = match to_opt_str(name) {
        Some(s) => s,
        None => return -1,
    };
    let color_str = to_opt_str(color);
    let icon_str = to_opt_str(icon);

    match FinanceRepository::update_account(&*db, id_str, name_str, color_str, icon_str, Some(initial_balance)) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_account failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_delete_account(
    db: *mut Database,
    account_id: *const c_char,
) -> c_int {
    if db.is_null() || account_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(account_id) {
        Some(s) => s,
        None => return -1,
    };

    match FinanceRepository::delete_account(&*db, id_str) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_account failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_get_transactions(
    db: *mut Database,
    type_filter: *const c_char,
    account_filter: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let t_filter = to_opt_str(type_filter);
    let a_filter = to_opt_str(account_filter);

    match FinanceRepository::get_transactions(&*db, t_filter, a_filter) {
        Ok(txs) => json_to_c_char(&txs),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_transactions failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_add_transaction(
    db: *mut Database,
    description: *const c_char,
    amount: f64,
    type_: *const c_char,
    category: *const c_char,
    date: *const c_char,
    account_id: *const c_char,
) -> c_int {
    if db.is_null() || description.is_null() || type_.is_null() {
        return -1;
    }
    let desc_str = match to_opt_str(description) {
        Some(s) => s,
        None => return -1,
    };
    let type_str = match to_opt_str(type_) {
        Some(s) => s,
        None => return -1,
    };
    let cat_str = to_opt_str(category);
    let date_str = to_opt_str(date);
    let acc_str = to_opt_str(account_id);

    match FinanceRepository::add_transaction(&*db, desc_str, amount, type_str, cat_str, date_str, acc_str) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] add_transaction failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_add_transfer(
    db: *mut Database,
    description: *const c_char,
    amount: f64,
    from_account_id: *const c_char,
    to_account_id: *const c_char,
    date: *const c_char,
) -> c_int {
    if db.is_null() || description.is_null() || from_account_id.is_null() || to_account_id.is_null() {
        return -1;
    }
    let desc_str = match to_opt_str(description) {
        Some(s) => s,
        None => return -1,
    };
    let from_str = match to_opt_str(from_account_id) {
        Some(s) => s,
        None => return -1,
    };
    let to_str = match to_opt_str(to_account_id) {
        Some(s) => s,
        None => return -1,
    };
    let date_str = to_opt_str(date);

    match FinanceRepository::add_transfer(&*db, desc_str, amount, from_str, to_str, date_str) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] add_transfer failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_update_transaction(
    db: *mut Database,
    tx_id: *const c_char,
    description: *const c_char,
    amount: f64,
    type_: *const c_char,
    category: *const c_char,
    date: *const c_char,
    account_id: *const c_char,
    destination_account_id: *const c_char,
) -> c_int {
    if db.is_null() || tx_id.is_null() || description.is_null() || type_.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(tx_id) {
        Some(s) => s,
        None => return -1,
    };
    let desc_str = match to_opt_str(description) {
        Some(s) => s,
        None => return -1,
    };
    let type_str = match to_opt_str(type_) {
        Some(s) => s,
        None => return -1,
    };
    let cat_str = to_opt_str(category);
    let date_str = to_opt_str(date);
    let acc_str = to_opt_str(account_id);
    let dest_str = to_opt_str(destination_account_id);

    match FinanceRepository::update_transaction(&*db, id_str, desc_str, amount, type_str, cat_str, date_str, acc_str, dest_str) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_transaction failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_delete_transaction(
    db: *mut Database,
    tx_id: *const c_char,
) -> c_int {
    if db.is_null() || tx_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(tx_id) {
        Some(s) => s,
        None => return -1,
    };

    match FinanceRepository::delete_transaction(&*db, id_str) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_transaction failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_get_summary(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match FinanceRepository::get_financial_summary(&*db) {
        Ok(summary) => json_to_c_char(&summary),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_financial_summary failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_get_wishlist(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match FinanceRepository::get_wishlist(&*db) {
        Ok(items) => json_to_c_char(&items),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_wishlist failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_add_wishlist_item(
    db: *mut Database,
    title: *const c_char,
    price: f64,
    priority: *const c_char,
    category: *const c_char,
    link: *const c_char,
) -> c_int {
    if db.is_null() || title.is_null() {
        return -1;
    }
    let title_str = match to_opt_str(title) {
        Some(s) => s,
        None => return -1,
    };
    let prio_str = to_opt_str(priority);
    let cat_str = to_opt_str(category);
    let link_str = to_opt_str(link);

    match FinanceRepository::add_wishlist_item(&*db, title_str, price, prio_str, cat_str, link_str, None) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] add_wishlist_item failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_delete_wishlist_item(
    db: *mut Database,
    item_id: *const c_char,
) -> c_int {
    if db.is_null() || item_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(item_id) {
        Some(s) => s,
        None => return -1,
    };

    match FinanceRepository::delete_wishlist_item(&*db, id_str) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_wishlist_item failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_get_loans(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match FinanceRepository::get_loans(&*db) {
        Ok(loans) => json_to_c_char(&loans),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_loans failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_create_loan(
    db: *mut Database,
    description: *const c_char,
    person: *const c_char,
    amount: f64,
    loan_type: *const c_char,
    account_id: *const c_char,
    date: *const c_char,
) -> c_int {
    if db.is_null() || description.is_null() || person.is_null() || loan_type.is_null() {
        return -1;
    }
    let desc_str = match to_opt_str(description) {
        Some(s) => s,
        None => return -1,
    };
    let person_str = match to_opt_str(person) {
        Some(s) => s,
        None => return -1,
    };
    let type_str = match to_opt_str(loan_type) {
        Some(s) => s,
        None => return -1,
    };
    let acc_str = to_opt_str(account_id).unwrap_or("");
    let date_str = to_opt_str(date);

    match FinanceRepository::create_loan(&*db, desc_str, person_str, amount, type_str, acc_str, date_str) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] create_loan failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_record_loan_payment(
    db: *mut Database,
    loan_id: *const c_char,
    amount: f64,
    account_id: *const c_char,
    payment_date: *const c_char,
) -> c_int {
    if db.is_null() || loan_id.is_null() || account_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(loan_id) {
        Some(s) => s,
        None => return -1,
    };
    let acc_str = match to_opt_str(account_id) {
        Some(s) => s,
        None => return -1,
    };
    let date_str = to_opt_str(payment_date);
    let amount_opt = if amount > 0.0 { Some(amount) } else { None };

    match synapse_core::domain::finance::record_loan_payment(&*db, id_str, amount_opt, acc_str, date_str) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] record_loan_payment failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_finance_delete_loan(
    db: *mut Database,
    loan_id: *const c_char,
) -> c_int {
    if db.is_null() || loan_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(loan_id) {
        Some(s) => s,
        None => return -1,
    };

    match synapse_core::domain::finance::delete_transaction_with_links(&*db, id_str) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_loan failed: {}", e);
            -1
        }
    }
}
