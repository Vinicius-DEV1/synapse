use super::helpers::{json_to_c_char, to_opt_str};
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::calendar::CalendarRepository;

#[no_mangle]
pub unsafe extern "C" fn synapse_calendar_get_events(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match CalendarRepository::get_events(&*db) {
        Ok(events) => json_to_c_char(&events),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_calendar_events failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_calendar_create_event(
    db: *mut Database,
    title: *const c_char,
    description: *const c_char,
    start_date: *const c_char,
    end_date: *const c_char,
    event_type: *const c_char,
    color: *const c_char,
    page_id: *const c_char,
) -> c_int {
    if db.is_null() || title.is_null() || start_date.is_null() || end_date.is_null() {
        return -1;
    }
    let title_str = match to_opt_str(title) {
        Some(s) => s,
        None => return -1,
    };
    let start_str = match to_opt_str(start_date) {
        Some(s) => s,
        None => return -1,
    };
    let end_str = match to_opt_str(end_date) {
        Some(s) => s,
        None => return -1,
    };
    let desc_str = to_opt_str(description).unwrap_or("");
    let type_str = to_opt_str(event_type).unwrap_or("event");
    let color_str = to_opt_str(color).unwrap_or("#3b82f6");
    let page_str = to_opt_str(page_id);

    match CalendarRepository::create_event(&*db, title_str, desc_str, start_str, end_str, type_str, color_str, page_str) {
        Ok(Some(_)) => 1,
        Ok(None) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] create_calendar_event failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_calendar_update_event(
    db: *mut Database,
    event_id: *const c_char,
    title: *const c_char,
    description: *const c_char,
    start_date: *const c_char,
    end_date: *const c_char,
    color: *const c_char,
    event_type: *const c_char,
    page_id: *const c_char,
) -> c_int {
    if db.is_null() || event_id.is_null() || title.is_null() || start_date.is_null() || end_date.is_null() || color.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(event_id) {
        Some(s) => s,
        None => return -1,
    };
    let title_str = match to_opt_str(title) {
        Some(s) => s,
        None => return -1,
    };
    let start_str = match to_opt_str(start_date) {
        Some(s) => s,
        None => return -1,
    };
    let end_str = match to_opt_str(end_date) {
        Some(s) => s,
        None => return -1,
    };
    let color_str = match to_opt_str(color) {
        Some(s) => s,
        None => return -1,
    };
    let desc_str = to_opt_str(description).unwrap_or("");
    let type_str = to_opt_str(event_type);
    let page_str = to_opt_str(page_id);

    match CalendarRepository::update_event(&*db, id_str, title_str, desc_str, start_str, end_str, color_str, type_str, page_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_calendar_event failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_calendar_toggle_status(
    db: *mut Database,
    event_id: *const c_char,
) -> c_int {
    if db.is_null() || event_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(event_id) {
        Some(s) => s,
        None => return -1,
    };
    match CalendarRepository::toggle_status(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] toggle_calendar_status failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_calendar_delete_event(
    db: *mut Database,
    event_id: *const c_char,
) -> c_int {
    if db.is_null() || event_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(event_id) {
        Some(s) => s,
        None => return -1,
    };
    match CalendarRepository::delete_event(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_calendar_event failed: {}", e);
            -1
        }
    }
}
