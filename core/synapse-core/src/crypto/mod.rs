pub mod stream;

use aes_gcm::{
    aead::{consts::U16, Aead, KeyInit},
    aes::Aes256,
    Aes256Gcm, AesGcm,
};
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use sha2::Sha256;
use zeroize::{Zeroize, Zeroizing};

// Type alias for AES-256-GCM with 16-byte nonce (used for module keys)
type Aes256Gcm16 = AesGcm<Aes256, U16>;

pub fn derive_key_from_password(password: &str) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(
        password.as_bytes(),
        b"caderno-keychain-salt",
        600000,
        &mut key,
    );
    key
}

pub fn hash_auth_password(password: &str) -> String {
    use sha2::Digest;
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hasher.update(b"caderno-auth-hash");
    hex::encode(hasher.finalize())
}

pub fn hash_auth_password_v2(password: &str) -> String {
    use sha2::Digest;
    let master_key = Zeroizing::new(derive_key_from_password(password));
    let mut hasher = Sha256::new();
    hasher.update(b"caderno-auth-verifier-v2");
    hasher.update(master_key.as_slice());
    format!("v2:{}", hex::encode(hasher.finalize()))
}

pub fn generate_module_key() -> String {
    let mut key = Zeroizing::new([0u8; 32]);
    rand::thread_rng().fill_bytes(&mut key[..]);
    hex::encode(key.as_slice())
}

pub fn encrypt_module_key_with_key(module_key: &str, key: &[u8; 32]) -> Result<String, String> {
    let decoded_module_key = Zeroizing::new(hex::decode(module_key).map_err(|_| "Invalid module key")?);
    if decoded_module_key.len() != 32 {
        return Err("Module key must be 32 bytes".into());
    }
    let cipher = Aes256Gcm16::new(key.into());

    let mut iv = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut iv);

    let nonce = aes_gcm::Nonce::<U16>::from_slice(&iv);

    let ciphertext_with_tag = cipher
        .encrypt(nonce, module_key.as_bytes())
        .map_err(|e| format!("Encryption failed: {:?}", e))?;

    let tag_start = ciphertext_with_tag.len() - 16;
    let ciphertext = &ciphertext_with_tag[..tag_start];
    let tag = &ciphertext_with_tag[tag_start..];

    let encrypted_hex = hex::encode(ciphertext);
    let auth_tag_hex = hex::encode(tag);
    let iv_hex = hex::encode(iv);

    Ok(format!("{}:{}:{}", iv_hex, auth_tag_hex, encrypted_hex))
}

pub fn encrypt_module_key(module_key: &str, password: &str) -> Result<String, String> {
    let key = Zeroizing::new(derive_key_from_password(password));
    encrypt_module_key_with_key(module_key, &key)
}

pub fn decrypt_module_key(encrypted_payload: &str, password: &str) -> Result<String, String> {
    let key = Zeroizing::new(derive_key_from_password(password));
    decrypt_module_key_with_key(encrypted_payload, &key)
}

pub fn decrypt_module_key_with_key(
    encrypted_payload: &str,
    key: &[u8; 32],
) -> Result<String, String> {
    let parts: Vec<&str> = encrypted_payload.split(':').collect();
    if parts.len() != 3 {
        return Err("Invalid payload".into());
    }

    let iv_hex = parts[0];
    let auth_tag_hex = parts[1];
    let encrypted_hex = parts[2];

    let cipher = Aes256Gcm16::new(key.into());

    let nonce_bytes = hex::decode(iv_hex).map_err(|_| "Invalid IV")?;
    let auth_tag_bytes = hex::decode(auth_tag_hex).map_err(|_| "Invalid Auth Tag")?;
    let encrypted_bytes = hex::decode(encrypted_hex).map_err(|_| "Invalid Ciphertext")?;
    if nonce_bytes.len() != 16 || auth_tag_bytes.len() != 16 {
        return Err("Invalid module-key nonce or authentication-tag length".into());
    }

    let nonce = aes_gcm::Nonce::<U16>::from_slice(&nonce_bytes);

    let mut ciphertext_with_tag = encrypted_bytes.clone();
    ciphertext_with_tag.extend_from_slice(&auth_tag_bytes);

    let mut decrypted = cipher
        .decrypt(nonce, ciphertext_with_tag.as_ref())
        .map_err(|e| format!("Decryption failed: {:?}", e))?;
    let result = match std::str::from_utf8(&decrypted) {
        Ok(module_key) => match hex::decode(module_key) {
            Ok(mut decoded_key) => {
                let valid_length = decoded_key.len() == 32;
                decoded_key.zeroize();
                if valid_length {
                    Ok(module_key.to_owned())
                } else {
                    Err("Module key must be 32 bytes".to_string())
                }
            }
            Err(_) => Err("Invalid module key".to_string()),
        },
        Err(_) => Err("Invalid UTF-8".to_string()),
    };
    decrypted.zeroize();
    result
}

pub fn encrypt_content(key_hex: &str, plaintext: &str) -> Result<String, String> {
    let key_bytes = Zeroizing::new(hex::decode(key_hex).map_err(|_| "Invalid Key Hex")?);
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".into());
    }

    let cipher = Aes256Gcm::new(aes_gcm::aead::Key::<Aes256Gcm>::from_slice(&key_bytes));

    let mut iv = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut iv);
    let nonce = aes_gcm::Nonce::from_slice(&iv);

    let ciphertext_with_tag = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {:?}", e))?;

    let tag_start = ciphertext_with_tag.len() - 16;
    let ciphertext = &ciphertext_with_tag[..tag_start];
    let tag = &ciphertext_with_tag[tag_start..];

    let encrypted_hex = hex::encode(ciphertext);
    let auth_tag_hex = hex::encode(tag);
    let iv_hex = hex::encode(iv);

    Ok(format!("{}:{}:{}", iv_hex, auth_tag_hex, encrypted_hex))
}

