use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use zeroize::{Zeroize, Zeroizing};

pub const MAGIC_BYTES: &[u8; 4] = b"ENC1";
pub const CHUNK_SIZE: u32 = 1024 * 1024; // 1MB

fn validated_original_size(file: &mut File) -> Result<u64, String> {
    let mut header = [0u8; 16];
    file.read_exact(&mut header)
        .map_err(|e| format!("Failed to read header: {e}"))?;
    if &header[..4] != MAGIC_BYTES {
        return Err("Invalid file format (missing ENC1)".into());
    }

    let original_size = u64::from_le_bytes(header[4..12].try_into().expect("fixed header range"));
    let chunk_size = u32::from_le_bytes(header[12..16].try_into().expect("fixed header range"));
    if chunk_size != CHUNK_SIZE {
        return Err("Unsupported ENC1 chunk size".into());
    }

    let chunk_size_u64 = u64::from(CHUNK_SIZE);
    let chunk_count = original_size / chunk_size_u64
        + if original_size % chunk_size_u64 == 0 { 0 } else { 1 };
    let expected_size = original_size
        .checked_add(chunk_count.checked_mul(28).ok_or("ENC1 file size overflow")?)
        .and_then(|size| size.checked_add(16))
        .ok_or("ENC1 file size overflow")?;
    let actual_size = file.metadata().map_err(|e| e.to_string())?.len();
    if actual_size != expected_size {
        return Err("ENC1 container length does not match its header".into());
    }
    Ok(original_size)
}

pub fn encrypt_file_chunked<P: AsRef<Path>, Q: AsRef<Path>>(
    input_path: P,
    output_path: Q,
    key_hex: &str,
    cancel_flag: Option<&AtomicBool>,
) -> Result<(), String> {
    let key_bytes = Zeroizing::new(hex::decode(key_hex).map_err(|_| "Invalid Key Hex")?);
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".into());
    }

    let cipher = Aes256Gcm::new(key_bytes.as_slice().into());

    let mut input_file =
        File::open(input_path).map_err(|e| format!("Failed to open input: {}", e))?;
    let mut output_file =
        File::create(output_path).map_err(|e| format!("Failed to create output: {}", e))?;

    let file_metadata = input_file.metadata().map_err(|e| e.to_string())?;
    let original_size = file_metadata.len();

    // Write Header: MAGIC(4) + ORIGINAL_SIZE(8) + CHUNK_SIZE(4) = 16 bytes
    output_file
        .write_all(MAGIC_BYTES)
        .map_err(|e| e.to_string())?;
    output_file
        .write_all(&original_size.to_le_bytes())
        .map_err(|e| e.to_string())?;
    output_file
        .write_all(&CHUNK_SIZE.to_le_bytes())
        .map_err(|e| e.to_string())?;

    let mut buffer = Zeroizing::new(vec![0u8; CHUNK_SIZE as usize]);

    loop {
        if let Some(flag) = cancel_flag {
            if flag.load(Ordering::SeqCst) {
                return Err("Criptografia cancelada pelo usuário.".into());
            }
        }

        let mut bytes_read = 0;
        while bytes_read < CHUNK_SIZE as usize {
            let n = input_file
                .read(&mut buffer[bytes_read..])
                .map_err(|e| e.to_string())?;
            if n == 0 {
                break;
            }
            bytes_read += n;
        }
        if bytes_read == 0 {
            break;
        }

        let chunk = &buffer[..bytes_read];

        let mut iv = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut iv);
        let nonce = Nonce::from_slice(&iv);

        let encrypted_chunk = cipher
            .encrypt(nonce, chunk)
            .map_err(|e| format!("Encryption failed: {:?}", e))?;

        // Write IV (12 bytes) + Encrypted Data with Tag (bytes_read + 16)
        output_file.write_all(&iv).map_err(|e| e.to_string())?;
        output_file
            .write_all(&encrypted_chunk)
            .map_err(|e| e.to_string())?;
        buffer[..bytes_read].zeroize();
    }

    Ok(())
}

