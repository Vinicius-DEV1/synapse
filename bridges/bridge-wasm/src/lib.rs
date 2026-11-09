use serde::{Deserialize, Serialize};
use synapse_core::crypto;
use synapse_core::fsrs::{Card, FsrsEngine, Rating, State};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct WasmFsrsResult {
    pub stability: f64,
    pub difficulty: f64,
    pub scheduled_days: i32,
    pub retrievability: f64,
    pub state: u8,
}

#[wasm_bindgen]
pub fn wasm_fsrs_calculate(
    stability: f64,
    difficulty: f64,
    state: u8,
    rating: u8,
    elapsed_days: i32,
) -> Result<JsValue, JsValue> {
    let card_state = match state {
        1 => State::Learning,
        2 => State::Review,
        3 => State::Relearning,
        _ => State::New,
    };
    let rating_enum = match rating {
        1 => Rating::Again,
        2 => Rating::Hard,
        3 => Rating::Good,
        4 => Rating::Easy,
        _ => Rating::Good,
    };

    let engine = FsrsEngine::new(None);
    let card = Card {
        stability,
        difficulty,
        elapsed_days,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: card_state,
        due: chrono::Utc::now(),
        last_review: None,
    };

    let updated = engine.review(&card, rating_enum, chrono::Utc::now());
    let r = engine.retrievability(elapsed_days as f64, updated.stability);

    let state_val = match updated.state {
        State::New => 0,
        State::Learning => 1,
        State::Review => 2,
        State::Relearning => 3,
    };

    let result = WasmFsrsResult {
        stability: updated.stability,
        difficulty: updated.difficulty,
        scheduled_days: updated.scheduled_days,
        retrievability: r,
        state: state_val,
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn wasm_fsrs_retrievability(elapsed_days: f64, stability: f64) -> f64 {
    let engine = FsrsEngine::new(None);
    engine.retrievability(elapsed_days, stability)
}

#[wasm_bindgen]
pub fn wasm_fsrs_next_interval(stability: f64) -> i32 {
    let engine = FsrsEngine::new(None);
    engine.next_interval(stability)
}

#[wasm_bindgen]
pub fn wasm_derive_master_key(password: &str) -> String {
    let key = crypto::derive_key_from_password(password);
    hex::encode(key)
}

#[wasm_bindgen]
pub fn wasm_hash_auth_password(password: &str) -> String {
    crypto::hash_auth_password(password)
}

#[wasm_bindgen]
pub fn wasm_encrypt_module_key(module_key: &str, password: &str) -> Result<String, JsValue> {
    crypto::encrypt_module_key(module_key, password).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn wasm_decrypt_module_key(encrypted_payload: &str, password: &str) -> Result<String, JsValue> {
    crypto::decrypt_module_key(encrypted_payload, password).map_err(|e| JsValue::from_str(&e))
}

