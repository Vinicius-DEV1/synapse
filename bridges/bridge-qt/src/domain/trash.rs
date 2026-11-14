use super::helpers::{json_to_c_char, to_opt_str};
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::trash::TrashRepository;

#[no_mangle]
pub unsafe extern "C" fn synapse_trash_get_items(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match TrashRepository::get_trash_items(&*db) {
        Ok(items) => json_to_c_char(&items),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_trash_items failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_trash_restore_item(
    db: *mut Database,
    id: *const c_char,
    item_type: *const c_char,
) -> c_int {
    if db.is_null() || id.is_null() || item_type.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(id) {
        Some(s) => s,
        None => return -1,
    };
    let type_str = match to_opt_str(item_type) {
        Some(s) => s,
        None => return -1,
    };

    match TrashRepository::restore_trash_item(&*db, id_str, type_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] restore_trash_item failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_trash_delete_permanently(
    db: *mut Database,
    id: *const c_char,
    item_type: *const c_char,
) -> c_int {
    if db.is_null() || id.is_null() || item_type.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(id) {
        Some(s) => s,
        None => return -1,
    };
    let type_str = match to_opt_str(item_type) {
        Some(s) => s,
        None => return -1,
    };

    match TrashRepository::delete_trash_item_permanently(&*db, id_str, type_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_trash_item_permanently failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_trash_empty(db: *mut Database) -> c_int {
    if db.is_null() {
        return -1;
    }
    match TrashRepository::empty_trash(&*db) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] empty_trash failed: {}", e);
            -1
        }
    }
}
