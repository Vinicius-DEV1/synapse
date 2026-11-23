use chrono::Utc;
use std::ffi::{CStr, CString};
use std::fs::File;
use std::io::{Read, Write};
use std::os::raw::{c_char, c_int};
use std::sync::atomic::{AtomicBool, Ordering};
use synapse_core::{Card, Database, EncryptedVideoReader, FsrsEngine, FsrsState, Rating};
use zeroize::{Zeroize, Zeroizing};
mod database_parameters;
#[allow(deprecated)]
pub use database_parameters::{synapse_db_execute_params, synapse_db_query_json_params};
pub mod domain;
pub use domain::*;

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
#[deprecated(since = "0.2.0", note = "Direct SQL queries are deprecated. Use typed domain APIs instead.")]
pub unsafe extern "C" fn synapse_db_query_json(db: *mut Database, sql: *const c_char) -> *mut c_char {
    let empty_parameters = CString::new("[]").expect("empty JSON parameter list is valid");
    #[allow(deprecated)]
    synapse_db_query_json_params(db, sql, empty_parameters.as_ptr())
}

#[no_mangle]
#[deprecated(since = "0.2.0", note = "Direct SQL queries are deprecated. Use typed domain APIs instead.")]
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
// Encrypted local file storage API
// ---------------------------------------------------------------------------

#[repr(C)]
pub struct SynapseFileOperation {
    cancelled: AtomicBool,
}

#[no_mangle]
pub extern "C" fn synapse_file_operation_create() -> *mut SynapseFileOperation {
    Box::into_raw(Box::new(SynapseFileOperation {
        cancelled: AtomicBool::new(false),
    }))
}

