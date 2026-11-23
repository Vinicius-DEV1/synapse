//! C ABI bindings for the Diagrams domain.

use std::os::raw::{c_char, c_int};
use synapse_core::db::Database;
use synapse_core::domain::diagrams::{DiagramRecord, DiagramsRepository};

use super::helpers::{json_to_c_char, to_opt_str};

#[no_mangle]
pub unsafe extern "C" fn synapse_diagrams_get_all(db: *mut Database) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    match DiagramsRepository::get_diagrams(&*db) {
        Ok(diagrams) => json_to_c_char(&diagrams),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_diagrams failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_diagrams_get(
    db: *mut Database,
    id: *const c_char,
) -> *mut c_char {
    if db.is_null() || id.is_null() {
        return std::ptr::null_mut();
    }
    let did = match to_opt_str(id) {
        Some(s) => s,
        None => return std::ptr::null_mut(),
    };
    match DiagramsRepository::get_diagram(&*db, did) {
        Ok(Some(diagram)) => json_to_c_char(&diagram),
        Ok(None) => std::ptr::null_mut(),
        Err(e) => {
            eprintln!("[Synapse Bridge] get_diagram failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_diagrams_create(
    db: *mut Database,
    title: *const c_char,
    icon: *const c_char,
) -> *mut c_char {
    if db.is_null() {
        return std::ptr::null_mut();
    }
    let id = uuid::Uuid::new_v4().to_string();
    let t = to_opt_str(title).unwrap_or("Novo Diagrama").to_string();
    let ic = to_opt_str(icon).unwrap_or("🎨").to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let record = DiagramRecord {
        id: id.clone(),
        title: t,
        icon: ic,
        content: "[]".to_string(),
        encrypted_content: None,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        deleted_at: None,
    };

    match DiagramsRepository::create_diagram(&*db, &record) {
        Ok(_) => match std::ffi::CString::new(id) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(e) => {
            eprintln!("[Synapse Bridge] create_diagram failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_diagrams_save(
    db: *mut Database,
    id: *const c_char,
    title: *const c_char,
    content: *const c_char,
    encrypted_content: *const c_char,
    icon: *const c_char,
) -> c_int {
    if db.is_null() || id.is_null() {
        return -1;
    }
    let did = match to_opt_str(id) {
        Some(s) => s,
        None => return -1,
    };
    let t = to_opt_str(title).unwrap_or("Diagrama");
    let c = to_opt_str(content).unwrap_or("[]");
    let enc = to_opt_str(encrypted_content);
    let ic = to_opt_str(icon).unwrap_or("🎨");

    match DiagramsRepository::save_diagram(&*db, did, t, c, enc, ic) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] save_diagram failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_diagrams_delete(
    db: *mut Database,
    id: *const c_char,
) -> c_int {
    if db.is_null() || id.is_null() {
        return -1;
    }
    let did = match to_opt_str(id) {
        Some(s) => s,
        None => return -1,
    };
    match DiagramsRepository::delete_diagram(&*db, did) {
        Ok(true) => 1,
        Ok(false) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] delete_diagram failed: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_diagrams_extract_qt_shapes(raw_content: *const c_char) -> *mut c_char {
    let raw = to_opt_str(raw_content).unwrap_or("");
    let shapes = synapse_core::domain::diagrams::extract_qt_shapes(raw);
    json_to_c_char(&shapes)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_diagrams_encode_tldraw_v2(
    shapes_json: *const c_char,
    existing_raw: *const c_char,
) -> *mut c_char {
    let raw_shapes = to_opt_str(shapes_json).unwrap_or("[]");
    let prev = to_opt_str(existing_raw);
    let shapes: Vec<synapse_core::domain::diagrams::QtCanvasShape> =
        serde_json::from_str(raw_shapes).unwrap_or_default();
    let tldraw_json = synapse_core::domain::diagrams::encode_qt_shapes_as_tldraw_v2(&shapes, prev);
    match std::ffi::CString::new(tldraw_json) {
        Ok(c) => c.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_diagrams_export_svg(shapes_json: *const c_char) -> *mut c_char {
    let raw_shapes = to_opt_str(shapes_json).unwrap_or("[]");
    let shapes: Vec<synapse_core::domain::diagrams::QtCanvasShape> =
        serde_json::from_str(raw_shapes).unwrap_or_default();
    let svg = synapse_core::domain::diagrams::export_shapes_to_svg(&shapes);
    match std::ffi::CString::new(svg) {
        Ok(c) => c.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}
