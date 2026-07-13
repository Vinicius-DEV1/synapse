use aes_gcm::{
    aead::{Aead, KeyInit, consts::U16},
    AesGcm, aes::Aes256
};
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;
use hex;
use rand::RngCore;

// Type alias for AES-256-GCM with 16-byte nonce (used by the Node.js legacy code)
type Aes256Gcm16 = AesGcm<Aes256, U16>;

pub fn derive_key_from_password(password: &str) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), b"caderno-keychain-salt", 600000, &mut key);
    key
}

pub fn hash_auth_password(password: &str) -> String {
    use sha2::Digest;
    let mut hasher = Sha256::new();
    hasher.update(format!("{}caderno-auth-hash", password));
    hex::encode(hasher.finalize())
}

pub fn encrypt_module_key(module_key: &str, password: &str) -> Result<String, String> {
    let key = derive_key_from_password(password);
    let cipher = Aes256Gcm16::new(&key.into());
    
    let mut iv = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut iv);
    
    let nonce = aes_gcm::Nonce::<U16>::from_slice(&iv);
    
    let ciphertext_with_tag = cipher.encrypt(nonce, module_key.as_bytes())
        .map_err(|e| format!("Encryption failed: {:?}", e))?;
        
    // Rust's aes-gcm appends the 16-byte tag to the end of the ciphertext
    let tag_start = ciphertext_with_tag.len() - 16;
    let ciphertext = &ciphertext_with_tag[..tag_start];
    let tag = &ciphertext_with_tag[tag_start..];
    
    let encrypted_hex = hex::encode(ciphertext);
    let auth_tag_hex = hex::encode(tag);
    let iv_hex = hex::encode(iv);
    
    Ok(format!("{}:{}:{}", iv_hex, auth_tag_hex, encrypted_hex))
}

pub fn decrypt_module_key(encrypted_payload: &str, password: &str) -> Result<String, String> {
    let parts: Vec<&str> = encrypted_payload.split(':').collect();
    if parts.len() != 3 { return Err("Invalid payload".into()); }
    
    let iv_hex = parts[0];
    let auth_tag_hex = parts[1];
    let encrypted_hex = parts[2];
    
    let key = derive_key_from_password(password);
    let cipher = Aes256Gcm16::new(&key.into());
    
    let nonce_bytes = hex::decode(iv_hex).map_err(|_| "Invalid IV")?;
    let auth_tag_bytes = hex::decode(auth_tag_hex).map_err(|_| "Invalid Auth Tag")?;
    let encrypted_bytes = hex::decode(encrypted_hex).map_err(|_| "Invalid Ciphertext")?;
    
    let nonce = aes_gcm::Nonce::<U16>::from_slice(&nonce_bytes);
    
    let mut ciphertext_with_tag = encrypted_bytes.clone();
    ciphertext_with_tag.extend_from_slice(&auth_tag_bytes);
    
    let decrypted_bytes = cipher.decrypt(nonce, ciphertext_with_tag.as_ref())
        .map_err(|e| format!("Decryption failed: {:?}", e))?;
        
    String::from_utf8(decrypted_bytes).map_err(|_| "Invalid UTF-8".into())
}
