//! FFI bindings for web link metadata, LinkEntity vault persistence, URL canonicalization & duplicates.

use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::notes::{
    build_default_link_entity_json, canonical_link_url, LinkMetadata, NotesRepository,
};

use super::super::helpers::{json_to_c_char, to_opt_str};

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_get_link_metadata(
    db: *mut Database,
    url: *const c_char,
) -> *mut c_char {
    if db.is_null() || url.is_null() {
        return std::ptr::null_mut();
    }
    let Some(u) = to_opt_str(url) else {
        return std::ptr::null_mut();
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
    let Some(json_str) = to_opt_str(metadata_json) else {
        return -1;
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
    let Some(u) = to_opt_str(canonical_url) else {
        return std::ptr::null_mut();
    };
    match NotesRepository::get_link_entity(&*db, u) {
        Ok(Some(entity)) => CString::new(entity)
            .map(CString::into_raw)
            .unwrap_or(std::ptr::null_mut()),
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
    let Some(u) = to_opt_str(canonical_url) else {
        return -1;
    };
    let Some(json) = to_opt_str(entity_json) else {
        return -1;
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

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_find_duplicate_links(
    db: *mut Database,
    url: *const c_char,
    exclude_page_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || url.is_null() {
        return std::ptr::null_mut();
    }
    let Some(u) = to_opt_str(url) else {
        return std::ptr::null_mut();
    };
    let excl = to_opt_str(exclude_page_id);
    match NotesRepository::find_duplicate_links(&*db, u, excl) {
        Ok(matches) => json_to_c_char(&matches),
        Err(e) => {
            eprintln!("[Synapse Bridge] find_duplicate_links failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_canonical_link_url(raw_url: *const c_char) -> *mut c_char {
    let raw = to_opt_str(raw_url).unwrap_or("");
    match canonical_link_url(raw) {
        Some(c) => CString::new(c)
            .map(CString::into_raw)
            .unwrap_or(std::ptr::null_mut()),
        None => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_default_link_entity(
    canonical_url: *const c_char,
    original_url: *const c_char,
) -> *mut c_char {
    let canon = to_opt_str(canonical_url).unwrap_or("");
    let orig = to_opt_str(original_url).unwrap_or("");
    let val = build_default_link_entity_json(canon, orig);
    json_to_c_char(&val)
}
