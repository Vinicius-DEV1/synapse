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
pub unsafe extern "C" fn synapse_crypto_hash_password(password: *const c_char) -> *mut c_char {
    if password.is_null() {
        return std::ptr::null_mut();
    }
    let pass_str = match CStr::from_ptr(password).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };
    let hash = synapse_core::crypto::hash_auth_password(pass_str);
    match CString::new(hash) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_crypto_generate_module_key() -> *mut c_char {
    let key_hex = synapse_core::crypto::generate_module_key();
    match CString::new(key_hex) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_crypto_encrypt_module_key(
    module_key: *const c_char,
    master_key32: *const u8,
) -> *mut c_char {
    if module_key.is_null() || master_key32.is_null() {
        return std::ptr::null_mut();
    }
    let mod_key_str = match CStr::from_ptr(module_key).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };
    let mut key_arr = [0u8; 32];
    std::ptr::copy_nonoverlapping(master_key32, key_arr.as_mut_ptr(), 32);

    match synapse_core::crypto::encrypt_module_key_with_key(mod_key_str, &key_arr) {
        Ok(payload) => match CString::new(payload) {
            Ok(c_string) => c_string.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_crypto_decrypt_module_key(
    encrypted_payload: *const c_char,
    master_key32: *const u8,
) -> *mut c_char {
    if encrypted_payload.is_null() || master_key32.is_null() {
        return std::ptr::null_mut();
    }
    let payload_str = match CStr::from_ptr(encrypted_payload).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };
    let mut key_arr = [0u8; 32];
    std::ptr::copy_nonoverlapping(master_key32, key_arr.as_mut_ptr(), 32);

    match synapse_core::crypto::decrypt_module_key_with_key(payload_str, &key_arr) {
        Ok(mod_key) => match CString::new(mod_key) {
            Ok(c_string) => c_string.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_crypto_encrypt(
    key_hex: *const c_char,
    plaintext: *const c_char,
) -> *mut c_char {
    if key_hex.is_null() || plaintext.is_null() {
        return std::ptr::null_mut();
    }
    let key_str = match CStr::from_ptr(key_hex).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };
    let text_str = match CStr::from_ptr(plaintext).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    match synapse_core::crypto::encrypt_content(key_str, text_str) {
        Ok(encrypted) => match CString::new(encrypted) {
            Ok(c_string) => c_string.into_raw(),
            Err(_) => std::ptr::null_mut(),
        },
        Err(_) => std::ptr::null_mut(),
    }
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
pub unsafe extern "C" fn synapse_crypto_wipe_memory(ptr: *mut u8, size: usize) {
    if !ptr.is_null() && size > 0 {
        let slice = std::slice::from_raw_parts_mut(ptr, size);
        for b in slice.iter_mut() {
            unsafe { std::ptr::write_volatile(b, 0u8); }
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_free_string(s: *mut c_char) {
    if !s.is_null() {
        drop(CString::from_raw(s));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crypto_ffi_roundtrips() {
        unsafe {
            let pass = CString::new("MinhaSenhaMestra123!").unwrap();
            let mut master_key = [0u8; 32];
            assert_eq!(synapse_crypto_derive_master_key(pass.as_ptr(), master_key.as_mut_ptr()), 0);

            // Auth hash
            let auth_hash_ptr = synapse_crypto_hash_password(pass.as_ptr());
            assert!(!auth_hash_ptr.is_null());
            let auth_hash = CStr::from_ptr(auth_hash_ptr).to_str().unwrap().to_string();
            synapse_free_string(auth_hash_ptr);
            assert_eq!(auth_hash.len(), 64);

            // Module key generation
            let mod_key_ptr = synapse_crypto_generate_module_key();
            assert!(!mod_key_ptr.is_null());
            let mod_key = CStr::from_ptr(mod_key_ptr).to_str().unwrap().to_string();
            synapse_free_string(mod_key_ptr);
            assert_eq!(mod_key.len(), 64);

            // Encrypt module key with master key
            let mod_key_c = CString::new(mod_key.clone()).unwrap();
            let enc_mod_ptr = synapse_crypto_encrypt_module_key(mod_key_c.as_ptr(), master_key.as_ptr());
            assert!(!enc_mod_ptr.is_null());

            // Decrypt module key with master key
            let dec_mod_ptr = synapse_crypto_decrypt_module_key(enc_mod_ptr, master_key.as_ptr());
            assert!(!dec_mod_ptr.is_null());
            let recovered_mod_key = CStr::from_ptr(dec_mod_ptr).to_str().unwrap().to_string();
            assert_eq!(mod_key, recovered_mod_key);
            synapse_free_string(enc_mod_ptr);
            synapse_free_string(dec_mod_ptr);

            // Content encrypt/decrypt
            let plain_c = CString::new("Texto ultrassecreto do cofre: 123456 @#$ áéíóú").unwrap();
            let enc_content_ptr = synapse_crypto_encrypt(mod_key_c.as_ptr(), plain_c.as_ptr());
            assert!(!enc_content_ptr.is_null());

            let dec_content_ptr = synapse_crypto_decrypt(mod_key_c.as_ptr(), enc_content_ptr);
            assert!(!dec_content_ptr.is_null());
            let recovered_plain = CStr::from_ptr(dec_content_ptr).to_str().unwrap().to_string();
            assert_eq!(recovered_plain, "Texto ultrassecreto do cofre: 123456 @#$ áéíóú");
            synapse_free_string(enc_content_ptr);
            synapse_free_string(dec_content_ptr);

            // Wipe memory test
            synapse_crypto_wipe_memory(master_key.as_mut_ptr(), 32);
            assert_eq!(master_key, [0u8; 32]);
        }
    }
}

