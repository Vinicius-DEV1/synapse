use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use std::fs::File;
use std::io::{Read, Write, Seek, SeekFrom};
use std::path::Path;

pub const MAGIC_BYTES: &[u8; 4] = b"ENC1";
pub const CHUNK_SIZE: u32 = 1024 * 1024; // 1MB

pub fn encrypt_file_chunked<P: AsRef<Path>, Q: AsRef<Path>>(
    input_path: P,
    output_path: Q,
    key_hex: &str,
) -> Result<(), String> {
    let key_bytes = hex::decode(key_hex).map_err(|_| "Invalid Key Hex")?;
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".into());
    }
    
    let cipher = Aes256Gcm::new(key_bytes.as_slice().into());
    
    let mut input_file = File::open(input_path).map_err(|e| format!("Failed to open input: {}", e))?;
    let mut output_file = File::create(output_path).map_err(|e| format!("Failed to create output: {}", e))?;
    
    let file_metadata = input_file.metadata().map_err(|e| e.to_string())?;
    let original_size = file_metadata.len();
    
    // Write Header: MAGIC(4) + ORIGINAL_SIZE(8) + CHUNK_SIZE(4) = 16 bytes
    output_file.write_all(MAGIC_BYTES).map_err(|e| e.to_string())?;
    output_file.write_all(&original_size.to_le_bytes()).map_err(|e| e.to_string())?;
    output_file.write_all(&CHUNK_SIZE.to_le_bytes()).map_err(|e| e.to_string())?;
    
    let mut buffer = vec![0u8; CHUNK_SIZE as usize];
    
    loop {
        let bytes_read = input_file.read(&mut buffer).map_err(|e| e.to_string())?;
        if bytes_read == 0 {
            break;
        }
        
        let chunk = &buffer[..bytes_read];
        
        let mut iv = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut iv);
        let nonce = Nonce::from_slice(&iv);
        
        let encrypted_chunk = cipher.encrypt(nonce, chunk)
            .map_err(|e| format!("Encryption failed: {:?}", e))?;
            
        // Escreve IV (12 bytes) + Encrypted Data with Tag (bytes_read + 16)
        output_file.write_all(&iv).map_err(|e| e.to_string())?;
        output_file.write_all(&encrypted_chunk).map_err(|e| e.to_string())?;
    }
    
    Ok(())
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
    let key_bytes = hex::decode(key_hex).map_err(|_| "Invalid Key Hex")?;
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".into());
    }
    
    let cipher = Aes256Gcm::new(key_bytes.as_slice().into());
    let mut input_file = File::open(input_path).map_err(|e| format!("Failed to open input: {}", e))?;
    
    let mut header = [0u8; 16];
    input_file.read_exact(&mut header).map_err(|e| format!("Failed to read header: {}", e))?;
    
    if &header[0..4] != MAGIC_BYTES {
        return Err("Invalid file format (missing ENC1)".into());
    }
    
    let mut size_bytes = [0u8; 8];
    size_bytes.copy_from_slice(&header[4..12]);
    let original_size = u64::from_le_bytes(size_bytes);
    
    let mut chunk_size_bytes = [0u8; 4];
    chunk_size_bytes.copy_from_slice(&header[12..16]);
    let chunk_size = u32::from_le_bytes(chunk_size_bytes) as u64;
    
    if start_byte >= original_size {
        return Ok(DecryptedRange { data: Vec::new(), total_original_size: original_size });
    }
    
    let actual_end = if end_byte >= original_size { original_size - 1 } else { end_byte };
    if start_byte > actual_end {
        return Ok(DecryptedRange { data: Vec::new(), total_original_size: original_size });
    }
    
    let start_chunk = start_byte / chunk_size;
    let end_chunk = actual_end / chunk_size;
    
    let mut result_data = Vec::new();
    
    for chunk_idx in start_chunk..=end_chunk {
        let chunk_file_offset = 16 + (chunk_idx * (chunk_size + 28)); // 12 IV + 16 Tag = 28 bytes extra per chunk
        
        input_file.seek(SeekFrom::Start(chunk_file_offset))
            .map_err(|e| format!("Seek failed: {}", e))?;
            
        let mut iv = [0u8; 12];
        let bytes_read_iv = input_file.read(&mut iv).map_err(|e| e.to_string())?;
        if bytes_read_iv < 12 {
            return Err("Unexpected EOF reading IV".into());
        }
        
        // Calculate how much encrypted data is in this chunk
        let current_chunk_original_size = if chunk_idx == (original_size / chunk_size) {
            original_size % chunk_size
        } else {
            chunk_size
        };
        
        let encrypted_size = current_chunk_original_size + 16; // +16 for auth tag
        let mut encrypted_buffer = vec![0u8; encrypted_size as usize];
        
        input_file.read_exact(&mut encrypted_buffer).map_err(|e| format!("Failed to read encrypted chunk: {}", e))?;
        
        let nonce = Nonce::from_slice(&iv);
        let decrypted_chunk = cipher.decrypt(nonce, encrypted_buffer.as_ref())
            .map_err(|e| format!("Decryption failed for chunk {}: {:?}", chunk_idx, e))?;
            
        // Calculate the overlap of this chunk with the requested range
        let chunk_start_byte = chunk_idx * chunk_size;
        
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

pub async fn read_network_chunked_range_async(
    file_id: &str,
    access_token: &str,
    key_hex: &str,
    start_byte: u64,
    end_byte: u64, // inclusive
) -> Result<DecryptedRange, String> {
    let key_bytes = hex::decode(key_hex).map_err(|_| "Invalid Key Hex")?;
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".into());
    }
    
    let cipher = Aes256Gcm::new(key_bytes.as_slice().into());
    let client = reqwest::Client::new();
    let drive_url = format!("https://www.googleapis.com/drive/v3/files/{}?alt=media", file_id);
    
    // Fetch Header (16 bytes)
    let header_req = client.get(&drive_url)
        .header("Authorization", format!("Bearer {}", access_token))
        .header("Range", "bytes=0-15")
        .send().await.map_err(|e| format!("Failed to fetch header: {}", e))?;
        
    if !header_req.status().is_success() {
        return Err(format!("Google Drive returned status: {}", header_req.status()));
    }
    
    let header = header_req.bytes().await.map_err(|e| format!("Failed to read header bytes: {}", e))?;
    if header.len() < 16 {
        return Err("Header too short".into());
    }
    
    if &header[0..4] != MAGIC_BYTES {
        return Err("Invalid file format (missing ENC1)".into());
    }
    
    let mut size_bytes = [0u8; 8];
    size_bytes.copy_from_slice(&header[4..12]);
    let original_size = u64::from_le_bytes(size_bytes);
    
    let mut chunk_size_bytes = [0u8; 4];
    chunk_size_bytes.copy_from_slice(&header[12..16]);
    let chunk_size = u32::from_le_bytes(chunk_size_bytes) as u64;
    
    if start_byte >= original_size {
        return Ok(DecryptedRange { data: Vec::new(), total_original_size: original_size });
    }
    
    let actual_end = if end_byte >= original_size { original_size - 1 } else { end_byte };
    if start_byte > actual_end {
        return Ok(DecryptedRange { data: Vec::new(), total_original_size: original_size });
    }
    
    let start_chunk = start_byte / chunk_size;
    let end_chunk = actual_end / chunk_size;
    
    let mut result_data = Vec::new();
    
    for chunk_idx in start_chunk..=end_chunk {
        let current_chunk_original_size = if chunk_idx == (original_size / chunk_size) {
            original_size % chunk_size
        } else {
            chunk_size
        };
        if current_chunk_original_size == 0 { break; }
        
        let encrypted_size = current_chunk_original_size + 16; // +16 for auth tag
        
        let chunk_file_offset_start = 16 + (chunk_idx * (chunk_size + 28)); // 12 IV + 16 Tag = 28 bytes extra per chunk
        let chunk_file_offset_end = chunk_file_offset_start + 12 + encrypted_size - 1;
        
        // Fetch IV + Encrypted Data
        let chunk_req = client.get(&drive_url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Range", format!("bytes={}-{}", chunk_file_offset_start, chunk_file_offset_end))
            .send().await.map_err(|e| format!("Failed to fetch chunk {}: {}", chunk_idx, e))?;
            
        if !chunk_req.status().is_success() {
            return Err(format!("Google Drive returned status {} for chunk", chunk_req.status()));
        }
        
        let chunk_bytes = chunk_req.bytes().await.map_err(|e| e.to_string())?;
        if chunk_bytes.len() < 12 {
            return Err("Unexpected EOF reading IV from network".into());
        }
        
        let mut iv = [0u8; 12];
        iv.copy_from_slice(&chunk_bytes[0..12]);
        
        let encrypted_buffer = &chunk_bytes[12..];
        
        let nonce = Nonce::from_slice(&iv);
        let decrypted_chunk = cipher.decrypt(nonce, encrypted_buffer)
            .map_err(|e| format!("Decryption failed for chunk {}: {:?}", chunk_idx, e))?;
            
        let chunk_start_byte = chunk_idx * chunk_size;
        
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
