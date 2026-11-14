use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SynapseError {
    Database(String),
    NotFound(String),
    Validation(String),
    Crypto(String),
    Internal(String),
}

impl fmt::Display for SynapseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(msg) => write!(f, "Database error: {}", msg),
            Self::NotFound(msg) => write!(f, "Not found: {}", msg),
            Self::Validation(msg) => write!(f, "Validation error: {}", msg),
            Self::Crypto(msg) => write!(f, "Crypto error: {}", msg),
            Self::Internal(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl std::error::Error for SynapseError {}

#[cfg(feature = "db")]
impl From<rusqlite::Error> for SynapseError {
    fn from(err: rusqlite::Error) -> Self {
        Self::Database(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, SynapseError>;
