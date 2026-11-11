use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
pub struct BackupOptions {
    pub destination: String,
    #[serde(rename = "type")]
    pub backup_type: String, // "encrypted" | "decrypted"
    #[serde(rename = "includeMedia")]
    pub include_media: bool,
    #[serde(rename = "driveToken")]
    pub drive_token: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BackupLogPayload {
    pub message: String,
    pub progress: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BackupResult {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct BackupManifest {
    pub version: u32,
    pub created_at: String,
    pub backup_type: String,
    pub include_media: bool,
    pub include_drive: bool,
    pub stats: BackupStats,
}

#[derive(Debug, Clone, Serialize)]
pub struct BackupStats {
    pub db_size_bytes: u64,
    pub pages_count: i64,
    pub videos_copied: u32,
    pub files_copied: u32,
    pub audio_copied: u32,
    pub drive_downloaded: u32,
    pub errors: u32,
    pub total_size_bytes: u64,
}
