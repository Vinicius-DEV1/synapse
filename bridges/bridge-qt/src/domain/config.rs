//! C-ABI bridge for global configuration and preferences.

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::config::ConfigRepository;

#[no_mangle]
pub unsafe extern "C" fn synapse_config_get(
    db: *mut Database,
    key: *const c_char,
) -> *mut c_char {
    if db.is_null() || key.is_null() {
        return std::ptr::null_mut();
    }
    let db_ref = &*db;
    let key_str = match CStr::from_ptr(key).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let conn = match db_ref.lock() {
        Ok(c) => c,
        Err(_) => return std::ptr::null_mut(),
    };

    match ConfigRepository::get(&conn, key_str) {
        Ok(Some(val)) => match CString::new(val) {
            Ok(c_val) => c_val.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        _ => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_config_set(
    db: *mut Database,
    key: *const c_char,
    val: *const c_char,
) -> c_int {
    if db.is_null() || key.is_null() || val.is_null() {
        return 0;
    }
    let db_ref = &*db;
    let key_str = match CStr::from_ptr(key).to_str() {
        Ok(s) => s,
        Err(_) => return 0,
    };
    let val_str = match CStr::from_ptr(val).to_str() {
        Ok(s) => s,
        Err(_) => return 0,
    };

    let conn = match db_ref.lock() {
        Ok(c) => c,
        Err(_) => return 0,
    };

    match ConfigRepository::set(&conn, key_str, val_str) {
        Ok(()) => 1,
        Err(_) => 0,
    }
}
