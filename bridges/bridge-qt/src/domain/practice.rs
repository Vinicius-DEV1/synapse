//! C ABI bindings for the Practice and AI tutor domain.

use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::practice::{PracticeRepository, TutorMemory, TutorMessage, TutorSession};

use super::helpers::{json_to_c_char, to_opt_str};

#[no_mangle]
pub unsafe extern "C" fn synapse_practice_get_sessions(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match PracticeRepository::get_sessions(&*db) {
        Ok(sessions) => json_to_c_char(&sessions),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_sessions failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_practice_get_session(
    db: *mut Database,
    session_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || session_id.is_null() {
        return std::ptr::null_mut();
    }
    let sid = match to_opt_str(session_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match PracticeRepository::get_session(&*db, sid) {
        Ok(Some(session)) => json_to_c_char(&session),
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_session failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_practice_create_session(
    db: *mut Database,
    title: *const c_char,
    custom_prompt: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let id = uuid::Uuid::new_v4().to_string();
    let t = to_opt_str(title).unwrap_or("Sessão de Prática").to_string();
    let started = chrono::Utc::now().to_rfc3339();
    let prompt = to_opt_str(custom_prompt).map(|s| s.to_string());

    let session = TutorSession {
        id: id.clone(),
        title: t,
        started_at: started,
        ended_at: None,
        custom_prompt: prompt,
        deleted_at: None,
    };

    match PracticeRepository::save_session(&*db, &session) {
        Ok(_) => match std::ffi::CString::new(id) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(e) => {
            eprintln!("[Synapse Bridge] create_session failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_practice_delete_session(
    db: *mut Database,
    session_id: *const c_char,
) -> c_int {
    if db.is_null() || session_id.is_null() {
        return -1;
    }
    let sid = match to_opt_str(session_id) {
        Some(s) => s,
        None => return -1,
    };
    match PracticeRepository::delete_session(&*db, sid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_session failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_practice_get_messages(
    db: *mut Database,
    session_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || session_id.is_null() {
        return std::ptr::null_mut();
    }
    let sid = match to_opt_str(session_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match PracticeRepository::get_messages(&*db, sid) {
        Ok(msgs) => json_to_c_char(&msgs),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_messages failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_practice_create_message(
    db: *mut Database,
    session_id: *const c_char,
    role: *const c_char,
    text_content: *const c_char,
) -> *mut c_char {
    if db.is_null() || session_id.is_null() || text_content.is_null() {
        return std::ptr::null_mut();
    }
    let sid = match to_opt_str(session_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let r = to_opt_str(role).unwrap_or("user");
    let content = match to_opt_str(text_content) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };

    let id = uuid::Uuid::new_v4().to_string();
    let msg = TutorMessage {
        id: id.clone(),
        session_id: sid.to_string(),
        role: r.to_string(),
        text_content: content.to_string(),
        created_at: Some(chrono::Utc::now().to_rfc3339()),
    };

    match PracticeRepository::save_message(&*db, &msg) {
        Ok(_) => match std::ffi::CString::new(id) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(e) => {
            eprintln!("[Synapse Bridge] create_message failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_practice_get_memories(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match PracticeRepository::get_memories(&*db) {
        Ok(mems) => json_to_c_char(&mems),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_memories failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_practice_create_memory(
    db: *mut Database,
    category: *const c_char,
    fact: *const c_char,
) -> *mut c_char {
    if db.is_null() || category.is_null() || fact.is_null() {
        return std::ptr::null_mut();
    }
    let cat = match to_opt_str(category) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let f = match to_opt_str(fact) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };

    let id = uuid::Uuid::new_v4().to_string();
    let mem = TutorMemory {
        id: id.clone(),
        category: cat.to_string(),
        fact: f.to_string(),
        created_at: Some(chrono::Utc::now().to_rfc3339()),
        deleted_at: None,
    };

    match PracticeRepository::save_memory(&*db, &mem) {
        Ok(_) => match std::ffi::CString::new(id) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(e) => {
            eprintln!("[Synapse Bridge] create_memory failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_practice_delete_memory(
    db: *mut Database,
    memory_id: *const c_char,
) -> c_int {
    if db.is_null() || memory_id.is_null() {
        return -1;
    }
    let mid = match to_opt_str(memory_id) {
        Some(s) => s,
        None => return -1,
    };
    match PracticeRepository::delete_memory(&*db, mid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_memory failed: {}", e);
            -1
        }
    }
}
