use super::helpers::{json_to_c_char, to_opt_str};
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::culture::{CultureItem, CultureRepository};

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_get_items(
    db: *mut Database,
    status_filter: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let filter = to_opt_str(status_filter);
    match CultureRepository::get_items(&*db, filter) {
        Ok(items) => json_to_c_char(&items),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_culture_items failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_create_item(
    db: *mut Database,
    title: *const c_char,
    item_type: *const c_char,
    synopsis: *const c_char,
    total_episodes: c_int,
    cover_image: *const c_char,
    goal_note: *const c_char,
    access_link: *const c_char,
) -> c_int {
    if db.is_null() || title.is_null() {
        return -1;
    }
    let title_str = match to_opt_str(title) {
        Some(s) => s,
        None => return -1,
    };

    let item = CultureItem {
        title: title_str.to_string(),
        item_type: to_opt_str(item_type).unwrap_or("anime").to_string(),
        synopsis: to_opt_str(synopsis).map(String::from),
        total_episodes: total_episodes.max(0),
        total_progress: total_episodes.max(0),
        cover_image: to_opt_str(cover_image).map(String::from),
        goal_note: to_opt_str(goal_note).map(String::from),
        access_link: to_opt_str(access_link).map(String::from),
        status: Some("backlog".to_string()),
        ..Default::default()
    };

    match CultureRepository::create_item(&*db, item) {
        Ok(_) => 1,
        Err(e) => {
            eprintln!("[Synapse Bridge] create_culture_item failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_update_item(
    db: *mut Database,
    item_id: *const c_char,
    title: *const c_char,
    item_type: *const c_char,
    synopsis: *const c_char,
    total_episodes: c_int,
    cover_image: *const c_char,
    status: *const c_char,
    goal_note: *const c_char,
    access_link: *const c_char,
) -> c_int {
    if db.is_null() || item_id.is_null() || title.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(item_id) {
        Some(s) => s,
        None => return -1,
    };
    let title_str = match to_opt_str(title) {
        Some(s) => s,
        None => return -1,
    };

    let item = CultureItem {
        id: id_str.to_string(),
        title: title_str.to_string(),
        item_type: to_opt_str(item_type).unwrap_or("anime").to_string(),
        synopsis: to_opt_str(synopsis).map(String::from),
        total_episodes: total_episodes.max(0),
        total_progress: total_episodes.max(0),
        cover_image: to_opt_str(cover_image).map(String::from),
        status: to_opt_str(status).map(String::from),
        goal_note: to_opt_str(goal_note).map(String::from),
        access_link: to_opt_str(access_link).map(String::from),
        ..Default::default()
    };

    match CultureRepository::update_item(&*db, id_str, &item) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_culture_item failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_increment_progress(
    db: *mut Database,
    item_id: *const c_char,
) -> c_int {
    if db.is_null() || item_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(item_id) {
        Some(s) => s,
        None => return -1,
    };
    match CultureRepository::increment_progress(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] increment_culture_progress failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_update_progress(
    db: *mut Database,
    item_id: *const c_char,
    progress: c_int,
) -> c_int {
    if db.is_null() || item_id.is_null() || progress < 0 {
        return -1;
    }
    let id_str = match to_opt_str(item_id) {
        Some(s) => s,
        None => return -1,
    };
    match CultureRepository::update_progress(&*db, id_str, progress) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_culture_progress failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_update_status(
    db: *mut Database,
    item_id: *const c_char,
    status: *const c_char,
) -> c_int {
    if db.is_null() || item_id.is_null() || status.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(item_id) {
        Some(s) => s,
        None => return -1,
    };
    let status_str = match to_opt_str(status) {
        Some(s) => s,
        None => return -1,
    };
    match CultureRepository::update_status(&*db, id_str, status_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_culture_status failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_set_goal(
    db: *mut Database,
    item_id: *const c_char,
    is_goal: c_int,
    goal_note: *const c_char,
) -> c_int {
    if db.is_null() || item_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(item_id) {
        Some(s) => s,
        None => return -1,
    };
    let note = to_opt_str(goal_note).unwrap_or("");
    match CultureRepository::set_goal(&*db, id_str, is_goal != 0, note) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] set_culture_goal failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_delete_item(
    db: *mut Database,
    item_id: *const c_char,
) -> c_int {
    if db.is_null() || item_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(item_id) {
        Some(s) => s,
        None => return -1,
    };
    match CultureRepository::delete_item(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_culture_item failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_get_episodes(
    db: *mut Database,
    item_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || item_id.is_null() {
        return std::ptr::null_mut();
    }
    let id_str = match to_opt_str(item_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match CultureRepository::get_episodes(&*db, id_str) {
        Ok(episodes) => json_to_c_char(&episodes),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_culture_episodes failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_add_episode(
    db: *mut Database,
    item_id: *const c_char,
    episode_number: c_int,
    title: *const c_char,
    synopsis: *const c_char,
    season_number: c_int,
    episode_in_season: c_int,
    aired_at: *const c_char,
) -> c_int {
    if db.is_null() || item_id.is_null() || episode_number <= 0 {
        return -1;
    }
    let id_str = match to_opt_str(item_id) {
        Some(s) => s,
        None => return -1,
    };
    let title_str = to_opt_str(title).unwrap_or("");
    let syn_str = to_opt_str(synopsis).unwrap_or("");
    let aired_str = to_opt_str(aired_at);

    match CultureRepository::add_episode(
        &*db,
        id_str,
        episode_number,
        title_str,
        syn_str,
        season_number,
        episode_in_season,
        aired_str,
    ) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] add_culture_episode failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_toggle_episode_watched(
    db: *mut Database,
    episode_id: *const c_char,
    item_id: *const c_char,
) -> c_int {
    if db.is_null() || episode_id.is_null() || item_id.is_null() {
        return -1;
    }
    let ep_str = match to_opt_str(episode_id) {
        Some(s) => s,
        None => return -1,
    };
    let item_str = match to_opt_str(item_id) {
        Some(s) => s,
        None => return -1,
    };

    match CultureRepository::toggle_episode_watched(&*db, ep_str, item_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] toggle_episode_watched failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_bulk_create_episodes(
    db: *mut Database,
    item_id: *const c_char,
    count: c_int,
) -> c_int {
    if db.is_null() || item_id.is_null() || count <= 0 {
        return -1;
    }
    let id_str = match to_opt_str(item_id) {
        Some(s) => s,
        None => return -1,
    };

    match CultureRepository::bulk_create_episodes(&*db, id_str, count) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] bulk_create_episodes failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_culture_delete_episode(
    db: *mut Database,
    episode_id: *const c_char,
) -> c_int {
    if db.is_null() || episode_id.is_null() {
        return -1;
    }
    let ep_str = match to_opt_str(episode_id) {
        Some(s) => s,
        None => return -1,
    };

    match CultureRepository::delete_episode(&*db, ep_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_culture_episode failed: {}", e);
            -1
        }
    }
}
