//! Encrypted note image cache storage and data URI decoding helpers (`image_cache` SQLite table).

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use rusqlite::{params, Connection, OptionalExtension};
use zeroize::Zeroizing;

use crate::error::{Result, SynapseError};

pub fn base64_encode(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(input.len().div_ceil(3) * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        out.push(TABLE[((triple >> 18) & 0x3F) as usize] as char);
        out.push(TABLE[((triple >> 12) & 0x3F) as usize] as char);
        out.push(if chunk.len() > 1 {
            TABLE[((triple >> 6) & 0x3F) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            TABLE[(triple & 0x3F) as usize] as char
        } else {
            '='
        });
    }
    out
}

fn detect_image_mime(data: &[u8], fallback: Option<&str>) -> String {
    if data.starts_with(b"\x89PNG") {
        return "image/png".to_string();
    }
    if data.starts_with(b"\xFF\xD8\xFF") {
        return "image/jpeg".to_string();
    }
    if data.starts_with(b"GIF8") {
        return "image/gif".to_string();
    }
    if data.len() >= 12 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
        return "image/webp".to_string();
    }
    if data.starts_with(b"<svg") || data.starts_with(b"<?xml") {
        return "image/svg+xml".to_string();
    }
    fallback
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("image/png")
        .to_string()
}

fn is_known_image_magic(data: &[u8]) -> bool {
    data.starts_with(b"\x89PNG")
        || data.starts_with(b"\xFF\xD8\xFF")
        || data.starts_with(b"GIF8")
        || (data.len() >= 12 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP")
        || data.starts_with(b"<svg")
}

fn decrypt_gcm_blob(key_hex: &str, blob: &[u8]) -> Result<Vec<u8>> {
    let key_bytes = Zeroizing::new(
        hex::decode(key_hex.trim())
            .map_err(|_| SynapseError::Crypto("Invalid notes key hex".into()))?,
    );
    if key_bytes.len() != 32 {
        return Err(SynapseError::Crypto("Notes key must be 32 bytes".into()));
    }
    if blob.len() < 28 {
        return Err(SynapseError::Crypto(
            "Encrypted image blob too short".into(),
        ));
    }
    let payload = blob.strip_prefix(b"ENC1").unwrap_or(blob);
    if payload.len() < 28 {
        return Err(SynapseError::Crypto(
            "Invalid encrypted image payload".into(),
        ));
    }
    let (nonce_bytes, ct_and_tag) = payload.split_at(12);
    let cipher = Aes256Gcm::new(aes_gcm::aead::Key::<Aes256Gcm>::from_slice(&key_bytes));
    let nonce = Nonce::from_slice(nonce_bytes);
    cipher
        .decrypt(nonce, ct_and_tag)
        .map_err(|_| SynapseError::Crypto("Failed to decrypt image payload".into()))
}

fn encrypt_gcm_blob(key_hex: &str, raw: &[u8]) -> Result<Vec<u8>> {
    let key_bytes = Zeroizing::new(
        hex::decode(key_hex.trim())
            .map_err(|_| SynapseError::Crypto("Invalid notes key hex".into()))?,
    );
    if key_bytes.len() != 32 {
        return Err(SynapseError::Crypto("Notes key must be 32 bytes".into()));
    }
    let cipher = Aes256Gcm::new(aes_gcm::aead::Key::<Aes256Gcm>::from_slice(&key_bytes));
    let mut iv = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut iv);
    let ct = cipher
        .encrypt(Nonce::from_slice(&iv), raw)
        .map_err(|_| SynapseError::Crypto("Failed to encrypt image payload".into()))?;
    let mut out = Vec::with_capacity(4 + 12 + ct.len());
    out.extend_from_slice(b"ENC1");
    out.extend_from_slice(&iv);
    out.extend_from_slice(&ct);
    Ok(out)
}

/// Loads an image by ID from SQLite `image_cache`, decrypting if needed,
/// and returns a `data:<mime>;base64,...` URI safe for native Qt `Image`.
pub fn get_cached_image_data_uri(
    conn: &Connection,
    image_id: &str,
    key_hex: Option<&str>,
) -> Result<Option<String>> {
    let row: Option<(Vec<u8>, Option<String>)> = conn
        .query_row(
            "SELECT data, mimeType FROM image_cache WHERE id = ?1",
            params![image_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    let Some((raw_bytes, mime_opt)) = row else {
        return Ok(None);
    };
    let final_bytes = if is_known_image_magic(&raw_bytes) {
        raw_bytes
    } else {
        let Some(k) = key_hex.filter(|s| !s.trim().is_empty()) else {
            return Ok(None);
        };
        decrypt_gcm_blob(k, &raw_bytes)?
    };
    let mime = detect_image_mime(&final_bytes, mime_opt.as_deref());
    Ok(Some(format!(
        "data:{};base64,{}",
        mime,
        base64_encode(&final_bytes)
    )))
}

/// Inserts or updates a cached image record (optionally encrypted at rest when `key_hex` is present).
pub fn put_cached_image_bytes(
    conn: &Connection,
    image_id: &str,
    raw_bytes: &[u8],
    mime_type: Option<&str>,
    key_hex: Option<&str>,
) -> Result<bool> {
    let mime = detect_image_mime(raw_bytes, mime_type);
    let stored_bytes = match key_hex.filter(|s| !s.trim().is_empty()) {
        Some(k) if !raw_bytes.starts_with(b"ENC1") => encrypt_gcm_blob(k, raw_bytes)?,
        _ => raw_bytes.to_vec(),
    };
    let rows = conn.execute(
        "INSERT OR REPLACE INTO image_cache (id, data, mimeType) VALUES (?1, ?2, ?3)",
        params![image_id, stored_bytes, mime],
    )?;
    Ok(rows > 0)
}

pub fn delete_cached_image(conn: &Connection, image_id: &str) -> Result<bool> {
    let rows = conn.execute("DELETE FROM image_cache WHERE id = ?1", params![image_id])?;
    Ok(rows > 0)
}
