use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};

#[derive(Serialize, Deserialize)]
pub struct BreachCheckResult {
    pub breached: bool,
    pub count: u64,
}

#[derive(Serialize, Deserialize)]
pub struct PasswordGenOptions {
    pub length: u32,
    pub uppercase: bool,
    pub lowercase: bool,
    pub numbers: bool,
    pub symbols: bool,
}

#[tauri::command]
pub async fn vault_check_breach(password: String) -> Result<BreachCheckResult, String> {
    let mut hasher = Sha1::new();
    hasher.update(password.as_bytes());
    let hash_result = hasher.finalize();
    let hash_hex = format!("{:X}", hash_result);

    if hash_hex.len() < 5 {
        return Err("Erro ao gerar hash SHA-1".into());
    }

    let prefix = &hash_hex[..5];
    let suffix = &hash_hex[5..];

    let url = format!("https://api.pwnedpasswords.com/range/{}", prefix);

    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;

    let text = response.text().await.map_err(|e| e.to_string())?;

    let mut count = 0;
    for line in text.lines() {
        if let Some((hash_suffix, count_str)) = line.split_once(':') {
            if hash_suffix == suffix {
                count = count_str.trim().parse::<u64>().unwrap_or(0);
                break;
            }
        }
    }

    Ok(BreachCheckResult {
        breached: count > 0,
        count,
    })
}

#[tauri::command]
pub fn vault_check_strength(password: String) -> Result<i32, String> {
    let len = password.len();
    let has_upper = password.chars().any(|c| c.is_uppercase());
    let has_lower = password.chars().any(|c| c.is_lowercase());
    let has_num = password.chars().any(|c| c.is_numeric());
    let has_sym = password.chars().any(|c| !c.is_alphanumeric());

    let mut score = 0;
    if len > 8 {
        score += 1;
    }
    if len >= 12 {
        score += 1;
    }
    if has_upper && has_lower {
        score += 1;
    }
    if has_num && has_sym {
        score += 1;
    }

    if len >= 16 && (has_upper || has_lower) && (has_num || has_sym) {
        score = std::cmp::max(score, 4);
    }

    // Limit score to 4
    if score > 4 {
        score = 4;
    }

    // Penalties
    if password.to_lowercase() == "password"
        || password == "123456"
        || password == "12345678"
        || password.to_lowercase() == "admin"
    {
        score = 0;
    }

    Ok(score)
}