pub fn encrypt_bytes_chunked<P: AsRef<Path>>(
    data: &[u8],
    output_path: P,
    key_hex: &str,
    cancel_flag: Option<&AtomicBool>,
) -> Result<(), String> {
    let key_bytes = Zeroizing::new(hex::decode(key_hex).map_err(|_| "Invalid Key Hex")?);
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".into());
    }

    let cipher = Aes256Gcm::new(key_bytes.as_slice().into());
    let mut output_file =
        File::create(output_path).map_err(|e| format!("Failed to create output: {e}"))?;
    output_file
        .write_all(MAGIC_BYTES)
        .map_err(|e| e.to_string())?;
    output_file
        .write_all(&(data.len() as u64).to_le_bytes())
        .map_err(|e| e.to_string())?;
    output_file
        .write_all(&CHUNK_SIZE.to_le_bytes())
        .map_err(|e| e.to_string())?;

    for chunk in data.chunks(CHUNK_SIZE as usize) {
        if let Some(flag) = cancel_flag {
            if flag.load(Ordering::SeqCst) {
                return Err("Encryption cancelled".into());
            }
        }
        let mut iv = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut iv);
        let encrypted_chunk = cipher
            .encrypt(Nonce::from_slice(&iv), chunk)
            .map_err(|e| format!("Encryption failed: {e:?}"))?;
        output_file.write_all(&iv).map_err(|e| e.to_string())?;
        output_file
            .write_all(&encrypted_chunk)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub fn get_encrypted_file_size<P: AsRef<Path>>(input_path: P) -> Result<u64, String> {
    let mut input_file =
        File::open(input_path).map_err(|e| format!("Failed to open input: {}", e))?;
    validated_original_size(&mut input_file)
}

pub struct DecryptedRange {
    pub data: Vec<u8>,
    pub total_original_size: u64,
}

