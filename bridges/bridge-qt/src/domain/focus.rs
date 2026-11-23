use super::helpers::{json_to_c_char, to_opt_str};
use std::os::raw::{c_char, c_double, c_int};
use synapse_core::db::Database;
use synapse_core::domain::focus::FocusRepository;

#[no_mangle]
pub unsafe extern "C" fn synapse_focus_get_lofis(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match FocusRepository::get_lofis(&*db) {
        Ok(lofis) => json_to_c_char(&lofis),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_lofis failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_focus_add_lofi(
    db: *mut Database,
    title: *const c_char,
    file_path: *const c_char,
    duration: c_double,
) -> c_int {
    if db.is_null() || title.is_null() || file_path.is_null() {
        return -1;
    }
    let title_str = match to_opt_str(title) {
        Some(s) => s,
        None => return -1,
    };
    let path_str = match to_opt_str(file_path) {
        Some(s) => s,
        None => return -1,
    };

    match FocusRepository::add_lofi_track(&*db, title_str, path_str, duration) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] add_lofi failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_focus_delete_lofi(
    db: *mut Database,
    lofi_id: *const c_char,
) -> c_int {
    if db.is_null() || lofi_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(lofi_id) {
        Some(s) => s,
        None => return -1,
    };
    match FocusRepository::delete_lofi(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_lofi failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_focus_get_sessions(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match FocusRepository::get_sessions(&*db) {
        Ok(sessions) => json_to_c_char(&sessions),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_focus_sessions failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_focus_record_session(
    db: *mut Database,
    tag: *const c_char,
    target_minutes: c_int,
    status: *const c_char,
    summary: *const c_char,
    description: *const c_char,
) -> c_int {
    if db.is_null() {
        return -1;
    }
    let tag_str = to_opt_str(tag).unwrap_or("Estudo");
    let status_str = to_opt_str(status).unwrap_or("completed");
    let summary_str = to_opt_str(summary).unwrap_or("");
    let desc_str = to_opt_str(description).unwrap_or("");

    match FocusRepository::record_session(&*db, tag_str, target_minutes, status_str, summary_str, desc_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] record_focus_session failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_focus_delete_session(
    db: *mut Database,
    session_id: *const c_char,
) -> c_int {
    if db.is_null() || session_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(session_id) {
        Some(s) => s,
        None => return -1,
    };
    match FocusRepository::delete_session(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_focus_session failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_focus_clear_sessions_range(
    db: *mut Database,
    range: *const c_char,
) -> c_int {
    if db.is_null() {
        return -1;
    }
    let range_str = to_opt_str(range).unwrap_or("all");
    match FocusRepository::clear_sessions_range(&*db, range_str) {
        Ok(count) => count as c_int,
        Err(e) => {
            eprintln!("[Synapse Bridge] clear_focus_sessions_range failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_focus_get_alarms(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match FocusRepository::get_alarms(&*db) {
        Ok(alarms) => json_to_c_char(&alarms),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_alarms failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_focus_create_alarm(
    db: *mut Database,
    time: *const c_char,
    label: *const c_char,
    sound: *const c_char,
    enabled: c_int,
    days: *const c_char,
) -> c_int {
    if db.is_null() || time.is_null() {
        return -1;
    }
    let time_str = match to_opt_str(time) {
        Some(s) => s,
        None => return -1,
    };
    let label_str = to_opt_str(label).unwrap_or("");
    let sound_str = to_opt_str(sound).unwrap_or("bell");
    let days_str = to_opt_str(days).unwrap_or("[]");

    match FocusRepository::create_alarm(&*db, time_str, label_str, sound_str, enabled != 0, days_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] create_alarm failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_focus_update_alarm(
    db: *mut Database,
    alarm_id: *const c_char,
    time: *const c_char,
    label: *const c_char,
    sound: *const c_char,
    enabled: c_int,
    days: *const c_char,
) -> c_int {
    if db.is_null() || alarm_id.is_null() || time.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(alarm_id) {
        Some(s) => s,
        None => return -1,
    };
    let time_str = match to_opt_str(time) {
        Some(s) => s,
        None => return -1,
    };
    let label_str = to_opt_str(label).unwrap_or("");
    let sound_str = to_opt_str(sound).unwrap_or("bell");
    let days_str = to_opt_str(days).unwrap_or("[]");

    match FocusRepository::update_alarm(&*db, id_str, time_str, label_str, sound_str, enabled != 0, days_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_alarm failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_focus_toggle_alarm(
    db: *mut Database,
    alarm_id: *const c_char,
) -> c_int {
    if db.is_null() || alarm_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(alarm_id) {
        Some(s) => s,
        None => return -1,
    };
    match FocusRepository::toggle_alarm(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] toggle_alarm failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_focus_delete_alarm(
    db: *mut Database,
    alarm_id: *const c_char,
) -> c_int {
    if db.is_null() || alarm_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(alarm_id) {
        Some(s) => s,
        None => return -1,
    };
    match FocusRepository::delete_alarm(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_alarm failed: {}", e);
            -1
        }
    }
}
