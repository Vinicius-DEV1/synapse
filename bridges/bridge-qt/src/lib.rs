use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};
use synapse_core::{Database, EncryptedVideoReader, FsrsEngine, Rating, Card, FsrsState};
use chrono::Utc;

// ---------------------------------------------------------------------------
// Database API
// ---------------------------------------------------------------------------

#[no_mangle]
pub unsafe extern "C" fn synapse_db_open(path: *const c_char) -> *mut Database {
    if path.is_null() {
        return std::ptr::null_mut();
    }
    let c_str = CStr::from_ptr(path);
    let path_str = match c_str.to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    match Database::open(path_str) {
        Ok(db) => Box::into_raw(Box::new(db)),
        Err(e) => {
            eprintln!("[Synapse Bridge] Failed to open DB: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_db_close(db: *mut Database) {
    if !db.is_null() {
        drop(Box::from_raw(db));
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_db_query_json(db: *mut Database, sql: *const c_char) -> *mut c_char {
    if db.is_null() || sql.is_null() {
        return std::ptr::null_mut();
    }
    let sql_str = match CStr::from_ptr(sql).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };
    let database = &*db;
    let conn = match database.lock() {
        Ok(c) => c,
        Err(_) => return std::ptr::null_mut(),
    };

    let mut stmt = match conn.prepare(sql_str) {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let col_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();

    let mut rows_vec: Vec<serde_json::Map<String, serde_json::Value>> = Vec::new();
    let mut rows = match stmt.query([]) {
        Ok(r) => r,
        Err(_) => return std::ptr::null_mut(),
    };

    while let Ok(Some(row)) = rows.next() {
        let mut map = serde_json::Map::new();
        for (i, col_name) in col_names.iter().enumerate() {
            let val = match row.get_ref(i) {
                Ok(rusqlite::types::ValueRef::Null) => serde_json::Value::Null,
                Ok(rusqlite::types::ValueRef::Integer(n)) => serde_json::Value::Number(n.into()),
                Ok(rusqlite::types::ValueRef::Real(f)) => serde_json::Number::from_f64(f)
                    .map(serde_json::Value::Number)
                    .unwrap_or(serde_json::Value::Null),
                Ok(rusqlite::types::ValueRef::Text(t)) => {
                    serde_json::Value::String(String::from_utf8_lossy(t).into_owned())
                }
                Ok(rusqlite::types::ValueRef::Blob(b)) => {
                    serde_json::Value::String(hex::encode(b))
                }
                Err(_) => serde_json::Value::Null,
            };
            map.insert(col_name.clone(), val);
        }
        rows_vec.push(map);
    }

    let json_str = match serde_json::to_string(&rows_vec) {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    CString::new(json_str).map(|c| c.into_raw()).unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
pub unsafe extern "C" fn synapse_db_execute(db: *mut Database, sql: *const c_char) -> c_int {
    if db.is_null() || sql.is_null() {
        return -1;
    }
    let sql_str = match CStr::from_ptr(sql).to_str() {
        Ok(s) => s,
        Err(_) => return -1,
    };
    let database = &*db;
    let conn = match database.lock() {
        Ok(c) => c,
        Err(_) => return -1,
    };

    match conn.execute_batch(sql_str) {
        Ok(_) => 0,
        Err(e) => {
            eprintln!("[Synapse Bridge] Execute error: {}", e);
            -1
        }
    }
}

// ---------------------------------------------------------------------------
// Video Streaming Reader API (Direct mpv_stream_cb integration)
// ---------------------------------------------------------------------------

#[no_mangle]
pub unsafe extern "C" fn synapse_video_reader_open(
    file_path: *const c_char,
    key_hex: *const c_char,
) -> *mut EncryptedVideoReader {
    if file_path.is_null() || key_hex.is_null() {
        return std::ptr::null_mut();
    }

    let path_str = match CStr::from_ptr(file_path).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let key_str = match CStr::from_ptr(key_hex).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    match EncryptedVideoReader::open(path_str, key_str) {
        Ok(reader) => Box::into_raw(Box::new(reader)),
        Err(e) => {
            eprintln!("[Synapse Bridge] VideoReader open failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_reader_size(reader: *mut EncryptedVideoReader) -> i64 {
    if reader.is_null() {
        return -1;
    }
    (*reader).size() as i64
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_reader_seek(
    reader: *mut EncryptedVideoReader,
    offset: i64,
) -> i64 {
    if reader.is_null() || offset < 0 {
        return -1;
    }
    match (*reader).seek(offset as u64) {
        Ok(new_pos) => new_pos as i64,
        Err(_) => -1,
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_reader_read(
    reader: *mut EncryptedVideoReader,
    buffer: *mut u8,
    size: usize,
) -> i64 {
    if reader.is_null() || buffer.is_null() || size == 0 {
        return 0;
    }

    let slice = std::slice::from_raw_parts_mut(buffer, size);
    match (*reader).read(slice) {
        Ok(bytes_read) => bytes_read as i64,
        Err(e) => {
            eprintln!("[Synapse Bridge] VideoReader read error: {}", e);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_video_reader_close(reader: *mut EncryptedVideoReader) {
    if !reader.is_null() {
        drop(Box::from_raw(reader));
    }
}

// ---------------------------------------------------------------------------
// FSRS Spaced Repetition Engine
// ---------------------------------------------------------------------------

#[no_mangle]
pub unsafe extern "C" fn synapse_fsrs_calculate(
    stability: f64,
    difficulty: f64,
    reps: c_int,
    lapses: c_int,
    rating: c_int,
    elapsed_days: c_int,
    out_stability: *mut f64,
    out_difficulty: *mut f64,
    out_scheduled_days: *mut c_int,
) -> c_int {
    if out_stability.is_null() || out_difficulty.is_null() || out_scheduled_days.is_null() {
        return -1;
    }

    let r = match rating {
        1 => Rating::Again,
        2 => Rating::Hard,
        3 => Rating::Good,
        4 => Rating::Easy,
        _ => return -1,
    };

    let engine = FsrsEngine::new(None);
    let card = Card {
        stability,
        difficulty,
        elapsed_days: elapsed_days.max(0),
        scheduled_days: 0,
        reps: reps.max(0),
        lapses: lapses.max(0),
        state: if reps == 0 { FsrsState::New } else { FsrsState::Review },
        due: Utc::now(),
        last_review: None,
    };

    let updated = engine.review(&card, r, Utc::now());

    *out_stability = updated.stability;
    *out_difficulty = updated.difficulty;
    *out_scheduled_days = updated.scheduled_days;

    0
}

// ---------------------------------------------------------------------------
// Cryptography & Two-Tier Keychain
// ---------------------------------------------------------------------------

#[no_mangle]
pub unsafe extern "C" fn synapse_crypto_derive_master_key(
    password: *const c_char,
    out_key32: *mut u8,
) -> c_int {
    if password.is_null() || out_key32.is_null() {
        return -1;
    }
    let pass_str = match CStr::from_ptr(password).to_str() {
        Ok(s) => s,
        Err(_) => return -1,
    };

    let key = synapse_core::crypto::derive_key_from_password(pass_str);
    let slice = std::slice::from_raw_parts_mut(out_key32, 32);
    slice.copy_from_slice(&key);
    0
}

#[no_mangle]
pub unsafe extern "C" fn synapse_crypto_decrypt(
    key_hex: *const c_char,
    encrypted_payload: *const c_char,
) -> *mut c_char {
    if key_hex.is_null() || encrypted_payload.is_null() {
        return std::ptr::null_mut();
    }
    let key_str = match CStr::from_ptr(key_hex).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };
    let payload_str = match CStr::from_ptr(encrypted_payload).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    match synapse_core::crypto::decrypt_content(key_str, payload_str) {
        Ok(plain) => match CString::new(plain) {
            Ok(c_string) => c_string.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_free_string(s: *mut c_char) {
    if !s.is_null() {
        drop(CString::from_raw(s));
    }
}