pub fn decrypt_content(key_hex: &str, encrypted_payload: &str) -> Result<String, String> {
    let parts: Vec<&str> = encrypted_payload.split(':').collect();
    if parts.len() != 3 {
        return Err("Invalid payload".into());
    }

    let iv_hex = parts[0];
    let auth_tag_hex = parts[1];
    let encrypted_hex = parts[2];

    let key_bytes = Zeroizing::new(hex::decode(key_hex).map_err(|_| "Invalid Key Hex")?);
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".into());
    }

    let nonce_bytes = hex::decode(iv_hex).map_err(|_| "Invalid IV")?;
    let auth_tag_bytes = hex::decode(auth_tag_hex).map_err(|_| "Invalid Auth Tag")?;
    let encrypted_bytes = hex::decode(encrypted_hex).map_err(|_| "Invalid Ciphertext")?;
    if auth_tag_bytes.len() != 16 {
        return Err("Invalid authentication-tag length".into());
    }

    let mut ciphertext_with_tag = encrypted_bytes.clone();
    ciphertext_with_tag.extend_from_slice(&auth_tag_bytes);

    if nonce_bytes.len() == 12 {
        let cipher = Aes256Gcm::new(aes_gcm::aead::Key::<Aes256Gcm>::from_slice(&key_bytes));
        let nonce = aes_gcm::Nonce::from_slice(&nonce_bytes);
        let mut decrypted_bytes = cipher
            .decrypt(nonce, ciphertext_with_tag.as_ref())
            .map_err(|e| format!("Decryption failed: {:?}", e))?;
        let result = std::str::from_utf8(&decrypted_bytes)
            .map(str::to_owned)
            .map_err(|_| "Invalid UTF-8".to_string());
        decrypted_bytes.zeroize();
        return result;
    } else if nonce_bytes.len() == 16 {
        let cipher = Aes256Gcm16::new(aes_gcm::aead::Key::<Aes256Gcm16>::from_slice(&key_bytes));
        let nonce = aes_gcm::Nonce::<U16>::from_slice(&nonce_bytes);
        let mut decrypted_bytes = cipher
            .decrypt(nonce, ciphertext_with_tag.as_ref())
            .map_err(|e| format!("Decryption failed: {:?}", e))?;
        let result = std::str::from_utf8(&decrypted_bytes)
            .map(str::to_owned)
            .map_err(|_| "Invalid UTF-8".to_string());
        decrypted_bytes.zeroize();
        return result;
    }

    Err("Invalid IV length".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_key_from_password_deterministic() {
        let key1 = derive_key_from_password("mypassword123");
        let key2 = derive_key_from_password("mypassword123");
        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);

        let key3 = derive_key_from_password("different_password");
        assert_ne!(key1, key3);
    }

    #[test]
    fn test_module_key_generation_and_encryption_roundtrip() {
        let master_key = derive_key_from_password("master_password_vault");
        let module_key = generate_module_key();
        assert_eq!(module_key.len(), 64);

        let encrypted = encrypt_module_key_with_key(&module_key, &master_key)
            .expect("Failed to encrypt module key");
        let decrypted = decrypt_module_key_with_key(&encrypted, &master_key)
            .expect("Failed to decrypt module key");
        assert_eq!(module_key, decrypted);
    }

    #[test]
    fn test_content_encryption_roundtrip() {
        let key_hex = generate_module_key();
        let message = "Nota Secreta: 🔑 Caderno E2EE 2026 com emojis e acentuação: áéíóú çãõ";

        let encrypted = encrypt_content(&key_hex, message).expect("Encryption failed");
        let decrypted = decrypt_content(&key_hex, &encrypted).expect("Decryption failed");
        assert_eq!(message, decrypted);
    }

    #[test]
    fn malformed_payload_lengths_return_errors_without_panicking() {
        let key_hex = generate_module_key();
        let master_key = derive_key_from_password("master_password_vault");

        assert!(decrypt_content(&key_hex, "00:00:").is_err());
        assert!(decrypt_content(&key_hex, "000000000000000000000000:00:").is_err());
        assert!(decrypt_module_key_with_key("00:00:", &master_key).is_err());
        assert!(encrypt_module_key_with_key("not-hex", &master_key).is_err());
    }

    #[test]
    fn identical_plaintext_uses_fresh_nonces() {
        let key_hex = generate_module_key();
        let first = encrypt_content(&key_hex, "same secret").unwrap();
        let second = encrypt_content(&key_hex, "same secret").unwrap();
        assert_ne!(first, second);
        assert_eq!(decrypt_content(&key_hex, &first).unwrap(), "same secret");
        assert_eq!(decrypt_content(&key_hex, &second).unwrap(), "same secret");
    }

    #[test]
    fn versioned_password_verifier_is_pbkdf2_costed_and_distinct_from_legacy() {
        let password = "master password for verifier";
        let verifier = hash_auth_password_v2(password);
        assert!(verifier.starts_with("v2:"));
        assert_eq!(verifier, hash_auth_password_v2(password));
        assert_ne!(verifier, hash_auth_password(password));
        assert_ne!(verifier, hash_auth_password_v2("another password"));
    }
}
