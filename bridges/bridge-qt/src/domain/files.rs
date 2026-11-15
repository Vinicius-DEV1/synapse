use super::helpers::{json_to_c_char, to_opt_str};
use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::files::FilesRepository;

#[no_mangle]
pub unsafe extern "C" fn synapse_files_get_folders(
    db: *mut Database,
    parent_id: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let pid = to_opt_str(parent_id);
    match FilesRepository::get_folders(&*db, pid) {
        Ok(folders) => json_to_c_char(&folders),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_files_folders failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_get_all_folders(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match FilesRepository::get_all_folders(&*db) {
        Ok(folders) => json_to_c_char(&folders),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_all_folders failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_create_folder(
    db: *mut Database,
    name: *const c_char,
    parent_id: *const c_char,
    color: *const c_char,
) -> *mut c_char {
    if db.is_null() || name.is_null() {
        return std::ptr::null_mut();
    }
    let name_str = match to_opt_str(name) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let pid = to_opt_str(parent_id);
    let col = to_opt_str(color);

    match FilesRepository::create_folder(&*db, name_str, pid, col) {
        Ok(Some(folder)) => match CString::new(folder.id) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] create_folder failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_rename_folder(
    db: *mut Database,
    folder_id: *const c_char,
    new_name: *const c_char,
) -> c_int {
    if db.is_null() || folder_id.is_null() || new_name.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(folder_id) {
        Some(s) => s,
        None => return -1,
    };
    let name_str = match to_opt_str(new_name) {
        Some(s) => s,
        None => return -1,
    };

    match FilesRepository::rename_folder(&*db, id_str, name_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] rename_folder failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_move_folder(
    db: *mut Database,
    folder_id: *const c_char,
    new_parent_id: *const c_char,
) -> c_int {
    if db.is_null() || folder_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(folder_id) {
        Some(s) => s,
        None => return -1,
    };
    let pid = to_opt_str(new_parent_id);

    match FilesRepository::move_folder(&*db, id_str, pid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] move_folder failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_delete_folder(
    db: *mut Database,
    folder_id: *const c_char,
) -> c_int {
    if db.is_null() || folder_id.is_null() {
        return -1;
    }
    let id_str = match to_opt_str(folder_id) {
        Some(s) => s,
        None => return -1,
    };

    match FilesRepository::delete_folder(&*db, id_str) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_folder failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_get_for_section(
    db: *mut Database,
    section: *const c_char,
    folder_id: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let sec_str = to_opt_str(section).unwrap_or("folders");
    let fid = to_opt_str(folder_id);

    match FilesRepository::get_files_for_section(&*db, sec_str, fid) {
        Ok(files) => json_to_c_char(&files),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_files_for_section failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_get_drive_count(db: *mut Database) -> c_int {
    if db.is_null() {
        return 0;
    }
    FilesRepository::get_drive_file_count(&*db).unwrap_or(0)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_rename_file(
    db: *mut Database,
    file_id: *const c_char,
    name: *const c_char,
) -> c_int {
    if db.is_null() || file_id.is_null() || name.is_null() {
        return -1;
    }
    let fid = match to_opt_str(file_id) {
        Some(s) => s,
        None => return -1,
    };
    let n = match to_opt_str(name) {
        Some(s) => s,
        None => return -1,
    };

    match FilesRepository::rename_file(&*db, fid, n) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] rename_file failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_move_file(
    db: *mut Database,
    file_id: *const c_char,
    folder_id: *const c_char,
) -> c_int {
    if db.is_null() || file_id.is_null() {
        return -1;
    }
    let fid = match to_opt_str(file_id) {
        Some(s) => s,
        None => return -1,
    };
    let fol_id = to_opt_str(folder_id);

    match FilesRepository::move_file(&*db, fid, fol_id) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] move_file failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_duplicate_file(
    db: *mut Database,
    file_id: *const c_char,
    folder_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || file_id.is_null() {
        return std::ptr::null_mut();
    }
    let fid = match to_opt_str(file_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    let fol_id = to_opt_str(folder_id);

    match FilesRepository::duplicate_file(&*db, fid, fol_id) {
        Ok(Some(new_id)) => match CString::new(new_id) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] duplicate_file failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_delete_file(
    db: *mut Database,
    file_id: *const c_char,
) -> c_int {
    if db.is_null() || file_id.is_null() {
        return -1;
    }
    let fid = match to_opt_str(file_id) {
        Some(s) => s,
        None => return -1,
    };
    match FilesRepository::delete_file(&*db, fid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_file failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_link_to_page(
    db: *mut Database,
    file_id: *const c_char,
    page_id: *const c_char,
) -> c_int {
    if db.is_null() || file_id.is_null() || page_id.is_null() {
        return -1;
    }
    let fid = match to_opt_str(file_id) {
        Some(s) => s,
        None => return -1,
    };
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return -1,
    };
    match FilesRepository::link_file_to_page(&*db, fid, pid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] link_to_page failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_unlink_from_page(
    db: *mut Database,
    file_id: *const c_char,
    page_id: *const c_char,
) -> c_int {
    if db.is_null() || file_id.is_null() || page_id.is_null() {
        return -1;
    }
    let fid = match to_opt_str(file_id) {
        Some(s) => s,
        None => return -1,
    };
    let pid = match to_opt_str(page_id) {
        Some(s) => s,
        None => return -1,
    };
    match FilesRepository::unlink_file_from_page(&*db, fid, pid) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] unlink_from_page failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_get_linked_pages(
    db: *mut Database,
    file_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || file_id.is_null() {
        return std::ptr::null_mut();
    }
    let fid = match to_opt_str(file_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match FilesRepository::get_file_linked_pages(&*db, fid) {
        Ok(pages) => json_to_c_char(&pages),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_linked_pages failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_get_file(
    db: *mut Database,
    file_id: *const c_char,
) -> *mut c_char {
    if db.is_null() || file_id.is_null() {
        return std::ptr::null_mut();
    }
    let fid = match to_opt_str(file_id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match FilesRepository::get_file(&*db, fid) {
        Ok(Some(file)) => json_to_c_char(&file),
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_file failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_update_local_path(
    db: *mut Database,
    file_id: *const c_char,
    local_path: *const c_char,
) -> c_int {
    if db.is_null() || file_id.is_null() || local_path.is_null() {
        return -1;
    }
    let fid = match to_opt_str(file_id) {
        Some(s) => s,
        None => return -1,
    };
    let path = match to_opt_str(local_path) {
        Some(s) => s,
        None => return -1,
    };
    match FilesRepository::update_file_local_path(&*db, fid, path) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] update_local_path failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_files_create_file(
    db: *mut Database,
    id: *const c_char,
    name: *const c_char,
    file_type: *const c_char,
    file_size: i64,
    local_path: *const c_char,
    folder_id: *const c_char,
    mime_type: *const c_char,
) -> c_int {
    if db.is_null() || id.is_null() || name.is_null() || file_type.is_null() || local_path.is_null() {
        return -1;
    }
    let fid = match to_opt_str(id) {
        Some(s) => s,
        None => return -1,
    };
    let fname = match to_opt_str(name) {
        Some(s) => s,
        None => return -1,
    };
    let ftype = match to_opt_str(file_type) {
        Some(s) => s,
        None => return -1,
    };
    let lpath = match to_opt_str(local_path) {
        Some(s) => s,
        None => return -1,
    };
    let fld = to_opt_str(folder_id);
    let mime = to_opt_str(mime_type);

    match FilesRepository::create_file(&*db, fid, fname, ftype, file_size, lpath, fld, mime) {
        Ok(true) => 0,
        Ok(false) => 1,
        Err(e) => {
            eprintln!("[Synapse Bridge] create_file failed: {}", e);
            -1
        }
    }
}
