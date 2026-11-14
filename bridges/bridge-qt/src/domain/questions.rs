use super::helpers::{json_to_c_char, to_opt_str};
use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::questions::QuizRepository;

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_get_batteries(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match QuizRepository::get_quiz_batteries(&*db) {
        Ok(batteries) => json_to_c_char(&batteries),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_quiz_batteries failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_create_battery(
    db: *mut Database,
    title: *const c_char,
    description: *const c_char,
) -> *mut c_char {
    if db.is_null() || title.is_null() {
        return std::ptr::null_mut();
    }
    let title_str = match to_opt_str(title) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let desc_str = to_opt_str(description);

    match QuizRepository::create_quiz_battery(&*db, title_str, desc_str) {
        Ok(id) => match CString::new(id) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(e) => {
            eprintln!("[Synapse Bridge] create_quiz_battery failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_update_battery(
    db: *mut Database,
    battery_id: *const c_char,
    title: *const c_char,
    description: *const c_char,
) -> c_int {
    if db.is_null() || battery_id.is_null() || title.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(battery_id) {
        Some(s) => s,
        None => return -1,
    };
    let title_str = match to_opt_str(title) {
        Some(s) => s,
        None => return -1,
    };
    let desc_str = to_opt_str(description);

    match QuizRepository::update_quiz_battery(&*db, id_str, title_str, desc_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_quiz_battery failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_delete_battery(
    db: *mut Database,
    battery_id: *const c_char,
) -> c_int {
    if db.is_null() || battery_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(battery_id) {
        Some(s) => s,
        None => return -1,
    };

    match QuizRepository::delete_quiz_battery(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_quiz_battery failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_get_battery_questions(
    db: *mut Database,
    battery_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || battery_id.is_null() {
        return std::ptr::null_mut();
    }
    let id_str = match to_opt_str(battery_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };

    match QuizRepository::get_battery_questions(&*db, id_str) {
        Ok(questions) => json_to_c_char(&questions),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_battery_questions failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_get_all_questions(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match QuizRepository::get_all_quiz_questions(&*db) {
        Ok(questions) => json_to_c_char(&questions),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_all_quiz_questions failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_get_all_tags(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match QuizRepository::get_all_quiz_tags(&*db) {
        Ok(tags) => json_to_c_char(&tags),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_all_quiz_tags failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_get_error_notebook(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match QuizRepository::get_error_notebook_questions(&*db) {
        Ok(questions) => json_to_c_char(&questions),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_error_notebook failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_get_random_simulation(db: *mut Database, limit: c_int) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match QuizRepository::get_random_simulation_questions(&*db, limit) {
        Ok(questions) => json_to_c_char(&questions),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_random_simulation failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_get_filtered_questions(
    db: *mut Database,
    tags_json: *const c_char,
    status: *const c_char,
    limit: c_int,
    shuffle: c_int,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let tags_str = to_opt_str(tags_json);
    let status_str = to_opt_str(status);

    match QuizRepository::get_filtered_quiz_questions(&*db, tags_str, status_str, limit, shuffle != 0) {
        Ok(questions) => json_to_c_char(&questions),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_filtered_quiz_questions failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_create_question(
    db: *mut Database,
    battery_id: *const c_char,
    question: *const c_char,
    options_json: *const c_char,
    correct_index: c_int,
    explanation: *const c_char,
    tags_json: *const c_char,
) -> c_int {
    if db.is_null() || battery_id.is_null() || question.is_null() || options_json.is_null() {
        return -1;
    }
    let bat_id = match to_opt_str(battery_id) {
        Some(s) => s,
        None => return -1,
    };
    let q_str = match to_opt_str(question) {
        Some(s) => s,
        None => return -1,
    };
    let opt_str = match to_opt_str(options_json) {
        Some(s) => s,
        None => return -1,
    };
    let expl_str = to_opt_str(explanation);
    let tags_str = to_opt_str(tags_json);

    match QuizRepository::create_quiz_question(&*db, bat_id, q_str, opt_str, correct_index, expl_str, tags_str) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] create_quiz_question failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_update_question(
    db: *mut Database,
    question_id: *const c_char,
    question: *const c_char,
    options_json: *const c_char,
    correct_index: c_int,
    explanation: *const c_char,
    tags_json: *const c_char,
) -> c_int {
    if db.is_null() || question_id.is_null() || question.is_null() || options_json.is_null() {
        return -1;
    }
    let q_id = match to_opt_str(question_id) {
        Some(s) => s,
        None => return -1,
    };
    let q_str = match to_opt_str(question) {
        Some(s) => s,
        None => return -1,
    };
    let opt_str = match to_opt_str(options_json) {
        Some(s) => s,
        None => return -1,
    };
    let expl_str = to_opt_str(explanation);
    let tags_str = to_opt_str(tags_json);

    match QuizRepository::update_quiz_question(&*db, q_id, q_str, opt_str, correct_index, expl_str, tags_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_quiz_question failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_delete_question(
    db: *mut Database,
    question_id: *const c_char,
) -> c_int {
    if db.is_null() || question_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(question_id) {
        Some(s) => s,
        None => return -1,
    };

    match QuizRepository::delete_quiz_question(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_quiz_question failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_record_attempt(
    db: *mut Database,
    battery_id: *const c_char,
    question_id: *const c_char,
    selected_index: c_int,
    is_correct: c_int,
) -> c_int {
    if db.is_null() || battery_id.is_null() || question_id.is_null() {
        return -1;
    }
    let bat_id = match to_opt_str(battery_id) {
        Some(s) => s,
        None => return -1,
    };
    let q_id = match to_opt_str(question_id) {
        Some(s) => s,
        None => return -1,
    };

    match QuizRepository::record_quiz_attempt(&*db, bat_id, q_id, selected_index, is_correct != 0) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] record_quiz_attempt failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_get_stats(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match QuizRepository::get_quiz_stats(&*db) {
        Ok(stats) => json_to_c_char(&stats),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_quiz_stats failed: {}", e);
            std::ptr::null_mut()
        }
    }
}
