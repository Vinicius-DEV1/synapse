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

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_parse_blocks(html: *const c_char) -> *mut c_char {
    let raw = to_opt_str(html).unwrap_or("");
    let blocks = synapse_core::domain::notes::parse_note_blocks(raw);
    json_to_c_char(&blocks)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_serialize_blocks(blocks_json: *const c_char) -> *mut c_char {
    let raw = match to_opt_str(blocks_json) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let blocks: Vec<synapse_core::domain::notes::NoteBlock> = match serde_json::from_str(raw) {
        Ok(b) => b,
        Err(_) => return std::ptr::null_mut(),
    };
    let html = synapse_core::domain::notes::serialize_note_blocks(&blocks);
    match CString::new(html) {
        Ok(c) => c.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_apply_search_replace(
    original: *const c_char,
    ai_response: *const c_char,
) -> *mut c_char {
    let orig = to_opt_str(original).unwrap_or("");
    let ai = to_opt_str(ai_response).unwrap_or("");
    let blocks = synapse_core::domain::notes::parse_search_replace_blocks(ai);
    let result = synapse_core::domain::notes::apply_search_replace(orig, &blocks);
    json_to_c_char(&result)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_compute_word_diff_html(
    old_text: *const c_char,
    new_text: *const c_char,
) -> *mut c_char {
    let old_s = to_opt_str(old_text).unwrap_or("");
    let new_s = to_opt_str(new_text).unwrap_or("");
    let diff = synapse_core::domain::notes::compute_word_diff_html(old_s, new_s);
    match CString::new(diff) {
        Ok(c) => c.into_raw(),
        Err(_) => std::ptr::null_mut(),
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
