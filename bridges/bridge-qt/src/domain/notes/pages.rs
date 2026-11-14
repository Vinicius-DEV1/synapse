use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::notes::NotesRepository;

use super::super::helpers::{json_to_c_char, to_opt_str};

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_get_pages(
    db: *mut Database,
    filter: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let filter_str = to_opt_str(filter);
    match NotesRepository::get_pages(&*db, filter_str) {
        Ok(pages) => json_to_c_char(&pages),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_pages failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_get_pinned_pages(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match NotesRepository::get_pinned_pages(&*db) {
        Ok(pages) => json_to_c_char(&pages),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_pinned_pages failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_get_page_tree(
    db: *mut Database,
    filter: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let filter_str = to_opt_str(filter);
    match NotesRepository::get_page_tree(&*db, filter_str) {
        Ok(tree) => json_to_c_char(&tree),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_page_tree failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_get_page(
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
    match NotesRepository::get_page(&*db, pid) {
        Ok(Some(page)) => json_to_c_char(&page),
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_page failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_create_subpage(
    db: *mut Database,
    parent_id: *const c_char,
    title: *const c_char,
    icon: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let pid = to_opt_str(parent_id);
    let t = to_opt_str(title).unwrap_or("Nova Página");
    let ic = to_opt_str(icon);

    match NotesRepository::create_page(&*db, pid, t, ic) {
        Ok(page) => match CString::new(page.id) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(e) => {
            eprintln!("[Synapse Bridge] create_subpage failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_save_page(
    db: *mut Database,
    id: *const c_char,
    title: *const c_char,
    content: *const c_char,
    encrypted_content: *const c_char,
    icon: *const c_char,
) -> c_int {
    if db.is_null() || id.is_null() {
        return -1;
    }
    let pid = match to_opt_str(id) {
        Some(s) => s,
        None => return -1,
    };
    let t = to_opt_str(title).unwrap_or("");
    let c = to_opt_str(content).unwrap_or("");
    let enc = to_opt_str(encrypted_content);
    let ic = to_opt_str(icon).unwrap_or("📄");

    match NotesRepository::save_page(&*db, pid, t, c, enc, ic) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] save_page failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_rename_page(
    db: *mut Database,
    page_id: *const c_char,
    title: *const c_char,
) -> c_int {
    if db.is_null() || page_id.is_null() {
        return -1;
    }
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return -1,
    };
    let t = to_opt_str(title).unwrap_or("Sem título");

    match NotesRepository::rename_page(&*db, pid, t) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] rename_page failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_update_icon(
    db: *mut Database,
    page_id: *const c_char,
    icon: *const c_char,
) -> c_int {
    if db.is_null() || page_id.is_null() {
        return -1;
    }
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return -1,
    };
    let ic = to_opt_str(icon).unwrap_or("📄");

    match NotesRepository::update_page_icon(&*db, pid, ic) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_icon failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_update_description(
    db: *mut Database,
    page_id: *const c_char,
    description: *const c_char,
) -> c_int {
    if db.is_null() || page_id.is_null() {
        return -1;
    }
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return -1,
    };
    let desc = to_opt_str(description).unwrap_or("");

    match NotesRepository::update_page_description(&*db, pid, desc) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_description failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_update_cover(
    db: *mut Database,
    page_id: *const c_char,
    cover_image: *const c_char,
) -> c_int {
    if db.is_null() || page_id.is_null() {
        return -1;
    }
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return -1,
    };
    let cov = to_opt_str(cover_image);

    match NotesRepository::update_page_cover(&*db, pid, cov) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_cover failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_toggle_pin(
    db: *mut Database,
    page_id: *const c_char,
) -> c_int {
    if db.is_null() || page_id.is_null() {
        return -1;
    }
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return -1,
    };
    match NotesRepository::toggle_pin_page(&*db, pid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] toggle_pin failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_delete_page(
    db: *mut Database,
    page_id: *const c_char,
) -> c_int {
    if db.is_null() || page_id.is_null() {
        return -1;
    }
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return -1,
    };
    match NotesRepository::soft_delete_page_subtree(&*db, pid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_page failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_restore_page(
    db: *mut Database,
    page_id: *const c_char,
) -> c_int {
    if db.is_null() || page_id.is_null() {
        return -1;
    }
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return -1,
    };
    match NotesRepository::restore_page(&*db, pid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] restore_page failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_move_page(
    db: *mut Database,
    page_id: *const c_char,
    new_parent_id: *const c_char,
) -> c_int {
    if db.is_null() || page_id.is_null() {
        return -1;
    }
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return -1,
    };
    let new_pid = to_opt_str(new_parent_id);

    match NotesRepository::move_page(&*db, pid, new_pid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] move_page failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_reorder_pages(
    db: *mut Database,
    parent_id: *const c_char,
    page_ids_json: *const c_char,
) -> c_int {
    if db.is_null() || page_ids_json.is_null() {
        return -1;
    }
    let pid = to_opt_str(parent_id);
    let json_str = match to_opt_str(page_ids_json) {
        Some(s) => s,
        None => return -1,
    };
    let ids: Vec<String> = match serde_json::from_str(json_str) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("[Synapse Bridge] parse reorder IDs failed: {}", e);
            return -1;
        }
    };
    match NotesRepository::reorder_pages(&*db, pid, &ids) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] reorder_pages failed: {}", e);
            -1
        }
    }
}
