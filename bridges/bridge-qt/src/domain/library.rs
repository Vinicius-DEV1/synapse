//! C ABI bridge for the Library domain module.

use super::helpers::{json_to_c_char, to_opt_str};
use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::library::{
    BookRecord, LibraryRepository,
};

#[no_mangle]
pub unsafe extern "C" fn synapse_library_get_books(
    db: *mut Database,
    filter: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let filter_str = to_opt_str(filter);
    match LibraryRepository::get_books(&*db, filter_str) {
        Ok(books) => json_to_c_char(&books),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_books failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_get_book(
    db: *mut Database,
    book_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || book_id.is_null() {
        return std::ptr::null_mut();
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match LibraryRepository::get_book(&*db, bid) {
        Ok(Some(book)) => json_to_c_char(&book),
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_book failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_insert_book(
    db: *mut Database,
    book_json: *const c_char,
) -> c_int {
    if db.is_null() || book_json.is_null() {
        return -1;
    }
    let json_str = match to_opt_str(book_json) {
        Some(s) => s,
        None => return -1,
    };
    let book: BookRecord = match serde_json::from_str(json_str) {
        Ok(b) => b,
        Err(e) => {
            eprintln!("[Synapse Bridge] parse BookRecord failed: {}", e);
            return -1;
        }
    };
    match LibraryRepository::insert_book(&*db, &book) {
        Ok(_) => 1,
        Err(e) => {
            eprintln!("[Synapse Bridge] insert_book failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_update_progress(
    db: *mut Database,
    book_id: *const c_char,
    current_page: c_int,
    total_pages: c_int,
    reading_status: *const c_char,
) -> c_int {
    if db.is_null() || book_id.is_null() {
        return -1;
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return -1,
    };
    let status = to_opt_str(reading_status);
    match LibraryRepository::update_book_progress(&*db, bid, current_page, total_pages, status) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_book_progress failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_update_status(
    db: *mut Database,
    book_id: *const c_char,
    status: *const c_char,
) -> c_int {
    if db.is_null() || book_id.is_null() || status.is_null() {
        return -1;
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return -1,
    };
    let st = match to_opt_str(status) {
        Some(s) => s,
        None => return -1,
    };
    match LibraryRepository::update_book_status(&*db, bid, st) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_book_status failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_set_archived(
    db: *mut Database,
    book_id: *const c_char,
    archived: c_int,
) -> c_int {
    if db.is_null() || book_id.is_null() {
        return -1;
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return -1,
    };
    match LibraryRepository::set_book_archived(&*db, bid, archived != 0) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] set_book_archived failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_update_metadata(
    db: *mut Database,
    book_id: *const c_char,
    title: *const c_char,
    author: *const c_char,
    description: *const c_char,
    published_year: c_int,
    publisher: *const c_char,
    language: *const c_char,
) -> c_int {
    if db.is_null() || book_id.is_null() || title.is_null() || author.is_null() {
        return -1;
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return -1,
    };
    let t = match to_opt_str(title) {
        Some(s) => s,
        None => return -1,
    };
    let a = match to_opt_str(author) {
        Some(s) => s,
        None => return -1,
    };
    let desc = to_opt_str(description);
    let pub_year = if published_year > 0 { Some(published_year) } else { None };
    let pub_name = to_opt_str(publisher);
    let lang = to_opt_str(language);

    match LibraryRepository::update_book_metadata(&*db, bid, t, a, desc, pub_year, pub_name, lang) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_book_metadata failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_update_cover(
    db: *mut Database,
    book_id: *const c_char,
    cover_image: *const c_char,
    cover_color: *const c_char,
) -> c_int {
    if db.is_null() || book_id.is_null() {
        return -1;
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return -1,
    };
    let img = to_opt_str(cover_image);
    let col = to_opt_str(cover_color);
    match LibraryRepository::update_book_cover(&*db, bid, img, col) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_book_cover failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_delete_book(
    db: *mut Database,
    book_id: *const c_char,
) -> c_int {
    if db.is_null() || book_id.is_null() {
        return -1;
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return -1,
    };
    match LibraryRepository::soft_delete_book(&*db, bid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] soft_delete_book failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_get_collections(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match LibraryRepository::get_collections(&*db) {
        Ok(cols) => json_to_c_char(&cols),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_collections failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_create_collection(
    db: *mut Database,
    name: *const c_char,
    color: *const c_char,
) -> *mut c_char {
    if db.is_null() || name.is_null() || color.is_null() {
        return std::ptr::null_mut();
    }
    let n = match to_opt_str(name) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let c = match to_opt_str(color) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match LibraryRepository::create_collection(&*db, n, c) {
        Ok(Some(col)) => match CString::new(col.id) {
            Ok(cs) => cs.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] create_collection failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_update_collection(
    db: *mut Database,
    collection_id: *const c_char,
    name: *const c_char,
    color: *const c_char,
) -> c_int {
    if db.is_null() || collection_id.is_null() || name.is_null() || color.is_null() {
        return -1;
    }
    let cid = match to_opt_str(collection_id) {
        Some(s) => s,
        None => return -1,
    };
    let n = match to_opt_str(name) {
        Some(s) => s,
        None => return -1,
    };
    let c = match to_opt_str(color) {
        Some(s) => s,
        None => return -1,
    };
    match LibraryRepository::update_collection(&*db, cid, n, c) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_collection failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_delete_collection(
    db: *mut Database,
    collection_id: *const c_char,
) -> c_int {
    if db.is_null() || collection_id.is_null() {
        return -1;
    }
    let cid = match to_opt_str(collection_id) {
        Some(s) => s,
        None => return -1,
    };
    match LibraryRepository::delete_collection(&*db, cid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_collection failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_set_book_collections(
    db: *mut Database,
    book_id: *const c_char,
    collection_ids_json: *const c_char,
) -> c_int {
    if db.is_null() || book_id.is_null() || collection_ids_json.is_null() {
        return -1;
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return -1,
    };
    let json_str = match to_opt_str(collection_ids_json) {
        Some(s) => s,
        None => return -1,
    };
    let ids: Vec<String> = match serde_json::from_str(json_str) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("[Synapse Bridge] parse collection IDs failed: {}", e);
            return -1;
        }
    };
    match LibraryRepository::set_book_collections(&*db, bid, &ids) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] set_book_collections failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_get_bookmarks(
    db: *mut Database,
    book_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || book_id.is_null() {
        return std::ptr::null_mut();
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match LibraryRepository::get_bookmarks(&*db, bid) {
        Ok(bms) => json_to_c_char(&bms),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_bookmarks failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_add_bookmark(
    db: *mut Database,
    book_id: *const c_char,
    page_number: c_int,
    label: *const c_char,
) -> *mut c_char {
    if db.is_null() || book_id.is_null() {
        return std::ptr::null_mut();
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let lbl = to_opt_str(label);
    match LibraryRepository::add_bookmark(&*db, bid, page_number, lbl) {
        Ok(bm) => json_to_c_char(&bm),
        Err(e) => {
            eprintln!("[Synapse Bridge] add_bookmark failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_update_bookmark(
    db: *mut Database,
    bookmark_id: *const c_char,
    label: *const c_char,
) -> c_int {
    if db.is_null() || bookmark_id.is_null() || label.is_null() {
        return -1;
    }
    let bmid = match to_opt_str(bookmark_id) {
        Some(s) => s,
        None => return -1,
    };
    let lbl = match to_opt_str(label) {
        Some(s) => s,
        None => return -1,
    };
    match LibraryRepository::update_bookmark(&*db, bmid, lbl) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_bookmark failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_delete_bookmark(
    db: *mut Database,
    bookmark_id: *const c_char,
) -> c_int {
    if db.is_null() || bookmark_id.is_null() {
        return -1;
    }
    let bmid = match to_opt_str(bookmark_id) {
        Some(s) => s,
        None => return -1,
    };
    match LibraryRepository::delete_bookmark(&*db, bmid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_bookmark failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_get_highlights(
    db: *mut Database,
    book_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || book_id.is_null() {
        return std::ptr::null_mut();
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match LibraryRepository::get_highlights(&*db, bid) {
        Ok(hls) => json_to_c_char(&hls),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_highlights failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_add_highlight(
    db: *mut Database,
    book_id: *const c_char,
    page_number: c_int,
    text_content: *const c_char,
    color: *const c_char,
    note: *const c_char,
) -> *mut c_char {
    if db.is_null() || book_id.is_null() || text_content.is_null() {
        return std::ptr::null_mut();
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let txt = match to_opt_str(text_content) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let col = to_opt_str(color);
    let nt = to_opt_str(note);
    match LibraryRepository::add_highlight(&*db, bid, page_number, txt, col, nt) {
        Ok(hl) => json_to_c_char(&hl),
        Err(e) => {
            eprintln!("[Synapse Bridge] add_highlight failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_update_highlight(
    db: *mut Database,
    highlight_id: *const c_char,
    color: *const c_char,
    note: *const c_char,
) -> c_int {
    if db.is_null() || highlight_id.is_null() || color.is_null() {
        return -1;
    }
    let hlid = match to_opt_str(highlight_id) {
        Some(s) => s,
        None => return -1,
    };
    let col = match to_opt_str(color) {
        Some(s) => s,
        None => return -1,
    };
    let nt = to_opt_str(note);
    match LibraryRepository::update_highlight(&*db, hlid, col, nt) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_highlight failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_update_highlight_note(
    db: *mut Database,
    highlight_id: *const c_char,
    note: *const c_char,
) -> c_int {
    if db.is_null() || highlight_id.is_null() {
        return -1;
    }
    let hlid = match to_opt_str(highlight_id) {
        Some(s) => s,
        None => return -1,
    };
    let nt = to_opt_str(note);
    match LibraryRepository::update_highlight_note(&*db, hlid, nt) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_highlight_note failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_delete_highlight(
    db: *mut Database,
    highlight_id: *const c_char,
) -> c_int {
    if db.is_null() || highlight_id.is_null() {
        return -1;
    }
    let hlid = match to_opt_str(highlight_id) {
        Some(s) => s,
        None => return -1,
    };
    match LibraryRepository::delete_highlight(&*db, hlid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_highlight failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_start_reading_session(
    db: *mut Database,
    book_id: *const c_char,
    start_page: c_int,
) -> *mut c_char {
    if db.is_null() || book_id.is_null() {
        return std::ptr::null_mut();
    }
    let bid = match to_opt_str(book_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match LibraryRepository::start_reading_session(&*db, bid, start_page) {
        Ok(Some(session_id)) => match CString::new(session_id) {
            Ok(cs) => cs.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] start_reading_session failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_end_reading_session(
    db: *mut Database,
    session_id: *const c_char,
    end_page: c_int,
    start_page: c_int,
) -> c_int {
    if db.is_null() || session_id.is_null() {
        return -1;
    }
    let sid = match to_opt_str(session_id) {
        Some(s) => s,
        None => return -1,
    };
    match LibraryRepository::end_reading_session(&*db, sid, end_page, start_page) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] end_reading_session failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_library_get_reading_stats(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match LibraryRepository::get_reading_stats(&*db) {
        Ok(stats) => json_to_c_char(&stats),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_reading_stats failed: {}", e);
            std::ptr::null_mut()
        }
    }
}
