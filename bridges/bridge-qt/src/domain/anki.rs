use super::helpers::{json_to_c_char, to_opt_str};
use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::anki::AnkiRepository;

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_get_decks(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match AnkiRepository::get_decks(&*db) {
        Ok(decks) => json_to_c_char(&decks),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_decks failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_get_hierarchical_decks(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match AnkiRepository::get_hierarchical_decks(&*db) {
        Ok(decks) => json_to_c_char(&decks),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_hierarchical_decks failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_get_deck_stats(db: *mut Database, deck_id: *const c_char) -> *mut c_char {
    if db.is_null() || deck_id.is_null() {
        return std::ptr::null_mut();
    }
    let id_str = match to_opt_str(deck_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };

    match AnkiRepository::get_deck_stats(&*db, id_str) {
        Ok(stats) => json_to_c_char(&stats),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_deck_stats failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_get_global_stats(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match AnkiRepository::get_global_anki_stats(&*db) {
        Ok(stats) => json_to_c_char(&stats),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_global_anki_stats failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_create_deck(
    db: *mut Database,
    name: *const c_char,
    description: *const c_char,
    color: *const c_char,
    parent_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || name.is_null() {
        return std::ptr::null_mut();
    }
    let name_str = match to_opt_str(name) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let desc_str = to_opt_str(description);
    let color_str = to_opt_str(color);
    let pid_str = to_opt_str(parent_id);

    match AnkiRepository::create_deck(&*db, name_str, desc_str, color_str, pid_str) {
        Ok(id) => match CString::new(id) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(e) => {
            eprintln!("[Synapse Bridge] create_deck failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_update_deck(
    db: *mut Database,
    deck_id: *const c_char,
    name: *const c_char,
    description: *const c_char,
    color: *const c_char,
) -> c_int {
    if db.is_null() || deck_id.is_null() || name.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(deck_id) {
        Some(s) => s,
        None => return -1,
    };
    let name_str = match to_opt_str(name) {
        Some(s) => s,
        None => return -1,
    };
    let desc_str = to_opt_str(description);
    let color_str = to_opt_str(color);

    match AnkiRepository::update_deck(&*db, id_str, name_str, desc_str, color_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_deck failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_delete_deck(
    db: *mut Database,
    deck_id: *const c_char,
) -> c_int {
    if db.is_null() || deck_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(deck_id) {
        Some(s) => s,
        None => return -1,
    };

    match AnkiRepository::delete_deck(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_deck failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_reset_deck(
    db: *mut Database,
    deck_id: *const c_char,
) -> c_int {
    if db.is_null() || deck_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(deck_id) {
        Some(s) => s,
        None => return -1,
    };

    match AnkiRepository::reset_deck_progress(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] reset_deck_progress failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_get_deck_cards(
    db: *mut Database,
    deck_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || deck_id.is_null() {
        return std::ptr::null_mut();
    }
    let id_str = match to_opt_str(deck_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };

    match AnkiRepository::get_deck_cards(&*db, id_str) {
        Ok(cards) => json_to_c_char(&cards),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_deck_cards failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_get_due_cards(
    db: *mut Database,
    deck_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || deck_id.is_null() {
        return std::ptr::null_mut();
    }
    let id_str = match to_opt_str(deck_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };

    match AnkiRepository::get_due_cards(&*db, id_str) {
        Ok(cards) => json_to_c_char(&cards),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_due_cards failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_create_card(
    db: *mut Database,
    deck_id: *const c_char,
    front: *const c_char,
    back: *const c_char,
    tags: *const c_char,
    card_type: *const c_char,
    extra_note: *const c_char,
) -> *mut c_char {
    if db.is_null() || deck_id.is_null() || front.is_null() || back.is_null() {
        return std::ptr::null_mut();
    }
    let deck_str = match to_opt_str(deck_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let front_str = match to_opt_str(front) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let back_str = match to_opt_str(back) {
        Some(s) => s,
        None => "",
    };
    let tags_str = to_opt_str(tags);
    let type_str = to_opt_str(card_type);
    let note_str = to_opt_str(extra_note);

    match AnkiRepository::create_card(&*db, deck_str, front_str, back_str, tags_str, type_str, note_str) {
        Ok(id) => match CString::new(id) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(e) => {
            eprintln!("[Synapse Bridge] create_card failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_update_card(
    db: *mut Database,
    card_id: *const c_char,
    front: *const c_char,
    back: *const c_char,
    tags: *const c_char,
    card_type: *const c_char,
    extra_note: *const c_char,
) -> c_int {
    if db.is_null() || card_id.is_null() || front.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(card_id) {
        Some(s) => s,
        None => return -1,
    };
    let front_str = match to_opt_str(front) {
        Some(s) => s,
        None => return -1,
    };
    let back_str = match to_opt_str(back) {
        Some(s) => s,
        None => "",
    };
    let tags_str = to_opt_str(tags);
    let type_str = to_opt_str(card_type);
    let note_str = to_opt_str(extra_note);

    match AnkiRepository::update_card(&*db, id_str, front_str, back_str, tags_str, type_str, note_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_card failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_delete_card(
    db: *mut Database,
    card_id: *const c_char,
) -> c_int {
    if db.is_null() || card_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(card_id) {
        Some(s) => s,
        None => return -1,
    };

    match AnkiRepository::delete_card(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_card failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_anki_record_review(
    db: *mut Database,
    card_id: *const c_char,
    rating: c_int,
) -> c_int {
    if db.is_null() || card_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(card_id) {
        Some(s) => s,
        None => return -1,
    };

    match AnkiRepository::record_card_review(&*db, id_str, rating) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] record_card_review failed: {}", e);
            -1
        }
    }
}
