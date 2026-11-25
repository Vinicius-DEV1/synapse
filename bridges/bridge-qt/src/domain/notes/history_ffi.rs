//! FFI bindings for note revision history and encrypted image cache (`image_cache`).

use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::notes::NotesRepository;

use super::super::helpers::{json_to_c_char, to_opt_str};

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_record_history(
    db: *mut Database,
    page_id: *const c_char,
    content: *const c_char,
    encrypted_content: *const c_char,
) -> *mut c_char {
    if db.is_null() || page_id.is_null() {
        return std::ptr::null_mut();
    }
    let Some(pid) = to_opt_str(page_id) else {
        return std::ptr::null_mut();
    };
    let c = to_opt_str(content).unwrap_or("");
    let enc = to_opt_str(encrypted_content);
    match NotesRepository::record_page_history(&*db, pid, c, enc) {
        Ok(hid) => CString::new(hid)
            .map(CString::into_raw)
            .unwrap_or(std::ptr::null_mut()),
        Err(e) => {
            eprintln!("[Synapse Bridge] record_history failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_get_history(
    db: *mut Database,
    page_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || page_id.is_null() {
        return std::ptr::null_mut();
    }
    let Some(pid) = to_opt_str(page_id) else {
        return std::ptr::null_mut();
    };
    match NotesRepository::get_page_history(&*db, pid) {
        Ok(history) => json_to_c_char(&history),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_history failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_restore_revision(
    db: *mut Database,
    page_id: *const c_char,
    revision_id: *const c_char,
) -> c_int {
    if db.is_null() || page_id.is_null() || revision_id.is_null() {
        return -1;
    }
    let Some(pid) = to_opt_str(page_id) else {
        return -1;
    };
    let Some(rid) = to_opt_str(revision_id) else {
        return -1;
    };
    match NotesRepository::restore_page_revision(&*db, pid, rid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] restore_revision failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_get_cached_image_data_uri(
    db: *mut Database,
    image_id: *const c_char,
    key_hex: *const c_char,
) -> *mut c_char {
    if db.is_null() || image_id.is_null() {
        return std::ptr::null_mut();
    }
    let Some(id) = to_opt_str(image_id) else {
        return std::ptr::null_mut();
    };
    let key = to_opt_str(key_hex);
    match NotesRepository::get_cached_image_data_uri(&*db, id, key) {
        Ok(Some(uri)) => CString::new(uri)
            .map(CString::into_raw)
            .unwrap_or(std::ptr::null_mut()),
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_cached_image_data_uri failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_put_cached_image_bytes(
    db: *mut Database,
    image_id: *const c_char,
    data: *const u8,
    data_len: c_int,
    mime_type: *const c_char,
    key_hex: *const c_char,
) -> c_int {
    if db.is_null() || image_id.is_null() || data.is_null() || data_len <= 0 {
        return -1;
    }
    let Some(id) = to_opt_str(image_id) else {
        return -1;
    };
    let slice = std::slice::from_raw_parts(data, data_len as usize);
    let mime = to_opt_str(mime_type);
    let key = to_opt_str(key_hex);
    match NotesRepository::put_cached_image_bytes(&*db, id, slice, mime, key) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] put_cached_image_bytes failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_delete_cached_image(
    db: *mut Database,
    image_id: *const c_char,
) -> c_int {
    if db.is_null() || image_id.is_null() {
        return -1;
    }
    let Some(id) = to_opt_str(image_id) else {
        return -1;
    };
    match NotesRepository::delete_cached_image(&*db, id) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_cached_image failed: {}", e);
            -1
        }
    }
}