pub fn read_chunked_range<P: AsRef<Path>>(
    input_path: P,
    key_hex: &str,
    start_byte: u64,
    end_byte: u64, // inclusive
) -> Result<DecryptedRange, String> {
    let key_bytes = Zeroizing::new(hex::decode(key_hex).map_err(|_| "Invalid Key Hex")?);
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".into());
    }

    let cipher = Aes256Gcm::new(key_bytes.as_slice().into());
    let mut input_file =
        File::open(input_path).map_err(|e| format!("Failed to open input: {}", e))?;

    let original_size = validated_original_size(&mut input_file)?;
    let chunk_size = u64::from(CHUNK_SIZE);

    if start_byte >= original_size {
        return Ok(DecryptedRange {
            data: Vec::new(),
            total_original_size: original_size,
        });
    }

    let actual_end = if end_byte >= original_size {
        original_size - 1
    } else {
        end_byte
    };
    if start_byte > actual_end {
        return Ok(DecryptedRange {
            data: Vec::new(),
            total_original_size: original_size,
        });
    }

    let start_chunk = start_byte / chunk_size;
    let end_chunk = actual_end / chunk_size;

    let mut result_data = Vec::new();

    for chunk_idx in start_chunk..=end_chunk {
        let chunk_file_offset = chunk_idx
            .checked_mul(chunk_size + 28)
            .and_then(|offset| offset.checked_add(16))
            .ok_or("ENC1 chunk offset overflow")?;

        input_file
            .seek(SeekFrom::Start(chunk_file_offset))
            .map_err(|e| format!("Seek failed: {}", e))?;

        let mut iv = [0u8; 12];
        let bytes_read_iv = input_file.read(&mut iv).map_err(|e| e.to_string())?;
        if bytes_read_iv < 12 {
            return Err("Unexpected EOF reading IV".into());
        }

        let chunk_start_byte = chunk_idx * chunk_size;
        let current_chunk_original_size = if chunk_start_byte + chunk_size > original_size {
            original_size - chunk_start_byte
        } else {
            chunk_size
        };

        let encrypted_size = current_chunk_original_size
            .checked_add(16)
            .ok_or("ENC1 chunk length overflow")?;
        let encrypted_size = usize::try_from(encrypted_size)
            .map_err(|_| "ENC1 chunk exceeds the platform address space")?;
        let mut encrypted_buffer = vec![0u8; encrypted_size];

        input_file
            .read_exact(&mut encrypted_buffer)
            .map_err(|e| format!("Failed to read encrypted chunk: {}", e))?;

        let nonce = Nonce::from_slice(&iv);
        let decrypted_chunk = Zeroizing::new(
            cipher
                .decrypt(nonce, encrypted_buffer.as_ref())
                .map_err(|e| format!("Decryption failed for chunk {}: {:?}", chunk_idx, e))?,
        );

        let copy_start = if start_byte > chunk_start_byte {
            (start_byte - chunk_start_byte) as usize
        } else {
            0
        };

        let copy_end = if actual_end < chunk_start_byte + current_chunk_original_size - 1 {
            (actual_end - chunk_start_byte + 1) as usize
        } else {
            decrypted_chunk.len()
        };

        result_data.extend_from_slice(&decrypted_chunk[copy_start..copy_end]);
    }

    Ok(DecryptedRange {
        data: result_data,
        total_original_size: original_size,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_chunked_file_encryption_and_seek_decryption() {
        let key_hex = crate::crypto::generate_module_key();

        // Create 2.5 MB of test data across multiple 1MB chunks
        let test_data: Vec<u8> = (0..(2500 * 1024)).map(|i| (i % 256) as u8).collect();

        let mut input_file = NamedTempFile::new().unwrap();
        input_file.write_all(&test_data).unwrap();

        let output_file = NamedTempFile::new().unwrap();

        // Encrypt
        encrypt_file_chunked(input_file.path(), output_file.path(), &key_hex, None).unwrap();

        // Verify size
        let size = get_encrypted_file_size(output_file.path()).unwrap();
        assert_eq!(size, test_data.len() as u64);

        // Test Seek across chunk boundary: from 900KB to 1.2MB
        let range =
            read_chunked_range(output_file.path(), &key_hex, 900 * 1024, 1200 * 1024).unwrap();
        assert_eq!(range.data.len(), (1200 * 1024 - 900 * 1024 + 1));
        assert_eq!(range.data, &test_data[900 * 1024..=1200 * 1024]);
    }

    #[test]
    fn test_chunked_buffer_encryption_roundtrips_utf8() {
        let key_hex = crate::crypto::generate_module_key();
        let test_data = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nOlá, estudante 👋\n".as_bytes();
        let output_file = NamedTempFile::new().unwrap();

        encrypt_bytes_chunked(test_data, output_file.path(), &key_hex, None).unwrap();
        assert_eq!(
            get_encrypted_file_size(output_file.path()).unwrap(),
            test_data.len() as u64
        );
        let decrypted =
            read_chunked_range(output_file.path(), &key_hex, 0, test_data.len() as u64 - 1)
                .unwrap();
        assert_eq!(decrypted.data, test_data);
    }

    #[test]
    fn malformed_container_headers_are_rejected_without_panicking() {
        let malformed = NamedTempFile::new().unwrap();
        let mut file = File::create(malformed.path()).unwrap();
        file.write_all(MAGIC_BYTES).unwrap();
        file.write_all(&1u64.to_le_bytes()).unwrap();
        file.write_all(&0u32.to_le_bytes()).unwrap();
        drop(file);

        assert!(get_encrypted_file_size(malformed.path()).is_err());
        assert!(read_chunked_range(malformed.path(), &crate::crypto::generate_module_key(), 0, 0).is_err());
    }

    #[test]
    fn truncated_and_extended_containers_are_rejected() {
        let key = crate::crypto::generate_module_key();
        let mut input = NamedTempFile::new().unwrap();
        input.write_all(b"encrypted data").unwrap();
        let output = NamedTempFile::new().unwrap();
        encrypt_file_chunked(input.path(), output.path(), &key, None).unwrap();

        let mut bytes = std::fs::read(output.path()).unwrap();
        bytes.pop();
        std::fs::write(output.path(), &bytes).unwrap();
        assert!(get_encrypted_file_size(output.path()).is_err());

        encrypt_file_chunked(input.path(), output.path(), &key, None).unwrap();
        let mut bytes = std::fs::read(output.path()).unwrap();
        bytes.push(0);
        std::fs::write(output.path(), &bytes).unwrap();
        assert!(get_encrypted_file_size(output.path()).is_err());
    }
}
