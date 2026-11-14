use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::notes::{LinkMetadata, NotesRepository};

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
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let c = to_opt_str(content).unwrap_or("");
    let enc = to_opt_str(encrypted_content);

    match NotesRepository::record_page_history(&*db, pid, c, enc) {
        Ok(hid) => match CString::new(hid) {
            Ok(cstr) => cstr.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
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
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
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
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return -1,
    };
    let rid = match to_opt_str(revision_id) {
        Some(s) => s,
        None => return -1,
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
pub unsafe extern "C" fn synapse_notes_get_link_metadata(
    db: *mut Database,
    url: *const c_char,
) -> *mut c_char {
    if db.is_null() || url.is_null() {
        return std::ptr::null_mut();
    }
    let u = match to_opt_str(url) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match NotesRepository::get_link_metadata(&*db, u) {
        Ok(Some(meta)) => json_to_c_char(&meta),
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_link_metadata failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_save_link_metadata(
    db: *mut Database,
    metadata_json: *const c_char,
) -> c_int {
    if db.is_null() || metadata_json.is_null() {
        return -1;
    }
    let json_str = match to_opt_str(metadata_json) {
        Some(s) => s,
        None => return -1,
    };
    let meta: LinkMetadata = match serde_json::from_str(json_str) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("[Synapse Bridge] parse link metadata failed: {}", e);
            return -1;
        }
    };
    match NotesRepository::save_link_metadata(&*db, &meta) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] save_link_metadata failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_get_link_entity(
    db: *mut Database,
    canonical_url: *const c_char,
) -> *mut c_char {
    if db.is_null() || canonical_url.is_null() {
        return std::ptr::null_mut();
    }
    let u = match to_opt_str(canonical_url) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match NotesRepository::get_link_entity(&*db, u) {
        Ok(Some(entity)) => match CString::new(entity) {
            Ok(cstr) => cstr.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_link_entity failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_save_link_entity(
    db: *mut Database,
    canonical_url: *const c_char,
    entity_json: *const c_char,
) -> c_int {
    if db.is_null() || canonical_url.is_null() || entity_json.is_null() {
        return -1;
    }
    let u = match to_opt_str(canonical_url) {
        Some(s) => s,
        None => return -1,
    };
    let json = match to_opt_str(entity_json) {
        Some(s) => s,
        None => return -1,
    };
    match NotesRepository::save_link_entity(&*db, u, json) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] save_link_entity failed: {}", e);
            -1
        }
    }
}
