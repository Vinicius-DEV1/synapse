use std::sync::Arc;
use synapse_core::crypto;
use synapse_core::db::Database;
use synapse_core::fsrs::{Card, FsrsEngine, Rating, State};
use synapse_core::video::EncryptedVideoReader;

uniffi::setup_scaffolding!();

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum SynapseError {
    #[error("Database error: {msg}")]
    DatabaseError { msg: String },
    #[error("Crypto error: {msg}")]
    CryptoError { msg: String },
    #[error("IO error: {msg}")]
    IoError { msg: String },
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
pub struct SynapseDatabase {
    inner: Database,
}

#[uniffi::export]
impl SynapseDatabase {
    #[uniffi::constructor]
    pub fn open(path: String) -> Result<Arc<Self>, SynapseError> {
        let db = Database::open(&path).map_err(|e| SynapseError::DatabaseError { msg: e })?;
        Ok(Arc::new(Self { inner: db }))
    }

    pub fn execute(&self, sql: String) -> Result<u64, SynapseError> {
        let conn = self
            .inner
            .lock()
            .map_err(|e| SynapseError::DatabaseError { msg: e })?;
        let rows = conn
            .execute(&sql, [])
            .map_err(|e| SynapseError::DatabaseError {
                msg: e.to_string(),
            })?;
        Ok(rows as u64)
    }

    pub fn query_single_string(&self, sql: String) -> Result<String, SynapseError> {
        let conn = self
            .inner
            .lock()
            .map_err(|e| SynapseError::DatabaseError { msg: e })?;
        let res: String = conn
            .query_row(&sql, [], |r| r.get(0))
            .map_err(|e| SynapseError::DatabaseError {
                msg: e.to_string(),
            })?;
        Ok(res)
    }

    pub fn table_exists(&self, table_name: String) -> Result<bool, SynapseError> {
        let conn = self
            .inner
            .lock()
            .map_err(|e| SynapseError::DatabaseError { msg: e })?;
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
                [&table_name],
                |r| r.get(0),
            )
            .map_err(|e| SynapseError::DatabaseError {
                msg: e.to_string(),
            })?;
        Ok(count > 0)
    }
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
    ) -> SrsCardResult {
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

        SrsCardResult {
            stability: updated.stability,
            difficulty: updated.difficulty,
            scheduled_days: updated.scheduled_days,
            retrievability: r,
            state: state_val,
        }
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
    crypto::encrypt_module_key(&module_key, &password).map_err(|e| SynapseError::CryptoError { msg: e })
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
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_uniffi_database_lifecycle() {
        let temp_file = NamedTempFile::new().unwrap();
        let db_path = temp_file.path().to_str().unwrap().to_string();

        let db = SynapseDatabase::open(db_path).expect("Failed to open db via uniffi");
        assert!(db.table_exists("pages".to_string()).unwrap());
        assert!(db.table_exists("keychain".to_string()).unwrap());
        assert!(db.table_exists("habits".to_string()).unwrap());

        let res = db
            .query_single_string("PRAGMA journal_mode".to_string())
            .unwrap();
        assert_eq!(res.to_lowercase(), "wal");
    }

    #[test]
    fn test_uniffi_fsrs_and_crypto() {
        let fsrs = SynapseFsrs::new();
        let result = fsrs.review(0.0, 0.0, 0, 3, 0); // Rating 3 = Good on New card
        assert!(result.stability > 0.0);
        assert!(result.scheduled_days > 0);

        let pass = "minha_senha_super_secreta_123".to_string();
        let master_key_hex = derive_master_key(pass.clone());
        assert_eq!(master_key_hex.len(), 64);

        let mod_key = "a1b2c3d4e5f60718293a4b5c6d7e8f90".to_string();
        let enc = encrypt_module_key(mod_key.clone(), pass.clone()).unwrap();
        let dec = decrypt_module_key(enc, pass).unwrap();
        assert_eq!(dec, mod_key);
    }
}
