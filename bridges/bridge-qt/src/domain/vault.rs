use super::helpers::{json_to_c_char, to_opt_str};
use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::vault::{VaultItem, VaultRepository};

#[no_mangle]
pub unsafe extern "C" fn synapse_vault_get_groups(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match VaultRepository::get_groups(&*db) {
        Ok(groups) => json_to_c_char(&groups),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_vault_groups failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_vault_create_group(
    db: *mut Database,
    name: *const c_char,
    icon: *const c_char,
    color: *const c_char,
) -> *mut c_char {
    if db.is_null() || name.is_null() {
        return std::ptr::null_mut();
    }
    let name_str = match to_opt_str(name) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let icon_str = to_opt_str(icon);
    let color_str = to_opt_str(color);

    match VaultRepository::create_group(&*db, name_str, icon_str, color_str) {
        Ok(g) => match CString::new(g.id) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(e) => {
            eprintln!("[Synapse Bridge] create_vault_group failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_vault_update_group(
    db: *mut Database,
    id: *const c_char,
    name: *const c_char,
    icon: *const c_char,
    color: *const c_char,
    position: c_int,
) -> c_int {
    if db.is_null() || id.is_null() || name.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(id) {
        Some(s) => s,
        None => return -1,
    };
    let name_str = match to_opt_str(name) {
        Some(s) => s,
        None => return -1,
    };
    let icon_str = to_opt_str(icon);
    let color_str = to_opt_str(color);
    let pos_opt = if position >= 0 { Some(position) } else { None };

    match VaultRepository::update_group(&*db, id_str, name_str, icon_str, color_str, pos_opt) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_vault_group failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_vault_delete_group(
    db: *mut Database,
    id: *const c_char,
) -> c_int {
    if db.is_null() || id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(id) {
        Some(s) => s,
        None => return -1,
    };
    match VaultRepository::delete_group(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_vault_group failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_vault_get_items(
    db: *mut Database,
    group_id: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let gid_str = to_opt_str(group_id);
    match VaultRepository::get_items(&*db, gid_str) {
        Ok(items) => json_to_c_char(&items),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_vault_items failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_vault_save_item(
    db: *mut Database,
    id: *const c_char,
    group_id: *const c_char,
    label: *const c_char,
    username: *const c_char,
    email: *const c_char,
    password: *const c_char,
    url: *const c_char,
    notes: *const c_char,
    is_favorite: c_int,
) -> c_int {
    if db.is_null() || label.is_null() {
        return -1;
    }
    let label_str = match to_opt_str(label) {
        Some(s) => s,
        None => return -1,
    };

    let item = VaultItem {
        id: to_opt_str(id).unwrap_or("").to_string(),
        group_id: to_opt_str(group_id).map(String::from),
        label: label_str.to_string(),
        username: to_opt_str(username).map(String::from),
        email: to_opt_str(email).map(String::from),
        password: to_opt_str(password).map(String::from),
        url: to_opt_str(url).map(String::from),
        notes: to_opt_str(notes).map(String::from),
        is_favorite: is_favorite != 0,
        created_at: None,
        updated_at: None,
    };

    match VaultRepository::save_item(&*db, item) {
        Ok(_) => 1,
        Err(e) => {
            eprintln!("[Synapse Bridge] save_vault_item failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_vault_delete_item(
    db: *mut Database,
    id: *const c_char,
) -> c_int {
    if db.is_null() || id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(id) {
        Some(s) => s,
        None => return -1,
    };
    match VaultRepository::delete_item(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_vault_item failed: {}", e);
            -1
        }
    }
}
