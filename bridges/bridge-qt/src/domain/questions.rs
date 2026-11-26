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
pub unsafe extern "C" fn synapse_quiz_get_battery(
    db: *mut Database,
    battery_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || battery_id.is_null() {
        return std::ptr::null_mut();
    }
    let Some(id) = to_opt_str(battery_id) else {
        return std::ptr::null_mut();
    };
    match QuizRepository::get_quiz_battery(&*db, id) {
        Ok(battery) => json_to_c_char(&battery),
        Err(error) => {
            eprintln!("[Synapse Bridge] get_quiz_battery failed: {}", error);
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
pub unsafe extern "C" fn synapse_quiz_create_battery_for_page(
    db: *mut Database,
    title: *const c_char,
    description: *const c_char,
    page_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || title.is_null() || page_id.is_null() {
        return std::ptr::null_mut();
    }
    let Some(title_str) = to_opt_str(title) else {
        return std::ptr::null_mut();
    };
    let Some(page_id_str) = to_opt_str(page_id) else {
        return std::ptr::null_mut();
    };
    let description_str = to_opt_str(description);

    match QuizRepository::create_quiz_battery_for_page(
        &*db,
        title_str,
        description_str,
        page_id_str,
    ) {
        Ok(id) => match CString::new(id) {
            Ok(value) => value.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(error) => {
            eprintln!(
                "[Synapse Bridge] create_quiz_battery_for_page failed: {}",
                error
            );
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
pub unsafe extern "C" fn synapse_quiz_get_question(
    db: *mut Database,
    question_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || question_id.is_null() {
        return std::ptr::null_mut();
    }
    let Some(id) = to_opt_str(question_id) else {
        return std::ptr::null_mut();
    };
    match QuizRepository::get_quiz_question(&*db, id) {
        Ok(question) => json_to_c_char(&question),
        Err(error) => {
            eprintln!("[Synapse Bridge] get_quiz_question failed: {}", error);
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
pub unsafe extern "C" fn synapse_quiz_record_open_answer_attempt(
    db: *mut Database,
    battery_id: *const c_char,
    question_id: *const c_char,
    user_typed_answer: *const c_char,
    verdict: *const c_char,
    feedback: *const c_char,
    model: *const c_char,
) -> *mut c_char {
    if db.is_null()
        || battery_id.is_null()
        || question_id.is_null()
        || user_typed_answer.is_null()
        || verdict.is_null()
        || feedback.is_null()
    {
        return std::ptr::null_mut();
    }
    let Some(battery_id) = to_opt_str(battery_id) else {
        return std::ptr::null_mut();
    };
    let Some(question_id) = to_opt_str(question_id) else {
        return std::ptr::null_mut();
    };
    let Some(user_typed_answer) = to_opt_str(user_typed_answer) else {
        return std::ptr::null_mut();
    };
    let Some(verdict) = to_opt_str(verdict) else {
        return std::ptr::null_mut();
    };
    let Some(feedback_text) = to_opt_str(feedback) else {
        return std::ptr::null_mut();
    };
    let feedback = synapse_core::domain::questions::QuizAiFeedback {
        verdict: verdict.to_owned(),
        feedback: feedback_text.to_owned(),
        model: to_opt_str(model).map(str::to_owned),
    };

    match QuizRepository::record_open_answer_attempt(
        &*db,
        battery_id,
        question_id,
        user_typed_answer,
        feedback,
    ) {
        Ok(attempt) => json_to_c_char(&attempt),
        Err(error) => {
            eprintln!(
                "[Synapse Bridge] record_open_answer_attempt failed: {}",
                error
            );
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_get_latest_attempts(
    db: *mut Database,
    battery_id: *const c_char,
    question_id: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let battery_id = to_opt_str(battery_id);
    let question_id = to_opt_str(question_id);
    match QuizRepository::get_latest_quiz_attempts(&*db, battery_id, question_id) {
        Ok(attempts) => json_to_c_char(&attempts),
        Err(error) => {
            eprintln!(
                "[Synapse Bridge] get_latest_quiz_attempts failed: {}",
                error
            );
            std::ptr::null_mut()
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

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_get_battery_tree(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match QuizRepository::build_battery_tree(&*db) {
        Ok(tree) => json_to_c_char(&tree),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_battery_tree failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_create_child_battery(
    db: *mut Database,
    parent_id: *const c_char,
    title: *const c_char,
    description: *const c_char,
) -> *mut c_char {
    if db.is_null() || title.is_null() {
        return std::ptr::null_mut();
    }
    let Some(t) = to_opt_str(title) else {
        return std::ptr::null_mut();
    };
    let pid = to_opt_str(parent_id);
    let desc = to_opt_str(description);
    match QuizRepository::create_child_quiz_battery(&*db, pid, t, desc) {
        Ok(id) => match CString::new(id) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(e) => {
            eprintln!("[Synapse Bridge] create_child_battery failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_get_available_parent_options(
    db: *mut Database,
    moving_battery_id: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let mid = to_opt_str(moving_battery_id);
    match QuizRepository::get_available_parent_options(&*db, mid) {
        Ok(opts) => json_to_c_char(&opts),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_available_parent_options failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_move_battery(
    db: *mut Database,
    battery_id: *const c_char,
    new_parent_id: *const c_char,
) -> c_int {
    if db.is_null() || battery_id.is_null() {
        return -1;
    }
    let Some(bid) = to_opt_str(battery_id) else {
        return -1;
    };
    let pid = to_opt_str(new_parent_id);
    match QuizRepository::move_quiz_battery(&*db, bid, pid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] move_battery failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_quiz_parse_import_text(raw_text: *const c_char) -> *mut c_char {
    let raw = to_opt_str(raw_text).unwrap_or("");
    let parsed = synapse_core::domain::questions::parse_import_questions(raw);
    json_to_c_char(&parsed)
}
