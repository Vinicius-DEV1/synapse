use super::helpers::{json_to_c_char, to_opt_str};
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::notifications::NotificationsRepository;

#[no_mangle]
pub unsafe extern "C" fn synapse_notifications_get(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match NotificationsRepository::get_notifications(&*db) {
        Ok(items) => json_to_c_char(&items),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_notifications failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notifications_get_unread_count(db: *mut Database) -> c_int {
    if db.is_null() {
        return 0;
    }
    NotificationsRepository::get_unread_count(&*db).unwrap_or(0)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notifications_add(
    db: *mut Database,
    title: *const c_char,
    message: *const c_char,
    notif_type: *const c_char,
    target_page_id: *const c_char,
    event_id: *const c_char,
    scheduled_for: *const c_char,
) -> c_int {
    if db.is_null() || title.is_null() {
        return -1;
    }
    let title_str = match to_opt_str(title) {
        Some(s) => s,
        None => return -1,
    };
    let msg_str = to_opt_str(message).unwrap_or("");
    let type_str = to_opt_str(notif_type).unwrap_or("system");
    let page_str = to_opt_str(target_page_id);
    let event_str = to_opt_str(event_id);
    let sched_str = to_opt_str(scheduled_for);

    match NotificationsRepository::add_notification(&*db, title_str, msg_str, type_str, page_str, event_str, sched_str) {
        Ok(_) => 1,
        Err(e) => {
            eprintln!("[Synapse Bridge] add_notification failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notifications_mark_read(
    db: *mut Database,
    notification_id: *const c_char,
) -> c_int {
    if db.is_null() {
        return -1;
    }
    let id_opt = to_opt_str(notification_id);
    match NotificationsRepository::mark_read(&*db, id_opt) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] mark_read failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notifications_delete(
    db: *mut Database,
    notification_id: *const c_char,
) -> c_int {
    if db.is_null() || notification_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(notification_id) {
        Some(s) => s,
        None => return -1,
    };
    match NotificationsRepository::delete_notification(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_notification failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notifications_deliver_due(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match NotificationsRepository::deliver_due_notifications(&*db) {
        Ok(items) => json_to_c_char(&items),
        Err(e) => {
            eprintln!("[Synapse Bridge] deliver_due_notifications failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notifications_snooze(
    db: *mut Database,
    id: *const c_char,
    delay_minutes: c_int,
    title_suffix: *const c_char,
) -> c_int {
    if db.is_null() || id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(id) {
        Some(s) => s,
        None => return -1,
    };
    let suffix_str = to_opt_str(title_suffix).unwrap_or("Adiado");
    let delay = if delay_minutes <= 0 { 10 } else { delay_minutes as u32 };

    match NotificationsRepository::snooze_notification(&*db, id_str, delay, suffix_str) {
        Ok(_) => 1,
        Err(e) => {
            eprintln!("[Synapse Bridge] snooze_notification failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notifications_clear_all(db: *mut Database) -> c_int {
    if db.is_null() {
        return -1;
    }
    match NotificationsRepository::clear_all(&*db) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] clear_all failed: {}", e);
            -1
        }
    }
}
