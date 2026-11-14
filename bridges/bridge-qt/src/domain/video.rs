//! C ABI bridge for the Video domain module.

use super::helpers::{json_to_c_char, to_opt_str};
use std::ffi::CString;
use std::os::raw::{c_char, c_double, c_int};
use synapse_core::db::Database;
use synapse_core::domain::video::{
    subtitles, VideoFolder, VideoRecord, VideoRepository,
};

#[no_mangle]
pub unsafe extern "C" fn synapse_video_get_all(
    db: *mut Database,
    filter: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let filter_str = to_opt_str(filter);
    match VideoRepository::get_videos(&*db, filter_str) {
        Ok(videos) => json_to_c_char(&videos),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_videos failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_get_one(
    db: *mut Database,
    video_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || video_id.is_null() {
        return std::ptr::null_mut();
    }
    let vid = match to_opt_str(video_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match VideoRepository::get_video(&*db, vid) {
        Ok(Some(video)) => json_to_c_char(&video),
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_video failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_get_collections(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match VideoRepository::get_video_collections(&*db) {
        Ok(cols) => json_to_c_char(&cols),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_video_collections failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_insert(
    db: *mut Database,
    video_json: *const c_char,
) -> c_int {
    if db.is_null() || video_json.is_null() {
        return -1;
    }
    let json_str = match to_opt_str(video_json) {
        Some(s) => s,
        None => return -1,
    };
    let video: VideoRecord = match serde_json::from_str(json_str) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("[Synapse Bridge] parse VideoRecord failed: {}", e);
            return -1;
        }
    };
    match VideoRepository::insert_video(&*db, &video) {
        Ok(_) => 1,
        Err(e) => {
            eprintln!("[Synapse Bridge] insert_video failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_update_progress(
    db: *mut Database,
    video_id: *const c_char,
    progress: c_double,
) -> c_int {
    if db.is_null() || video_id.is_null() {
        return -1;
    }
    let vid = match to_opt_str(video_id) {
        Some(s) => s,
        None => return -1,
    };
    match VideoRepository::update_video_progress(&*db, vid, progress) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_video_progress failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_update_duration(
    db: *mut Database,
    video_id: *const c_char,
    duration: c_double,
) -> c_int {
    if db.is_null() || video_id.is_null() {
        return -1;
    }
    let vid = match to_opt_str(video_id) {
        Some(s) => s,
        None => return -1,
    };
    match VideoRepository::update_video_duration(&*db, vid, duration) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_video_duration failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_delete(
    db: *mut Database,
    video_id: *const c_char,
) -> c_int {
    if db.is_null() || video_id.is_null() {
        return -1;
    }
    let vid = match to_opt_str(video_id) {
        Some(s) => s,
        None => return -1,
    };
    match VideoRepository::soft_delete_video(&*db, vid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] soft_delete_video failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_get_folders(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match VideoRepository::get_video_folders(&*db) {
        Ok(folders) => json_to_c_char(&folders),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_video_folders failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_save_folders(
    db: *mut Database,
    folders_json: *const c_char,
) -> c_int {
    if db.is_null() || folders_json.is_null() {
        return -1;
    }
    let json_str = match to_opt_str(folders_json) {
        Some(s) => s,
        None => return -1,
    };
    let folders: Vec<VideoFolder> = match serde_json::from_str(json_str) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("[Synapse Bridge] parse VideoFolders failed: {}", e);
            return -1;
        }
    };
    match VideoRepository::save_video_folders(&*db, &folders) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] save_video_folders failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_create_folder(
    db: *mut Database,
    name: *const c_char,
) -> *mut c_char {
    if db.is_null() || name.is_null() {
        return std::ptr::null_mut();
    }
    let folder_name = match to_opt_str(name) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match VideoRepository::create_video_folder(&*db, folder_name) {
        Ok(Some(folder)) => json_to_c_char(&folder),
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] create_video_folder failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_rename_folder(
    db: *mut Database,
    folder_id: *const c_char,
    name: *const c_char,
) -> c_int {
    if db.is_null() || folder_id.is_null() || name.is_null() {
        return -1;
    }
    let fid = match to_opt_str(folder_id) {
        Some(s) => s,
        None => return -1,
    };
    let new_name = match to_opt_str(name) {
        Some(s) => s,
        None => return -1,
    };
    match VideoRepository::rename_video_folder(&*db, fid, new_name) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] rename_video_folder failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_delete_folder(
    db: *mut Database,
    folder_id: *const c_char,
) -> c_int {
    if db.is_null() || folder_id.is_null() {
        return -1;
    }
    let fid = match to_opt_str(folder_id) {
        Some(s) => s,
        None => return -1,
    };
    match VideoRepository::delete_video_folder(&*db, fid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_video_folder failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_move_to_folder(
    db: *mut Database,
    video_id: *const c_char,
    folder_id: *const c_char,
) -> c_int {
    if db.is_null() || video_id.is_null() {
        return -1;
    }
    let vid = match to_opt_str(video_id) {
        Some(s) => s,
        None => return -1,
    };
    let fid = to_opt_str(folder_id);
    match VideoRepository::move_video_to_folder(&*db, vid, fid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] move_video_to_folder failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_get_subtitles(
    db: *mut Database,
    video_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || video_id.is_null() {
        return std::ptr::null_mut();
    }
    let vid = match to_opt_str(video_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let conn = match (*db).lock() {
        Ok(c) => c,
        Err(_) => return std::ptr::null_mut(),
    };
    match subtitles::get_video_subtitles(&conn, vid) {
        Ok(Some((sub_json, local_path))) => {
            let res = serde_json::json!({
                "subtitles_json": sub_json,
                "local_subtitle_path": local_path
            });
            json_to_c_char(&res)
        }
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_video_subtitles failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_update_subtitles(
    db: *mut Database,
    video_id: *const c_char,
    subtitles_json: *const c_char,
    local_subtitle_path: *const c_char,
) -> c_int {
    if db.is_null() || video_id.is_null() || subtitles_json.is_null() {
        return -1;
    }
    let vid = match to_opt_str(video_id) {
        Some(s) => s,
        None => return -1,
    };
    let sub_json = match to_opt_str(subtitles_json) {
        Some(s) => s,
        None => return -1,
    };
    let local_path = to_opt_str(local_subtitle_path);
    let conn = match (*db).lock() {
        Ok(c) => c,
        Err(_) => return -1,
    };
    match subtitles::update_video_subtitles(&conn, vid, sub_json, local_path) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_video_subtitles failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_rename_subtitle(
    db: *mut Database,
    video_id: *const c_char,
    track_id: *const c_char,
    label: *const c_char,
) -> c_int {
    if db.is_null() || video_id.is_null() || track_id.is_null() || label.is_null() {
        return -1;
    }
    let vid = match to_opt_str(video_id) {
        Some(s) => s,
        None => return -1,
    };
    let tid = match to_opt_str(track_id) {
        Some(s) => s,
        None => return -1,
    };
    let lbl = match to_opt_str(label) {
        Some(s) => s,
        None => return -1,
    };
    let conn = match (*db).lock() {
        Ok(c) => c,
        Err(_) => return -1,
    };
    match subtitles::rename_video_subtitle(&conn, vid, tid, lbl) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] rename_video_subtitle failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_remove_subtitle(
    db: *mut Database,
    video_id: *const c_char,
    track_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || video_id.is_null() || track_id.is_null() {
        return std::ptr::null_mut();
    }
    let vid = match to_opt_str(video_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let tid = match to_opt_str(track_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let conn = match (*db).lock() {
        Ok(c) => c,
        Err(_) => return std::ptr::null_mut(),
    };
    match subtitles::remove_video_subtitle(&conn, vid, tid) {
        Ok(Some(path)) => match CString::new(path) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] remove_video_subtitle failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_get_words(
    db: *mut Database,
    video_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || video_id.is_null() {
        return std::ptr::null_mut();
    }
    let vid = match to_opt_str(video_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match VideoRepository::get_video_words(&*db, vid) {
        Ok(words) => json_to_c_char(&words),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_video_words failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_add_word(
    db: *mut Database,
    video_id: *const c_char,
    word: *const c_char,
    context: *const c_char,
    timestamp: c_double,
) -> c_int {
    if db.is_null() || video_id.is_null() || word.is_null() {
        return -1;
    }
    let vid = match to_opt_str(video_id) {
        Some(s) => s,
        None => return -1,
    };
    let wrd = match to_opt_str(word) {
        Some(s) => s,
        None => return -1,
    };
    let ctx = to_opt_str(context);
    match VideoRepository::add_video_word(&*db, vid, wrd, ctx, timestamp) {
        Ok(_) => 1,
        Err(e) => {
            eprintln!("[Synapse Bridge] add_video_word failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_delete_word(
    db: *mut Database,
    word_id: *const c_char,
) -> c_int {
    if db.is_null() || word_id.is_null() {
        return -1;
    }
    let wid = match to_opt_str(word_id) {
        Some(s) => s,
        None => return -1,
    };
    match VideoRepository::delete_video_word(&*db, wid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_video_word failed: {}", e);
            -1
        }
    }
}
