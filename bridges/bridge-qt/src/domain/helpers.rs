use std::ffi::{CStr, CString};
use std::os::raw::c_char;

pub unsafe fn to_opt_str<'a>(ptr: *const c_char) -> Option<&'a str> {
    if ptr.is_null() {
        None
    } else {
        CStr::from_ptr(ptr).to_str().ok().map(|s| s.trim()).filter(|s| !s.is_empty())
    }
}

pub fn json_to_c_char<T: serde::Serialize>(val: &T) -> *mut c_char {
    match serde_json::to_string(val) {
        Ok(json) => match CString::new(json) {
            Ok(c) => c.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(_) => std::ptr::null_mut(),
    }
}
