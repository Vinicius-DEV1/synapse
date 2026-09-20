use crate::crypto_stream::{DecryptedRange, MAGIC_BYTES};
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};

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
    let drive_url = format!(
        "https://www.googleapis.com/drive/v3/files/{}?alt=media",
        file_id
    );

    // Fetch Header (16 bytes)
    let header_req = client
        .get(&drive_url)
        .header("Authorization", format!("Bearer {}", access_token))
        .header("Range", "bytes=0-15")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch header: {}", e))?;

    if !header_req.status().is_success() {
        return Err(format!(
            "Google Drive returned status: {}",
            header_req.status()
        ));
    }

    let header = header_req
        .bytes()
        .await
        .map_err(|e| format!("Failed to read header bytes: {}", e))?;
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
        let chunk_start_byte = chunk_idx * chunk_size;
        let current_chunk_original_size = if chunk_start_byte + chunk_size > original_size {
            original_size - chunk_start_byte
        } else {
            chunk_size
        };
        if current_chunk_original_size == 0 {
            break;
        }

        let encrypted_size = current_chunk_original_size + 16; // +16 for auth tag

        let chunk_file_offset_start = 16 + (chunk_idx * (chunk_size + 28)); // 12 IV + 16 Tag = 28 bytes extra per chunk
        let chunk_file_offset_end = chunk_file_offset_start + 12 + encrypted_size - 1;

        // Fetch IV + Encrypted Data
        let chunk_req = client
            .get(&drive_url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header(
                "Range",
                format!(
                    "bytes={}-{}",
                    chunk_file_offset_start, chunk_file_offset_end
                ),
            )
            .send()
            .await
            .map_err(|e| format!("Failed to fetch chunk {}: {}", chunk_idx, e))?;

        if !chunk_req.status().is_success() {
            return Err(format!(
                "Google Drive returned status {} for chunk",
                chunk_req.status()
            ));
        }

        let chunk_bytes = chunk_req.bytes().await.map_err(|e| e.to_string())?;
        if chunk_bytes.len() < 12 {
            return Err("Unexpected EOF reading IV from network".into());
        }

        let mut iv = [0u8; 12];
        iv.copy_from_slice(&chunk_bytes[0..12]);

        let encrypted_buffer = &chunk_bytes[12..];

        let nonce = Nonce::from_slice(&iv);
        let decrypted_chunk = cipher
            .decrypt(nonce, encrypted_buffer)
            .map_err(|e| format!("Decryption failed for chunk {}: {:?}", chunk_idx, e))?;

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
