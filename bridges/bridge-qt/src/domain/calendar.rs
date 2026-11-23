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

unsafe fn parse_reminders_json(reminders_json: *const c_char) -> Vec<i32> {
    if let Some(json_str) = to_opt_str(reminders_json) {
        if !json_str.trim().is_empty() {
            if let Ok(nums) = serde_json::from_str::<Vec<i32>>(json_str) {
                return nums;
            }
        }
    }
    Vec::new()
}

#[no_mangle]
pub unsafe extern "C" fn synapse_calendar_create_event_with_options(
    db: *mut Database,
    title: *const c_char,
    description: *const c_char,
    start_date: *const c_char,
    end_date: *const c_char,
    event_type: *const c_char,
    color: *const c_char,
    page_id: *const c_char,
    reminders_json: *const c_char,
    recurrence: *const c_char,
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
    let reminders = parse_reminders_json(reminders_json);
    let rec_str = to_opt_str(recurrence).unwrap_or("none");

    if rec_str != "none" && !rec_str.is_empty() {
        match CalendarRepository::create_event_series(
            &*db,
            title_str,
            desc_str,
            start_str,
            end_str,
            type_str,
            color_str,
            page_str,
            &reminders,
            rec_str,
        ) {
            Ok(events) => if !events.is_empty() { 1 } else { 0 },
            Err(e) => {
                eprintln!("[Synapse Bridge] create_event_series failed: {}", e);
                -1
            }
        }
    } else {
        match CalendarRepository::create_event_with_reminders(
            &*db,
            title_str,
            desc_str,
            start_str,
            end_str,
            type_str,
            color_str,
            page_str,
            &reminders,
        ) {
            Ok(Some(_)) => 1,
            Ok(None) => 0,
            Err(e) => {
                eprintln!("[Synapse Bridge] create_event_with_reminders failed: {}", e);
                -1
            }
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
pub unsafe extern "C" fn synapse_calendar_update_event_with_options(
    db: *mut Database,
    event_id: *const c_char,
    title: *const c_char,
    description: *const c_char,
    start_date: *const c_char,
    end_date: *const c_char,
    color: *const c_char,
    event_type: *const c_char,
    page_id: *const c_char,
    reminders_json: *const c_char,
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
    let reminders = parse_reminders_json(reminders_json);

    match CalendarRepository::update_event_with_reminders(
        &*db,
        id_str,
        title_str,
        desc_str,
        start_str,
        end_str,
        color_str,
        type_str,
        page_str,
        &reminders,
    ) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_event_with_reminders failed: {}", e);
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

#[no_mangle]
pub unsafe extern "C" fn synapse_calendar_delete_event_series(
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
    match CalendarRepository::delete_event_series(&*db, id_str) {
        Ok(count) => count as c_int,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_event_series failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_calendar_mark_reminder_notified(
    db: *mut Database,
    event_id: *const c_char,
    reminder_minutes: c_int,
) -> c_int {
    if db.is_null() || event_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(event_id) {
        Some(s) => s,
        None => return -1,
    };
    match CalendarRepository::mark_reminder_notified(&*db, id_str, reminder_minutes) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] mark_reminder_notified failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_calendar_get_events_for_date(
    db: *mut Database,
    date_prefix: *const c_char,
    include_null: c_int,
    limit: usize,
) -> *mut c_char {
    if db.is_null() || date_prefix.is_null() {
        return std::ptr::null_mut();
    }
    let prefix = match to_opt_str(date_prefix) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match CalendarRepository::get_events_for_date(&*db, prefix, include_null != 0, limit) {
        Ok(events) => json_to_c_char(&events),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_events_for_date failed: {}", e);
            std::ptr::null_mut()
        }
    }
}
