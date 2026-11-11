use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessUploadResult {
    pub original_path: String,
    pub web_path: Option<String>,
    pub original_size: u64,
    pub web_size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateWebResult {
    pub web_path: String,
    pub web_size: u64,
}
