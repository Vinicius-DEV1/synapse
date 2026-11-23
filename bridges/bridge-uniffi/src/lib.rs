use std::sync::Arc;
use synapse_core::crypto;
use synapse_core::fsrs::{Card, FsrsEngine, Rating, State};
use synapse_core::video::EncryptedVideoReader;

pub mod anki;
pub mod calendar;
pub mod culture;
pub mod diagrams;
mod errors;
pub mod files;
pub mod finance;
pub mod focus;
pub mod habits;
pub mod library;
pub mod notes;
pub mod notifications;
pub mod practice;
pub mod questions;
pub mod trash;
pub mod video;

uniffi::setup_scaffolding!();

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum SynapseError {
    #[error("Crypto error: {msg}")]
    CryptoError { msg: String },
    #[error("IO error: {msg}")]
    IoError { msg: String },
    #[error("Invalid input: {msg}")]
    InvalidInput { msg: String },
}

#[derive(uniffi::Record)]
pub struct SrsCardResult {
    pub stability: f64,
    pub difficulty: f64,
    pub scheduled_days: i32,
    pub retrievability: f64,
    pub state: u8,
}

#[derive(uniffi::Object)]
pub struct SynapseVideoReader {
    inner: EncryptedVideoReader,
}

#[uniffi::export]
impl SynapseVideoReader {
    #[uniffi::constructor]
    pub fn open(file_path: String, key_hex: String) -> Result<Arc<Self>, SynapseError> {
        let reader = EncryptedVideoReader::open(&file_path, &key_hex)
            .map_err(|e| SynapseError::IoError { msg: e })?;
        Ok(Arc::new(Self { inner: reader }))
    }

    pub fn size(&self) -> u64 {
        self.inner.size()
    }

    pub fn read_at(&self, offset: u64, length: u32) -> Result<Vec<u8>, SynapseError> {
        let mut buffer = vec![0u8; length as usize];
        let bytes_read = self
            .inner
            .read_at(offset, &mut buffer)
            .map_err(|e| SynapseError::IoError { msg: e })?;
        buffer.truncate(bytes_read);
        Ok(buffer)
    }
}

#[derive(uniffi::Object)]
pub struct SynapseFsrs {
    engine: FsrsEngine,
}

#[uniffi::export]
impl SynapseFsrs {
    #[uniffi::constructor]
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            engine: FsrsEngine::new(None),
        })
    }

    pub fn review(
        &self,
        stability: f64,
        difficulty: f64,
        state: u8,
        rating: u8,
        elapsed_days: i32,
    ) -> Result<SrsCardResult, SynapseError> {
        let card_state = match state {
            0 => State::New,
            1 => State::Learning,
            2 => State::Review,
            3 => State::Relearning,
            _ => {
                return Err(SynapseError::InvalidInput {
                    msg: format!("Unknown FSRS card state: {state}"),
                })
            }
        };
        let rating_enum = match rating {
            1 => Rating::Again,
            2 => Rating::Hard,
            3 => Rating::Good,
            4 => Rating::Easy,
            _ => {
                return Err(SynapseError::InvalidInput {
                    msg: format!("Unknown FSRS rating: {rating}"),
                })
            }
        };
        if elapsed_days < 0 {
            return Err(SynapseError::InvalidInput {
                msg: "Elapsed days must not be negative".to_string(),
            });
        }
        if !stability.is_finite() || !difficulty.is_finite() {
            return Err(SynapseError::InvalidInput {
                msg: "FSRS stability and difficulty must be finite numbers".to_string(),
            });
        }

        let card = Card {
            stability,
            difficulty,
            elapsed_days,
            scheduled_days: 0,
            learning_steps: 0,
            reps: 0,
            lapses: 0,
            state: card_state,
            due: chrono::Utc::now(),
            last_review: None,
        };

        let updated = self.engine.review(&card, rating_enum, chrono::Utc::now());
        let r = self
            .engine
            .retrievability(elapsed_days as f64, updated.stability);

        let state_val = match updated.state {
            State::New => 0,
            State::Learning => 1,
            State::Review => 2,
            State::Relearning => 3,
        };

        Ok(SrsCardResult {
            stability: updated.stability,
            difficulty: updated.difficulty,
            scheduled_days: updated.scheduled_days,
            retrievability: r,
            state: state_val,
        })
    }

    pub fn retrievability(&self, elapsed_days: f64, stability: f64) -> f64 {
        self.engine.retrievability(elapsed_days, stability)
    }

    pub fn next_interval(&self, stability: f64) -> i32 {
        self.engine.next_interval(stability)
    }
}

#[uniffi::export]
pub fn derive_master_key(password: String) -> String {
    let key = crypto::derive_key_from_password(&password);
    hex::encode(key)
}

#[uniffi::export]
pub fn hash_auth_password(password: String) -> String {
    crypto::hash_auth_password(&password)
}

#[uniffi::export]
pub fn encrypt_module_key(module_key: String, password: String) -> Result<String, SynapseError> {
    crypto::encrypt_module_key(&module_key, &password)
        .map_err(|e| SynapseError::CryptoError { msg: e })
}

#[uniffi::export]
pub fn decrypt_module_key(
    encrypted_payload: String,
    password: String,
) -> Result<String, SynapseError> {
    crypto::decrypt_module_key(&encrypted_payload, &password)
        .map_err(|e| SynapseError::CryptoError { msg: e })
}

#[cfg(test)]
mod tests;