#[no_mangle]
pub unsafe extern "C" fn synapse_file_operation_cancel(operation: *mut SynapseFileOperation) {
    if !operation.is_null() {
        (*operation).cancelled.store(true, Ordering::SeqCst);
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_file_operation_close(operation: *mut SynapseFileOperation) {
    if !operation.is_null() {
        drop(Box::from_raw(operation));
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_file_encrypt(
    input_path: *const c_char,
    output_path: *const c_char,
    key_hex: *const c_char,
    operation: *mut SynapseFileOperation,
) -> c_int {
    if input_path.is_null() || output_path.is_null() || key_hex.is_null() || operation.is_null() {
        return -1;
    }
    let input = match CStr::from_ptr(input_path).to_str() {
        Ok(path) => path,
        Err(_) => return -1,
    };
    let output = match CStr::from_ptr(output_path).to_str() {
        Ok(path) => path,
        Err(_) => return -1,
    };
    let key = match CStr::from_ptr(key_hex).to_str() {
        Ok(value) => value,
        Err(_) => return -1,
    };

    match synapse_core::crypto_stream::encrypt_file_chunked(input, output, key, Some(&(*operation).cancelled)) {
        Ok(()) => 0,
        Err(_) => {
            let _ = std::fs::remove_file(output);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_file_encrypt_bytes(
    input: *const u8,
    input_size: usize,
    output_path: *const c_char,
    key_hex: *const c_char,
    operation: *mut SynapseFileOperation,
) -> c_int {
    if (input.is_null() && input_size > 0) || output_path.is_null() || key_hex.is_null() || operation.is_null() {
        return -1;
    }
    let output = match CStr::from_ptr(output_path).to_str() {
        Ok(path) => path,
        Err(_) => return -1,
    };
    let key = match CStr::from_ptr(key_hex).to_str() {
        Ok(value) => value,
        Err(_) => return -1,
    };
    let data = if input_size == 0 {
        &[]
    } else {
        std::slice::from_raw_parts(input, input_size)
    };
    match synapse_core::crypto_stream::encrypt_bytes_chunked(
        data,
        output,
        key,
        Some(&(*operation).cancelled),
    ) {
        Ok(()) => 0,
        Err(error) => {
            eprintln!("[Synapse Bridge] In-memory file encryption failed: {error}");
            let _ = std::fs::remove_file(output);
            -1
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_file_decrypt(
    input_path: *const c_char,
    output_path: *const c_char,
    key_hex: *const c_char,
    operation: *mut SynapseFileOperation,
) -> c_int {
    if input_path.is_null() || output_path.is_null() || key_hex.is_null() || operation.is_null() {
        return -1;
    }
    let input = match CStr::from_ptr(input_path).to_str() {
        Ok(path) => path,
        Err(_) => return -1,
    };
    let output = match CStr::from_ptr(output_path).to_str() {
        Ok(path) => path,
        Err(_) => return -1,
    };
    let key = match CStr::from_ptr(key_hex).to_str() {
        Ok(value) => value,
        Err(_) => return -1,
    };

    let mut reader = match EncryptedVideoReader::open(input, key) {
        Ok(reader) => reader,
        Err(_) => return -1,
    };
    let mut file = match File::create(output) {
        Ok(file) => file,
        Err(_) => return -1,
    };
    let mut buffer = Zeroizing::new(vec![0u8; 1024 * 1024]);
    loop {
        if (*operation).cancelled.load(Ordering::SeqCst) {
            buffer.zeroize();
            drop(file);
            let _ = std::fs::remove_file(output);
            return -1;
        }
        let bytes_read = match reader.read(&mut buffer) {
            Ok(0) => break,
            Ok(count) => count,
            Err(_) => {
                buffer.zeroize();
                drop(file);
                let _ = std::fs::remove_file(output);
                return -1;
            }
        };
        if file.write_all(&buffer[..bytes_read]).is_err() {
            buffer.zeroize();
            drop(file);
            let _ = std::fs::remove_file(output);
            return -1;
        }
        buffer[..bytes_read].zeroize();
    }
    buffer.zeroize();
    0
}

#[no_mangle]
pub unsafe extern "C" fn synapse_file_copy(
    input_path: *const c_char,
    output_path: *const c_char,
    operation: *mut SynapseFileOperation,
) -> c_int {
    if input_path.is_null() || output_path.is_null() || operation.is_null() {
        return -1;
    }
    let input = match CStr::from_ptr(input_path).to_str() {
        Ok(path) => path,
        Err(_) => return -1,
    };
    let output = match CStr::from_ptr(output_path).to_str() {
        Ok(path) => path,
        Err(_) => return -1,
    };
    let mut source = match File::open(input) {
        Ok(file) => file,
        Err(_) => return -1,
    };
    let mut destination = match File::create(output) {
        Ok(file) => file,
        Err(_) => return -1,
    };
    let mut buffer = vec![0u8; 1024 * 1024];
    loop {
        if (*operation).cancelled.load(Ordering::SeqCst) {
            buffer.fill(0);
            drop(destination);
            let _ = std::fs::remove_file(output);
            return -1;
        }
        let bytes_read = match source.read(&mut buffer) {
            Ok(0) => break,
            Ok(count) => count,
            Err(_) => {
                buffer.fill(0);
                drop(destination);
                let _ = std::fs::remove_file(output);
                return -1;
            }
        };
        if destination.write_all(&buffer[..bytes_read]).is_err() {
            buffer.fill(0);
            drop(destination);
            let _ = std::fs::remove_file(output);
            return -1;
        }
        buffer[..bytes_read].fill(0);
    }
    buffer.fill(0);
    if destination.sync_all().is_err() {
        drop(destination);
        let _ = std::fs::remove_file(output);
        return -1;
    }
    0
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
        learning_steps: 0,
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

    let key = Zeroizing::new(synapse_core::crypto::derive_key_from_password(pass_str));
    let slice = std::slice::from_raw_parts_mut(out_key32, 32);
    slice.copy_from_slice(&key[..]);
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
pub unsafe extern "C" fn synapse_crypto_hash_password_v2(password: *const c_char) -> *mut c_char {
    if password.is_null() {
        return std::ptr::null_mut();
    }
    let pass_str = match CStr::from_ptr(password).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };
    let verifier = synapse_core::crypto::hash_auth_password_v2(pass_str);
    match CString::new(verifier) {
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
    let mut key_arr = Zeroizing::new([0u8; 32]);
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
    let mut key_arr = Zeroizing::new([0u8; 32]);
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
        slice.zeroize();
    }
}

#[no_mangle]
pub unsafe extern "C" fn synapse_free_secret_string(s: *mut c_char) {
    if s.is_null() {
        return;
    }
    let mut bytes = CString::from_raw(s).into_bytes_with_nul();
    bytes.zeroize();
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
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

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

            let verifier_ptr = synapse_crypto_hash_password_v2(pass.as_ptr());
            assert!(!verifier_ptr.is_null());
            let verifier = CStr::from_ptr(verifier_ptr).to_str().unwrap().to_string();
            synapse_free_string(verifier_ptr);
            assert!(verifier.starts_with("v2:"));
            assert_eq!(verifier.len(), 67);

            // Module key generation
            let mod_key_ptr = synapse_crypto_generate_module_key();
            assert!(!mod_key_ptr.is_null());
            let mod_key = CStr::from_ptr(mod_key_ptr).to_str().unwrap().to_string();
            synapse_free_secret_string(mod_key_ptr);
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
            synapse_free_secret_string(dec_mod_ptr);

            // Content encrypt/decrypt
            let plain_c = CString::new("Texto ultrassecreto do cofre: 123456 @#$ áéíóú").unwrap();
            let enc_content_ptr = synapse_crypto_encrypt(mod_key_c.as_ptr(), plain_c.as_ptr());
            assert!(!enc_content_ptr.is_null());

            let dec_content_ptr = synapse_crypto_decrypt(mod_key_c.as_ptr(), enc_content_ptr);
            assert!(!dec_content_ptr.is_null());
            let recovered_plain = CStr::from_ptr(dec_content_ptr).to_str().unwrap().to_string();
            assert_eq!(recovered_plain, "Texto ultrassecreto do cofre: 123456 @#$ áéíóú");
            synapse_free_string(enc_content_ptr);
            synapse_free_secret_string(dec_content_ptr);

            // Wipe memory test
            synapse_crypto_wipe_memory(master_key.as_mut_ptr(), 32);
            assert_eq!(master_key, [0u8; 32]);
        }
    }

    #[test]
    fn file_crypto_ffi_roundtrips_multi_chunk_payload() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock must be valid")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("synapse-bridge-files-{nonce}"));
        fs::create_dir_all(&root).expect("temporary test directory must be created");
        let source = root.join("source.bin");
        let encrypted = root.join("encrypted.enc");
        let decrypted = root.join("decrypted.bin");
        let cancelled_output = root.join("cancelled.enc");
        let payload: Vec<u8> = (0..(1024 * 1024 + 333))
            .map(|index| (index % 251) as u8)
            .collect();
        fs::write(&source, &payload).expect("test source must be written");

        unsafe {
            let key_ptr = synapse_crypto_generate_module_key();
            assert!(!key_ptr.is_null());
            let key = CStr::from_ptr(key_ptr).to_str().unwrap().to_string();
            synapse_free_secret_string(key_ptr);

            let source_path = CString::new(source.to_string_lossy().as_bytes()).unwrap();
            let encrypted_path = CString::new(encrypted.to_string_lossy().as_bytes()).unwrap();
            let decrypted_path = CString::new(decrypted.to_string_lossy().as_bytes()).unwrap();
            let key_c = CString::new(key).unwrap();
            let operation = synapse_file_operation_create();
            assert!(!operation.is_null());

            assert_eq!(
                synapse_file_encrypt(
                    source_path.as_ptr(),
                    encrypted_path.as_ptr(),
                    key_c.as_ptr(),
                    operation
                ),
                0
            );
            assert_eq!(
                synapse_file_decrypt(
                    encrypted_path.as_ptr(),
                    decrypted_path.as_ptr(),
                    key_c.as_ptr(),
                    operation
                ),
                0
            );
            synapse_file_operation_close(operation);

            let cancelled_operation = synapse_file_operation_create();
            assert!(!cancelled_operation.is_null());
            synapse_file_operation_cancel(cancelled_operation);
            let cancelled_path = CString::new(cancelled_output.to_string_lossy().as_bytes()).unwrap();
            assert_eq!(
                synapse_file_encrypt(
                    source_path.as_ptr(),
                    cancelled_path.as_ptr(),
                    key_c.as_ptr(),
                    cancelled_operation
                ),
                -1
            );
            synapse_file_operation_close(cancelled_operation);
        }

        assert_eq!(
            fs::read(&decrypted).expect("decrypted file must exist"),
            payload
        );
        assert!(!cancelled_output.exists());
        fs::remove_dir_all(root).expect("temporary test files must be removed");
    }

    #[test]
    fn file_crypto_ffi_encrypts_utf8_memory_without_plaintext_staging() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock must be valid")
            .as_nanos();
        let root = std::env::temp_dir().join(format!("synapse-bridge-memory-{nonce}"));
        fs::create_dir_all(&root).expect("temporary test directory must be created");
        let encrypted = root.join("subtitle.vtt");
        let decrypted = root.join("decrypted.vtt");
        let payload = b"WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nOl\xc3\xa1, estudante \xf0\x9f\x91\x8b\n";

        unsafe {
            let key_ptr = synapse_crypto_generate_module_key();
            assert!(!key_ptr.is_null());
            let key = CStr::from_ptr(key_ptr).to_str().unwrap().to_string();
            synapse_free_secret_string(key_ptr);
            let encrypted_path = CString::new(encrypted.to_string_lossy().as_bytes()).unwrap();
            let decrypted_path = CString::new(decrypted.to_string_lossy().as_bytes()).unwrap();
            let key_c = CString::new(key).unwrap();
            let operation = synapse_file_operation_create();
            assert!(!operation.is_null());

            assert_eq!(
                synapse_file_encrypt_bytes(
                    payload.as_ptr(),
                    payload.len(),
                    encrypted_path.as_ptr(),
                    key_c.as_ptr(),
                    operation
                ),
                0
            );
            assert_eq!(
                synapse_file_decrypt(
                    encrypted_path.as_ptr(),
                    decrypted_path.as_ptr(),
                    key_c.as_ptr(),
                    operation
                ),
                0
            );
            synapse_file_operation_close(operation);
        }

        assert_eq!(fs::read(&decrypted).unwrap(), payload);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn database_execute_uses_bound_values() {
        unsafe {
            let path = CString::new(":memory:").unwrap();
            let database = synapse_db_open(path.as_ptr());
            assert!(!database.is_null());
            let create_sql = CString::new(
                "CREATE TABLE parameter_test (id TEXT PRIMARY KEY, label TEXT, visible INTEGER)",
            )
            .unwrap();
            assert_eq!(synapse_db_execute(database, create_sql.as_ptr()), 0);

            let insert_sql =
                CString::new("INSERT INTO parameter_test (id, label, visible) VALUES (?1, ?2, ?3)")
                    .unwrap();
            let parameters = CString::new(r#"["row-1","O'Brien 🎬",true]"#).unwrap();
            assert_eq!(
                synapse_db_execute_params(database, insert_sql.as_ptr(), parameters.as_ptr()),
                1
            );

            let query = CString::new("SELECT label, visible FROM parameter_test WHERE id = 'row-1'")
                .unwrap();
            let result = synapse_db_query_json(database, query.as_ptr());
            assert!(!result.is_null());
            let json = CStr::from_ptr(result).to_str().unwrap();
            assert!(json.contains("O'Brien 🎬"));
            assert!(json.contains("\"visible\":1"));
            synapse_free_string(result);

            let query_params = CString::new(
                "SELECT label FROM parameter_test WHERE id = ?1",
            )
            .unwrap();
            let query_values = CString::new(r#"["row-1"]"#).unwrap();
            let bound_result = synapse_db_query_json_params(
                database,
                query_params.as_ptr(),
                query_values.as_ptr(),
            );
            assert!(!bound_result.is_null());
            assert!(CStr::from_ptr(bound_result).to_str().unwrap().contains("O'Brien 🎬"));
            synapse_free_string(bound_result);
            synapse_db_close(database);
        }
    }
}

