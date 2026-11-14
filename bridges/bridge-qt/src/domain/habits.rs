use super::helpers::{json_to_c_char, to_opt_str};
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::habits::HabitsRepository;

#[no_mangle]
pub unsafe extern "C" fn synapse_habits_get_habits(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match HabitsRepository::get_habits(&*db) {
        Ok(habits) => json_to_c_char(&habits),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_habits failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_habits_create_habit(
    db: *mut Database,
    title: *const c_char,
    color: *const c_char,
    icon: *const c_char,
    target_days: c_int,
) -> c_int {
    if db.is_null() || title.is_null() {
        return -1;
    }
    let title_str = match to_opt_str(title) {
        Some(s) => s,
        None => return -1,
    };
    let color_str = to_opt_str(color);
    let icon_str = to_opt_str(icon);

    match HabitsRepository::create_habit(&*db, title_str, color_str, icon_str, Some(target_days)) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] create_habit failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_habits_update_habit(
    db: *mut Database,
    habit_id: *const c_char,
    title: *const c_char,
    color: *const c_char,
    icon: *const c_char,
    target_days: c_int,
) -> c_int {
    if db.is_null() || habit_id.is_null() || title.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(habit_id) {
        Some(s) => s,
        None => return -1,
    };
    let title_str = match to_opt_str(title) {
        Some(s) => s,
        None => return -1,
    };
    let color_str = to_opt_str(color);
    let icon_str = to_opt_str(icon);

    match HabitsRepository::update_habit(&*db, id_str, title_str, color_str, icon_str, Some(target_days)) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_habit failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_habits_delete_habit(
    db: *mut Database,
    habit_id: *const c_char,
) -> c_int {
    if db.is_null() || habit_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(habit_id) {
        Some(s) => s,
        None => return -1,
    };

    match HabitsRepository::delete_habit(&*db, id_str) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_habit failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_habits_get_logs(
    db: *mut Database,
    date: *const c_char,
) -> *mut c_char {
    if db.is_null() || date.is_null() {
        return std::ptr::null_mut();
    }
    let date_str = match to_opt_str(date) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };

    match HabitsRepository::get_habit_logs(&*db, date_str) {
        Ok(logs) => json_to_c_char(&logs),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_habit_logs failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_habits_get_logs_range(
    db: *mut Database,
    start_date: *const c_char,
    end_date: *const c_char,
) -> *mut c_char {
    if db.is_null() || start_date.is_null() || end_date.is_null() {
        return std::ptr::null_mut();
    }
    let start_str = match to_opt_str(start_date) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let end_str = match to_opt_str(end_date) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };

    match HabitsRepository::get_habit_logs_range(&*db, start_str, end_str) {
        Ok(logs) => json_to_c_char(&logs),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_habit_logs_range failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_habits_toggle_checkin(
    db: *mut Database,
    habit_id: *const c_char,
    date: *const c_char,
    out_checked: *mut c_int,
) -> c_int {
    if db.is_null() || habit_id.is_null() || date.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(habit_id) {
        Some(s) => s,
        None => return -1,
    };
    let date_str = match to_opt_str(date) {
        Some(s) => s,
        None => return -1,
    };

    match HabitsRepository::toggle_habit_checkin(&*db, id_str, date_str) {
        Ok(checked) => {
            if !out_checked.is_null() {
                *out_checked = if checked { 1 } else { 0 };
            }
            0
        }
        Err(e) => {
            eprintln!("[Synapse Bridge] toggle_habit_checkin failed: {}", e);
            -1
        }
    }
}
