use aes_gcm::{
    aead::{consts::U16, Aead, KeyInit},
    aes::Aes256,
    AesGcm, Aes256Gcm,
};
use hex;
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use sha2::Sha256;

// Type alias for AES-256-GCM with 16-byte nonce (used by the Node.js legacy code)
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
    hasher.update(format!("{}caderno-auth-hash", password));
    hex::encode(hasher.finalize())
}

pub fn generate_module_key() -> String {
    let mut key = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key);
    hex::encode(key)
}

pub fn encrypt_module_key_with_key(module_key: &str, key: &[u8; 32]) -> Result<String, String> {
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

#[allow(dead_code)]
pub fn encrypt_module_key(module_key: &str, password: &str) -> Result<String, String> {
    let key = derive_key_from_password(password);
    encrypt_module_key_with_key(module_key, &key)
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

    let nonce = aes_gcm::Nonce::<U16>::from_slice(&nonce_bytes);

    let mut ciphertext_with_tag = encrypted_bytes.clone();
    ciphertext_with_tag.extend_from_slice(&auth_tag_bytes);

    let decrypted = cipher
        .decrypt(nonce, ciphertext_with_tag.as_ref())
        .map_err(|e| format!("Decryption failed: {:?}", e))?;

    String::from_utf8(decrypted).map_err(|_| "Invalid UTF-8".into())
}



pub fn encrypt_content(key_hex: &str, plaintext: &str) -> Result<String, String> {
    let key_bytes = hex::decode(key_hex).map_err(|_| "Invalid Key Hex")?;
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

    let key_bytes = hex::decode(key_hex).map_err(|_| "Invalid Key Hex")?;
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes".into());
    }

    let nonce_bytes = hex::decode(iv_hex).map_err(|_| "Invalid IV")?;
    let auth_tag_bytes = hex::decode(auth_tag_hex).map_err(|_| "Invalid Auth Tag")?;
    let encrypted_bytes = hex::decode(encrypted_hex).map_err(|_| "Invalid Ciphertext")?;

    let mut ciphertext_with_tag = encrypted_bytes.clone();
    ciphertext_with_tag.extend_from_slice(&auth_tag_bytes);

    if nonce_bytes.len() == 12 {
        let cipher = Aes256Gcm::new(aes_gcm::aead::Key::<Aes256Gcm>::from_slice(&key_bytes));
        let nonce = aes_gcm::Nonce::from_slice(&nonce_bytes);
        let decrypted_bytes = cipher
            .decrypt(nonce, ciphertext_with_tag.as_ref())
            .map_err(|e| format!("Decryption failed: {:?}", e))?;
        return String::from_utf8(decrypted_bytes).map_err(|_| "Invalid UTF-8".into());
    } else if nonce_bytes.len() == 16 {
        let cipher = Aes256Gcm16::new(aes_gcm::aead::Key::<Aes256Gcm16>::from_slice(&key_bytes));
        let nonce = aes_gcm::Nonce::<U16>::from_slice(&nonce_bytes);
        let decrypted_bytes = cipher
            .decrypt(nonce, ciphertext_with_tag.as_ref())
            .map_err(|e| format!("Decryption failed: {:?}", e))?;
        return String::from_utf8(decrypted_bytes).map_err(|_| "Invalid UTF-8".into());
    }

    Err("Invalid IV length".into())
}
