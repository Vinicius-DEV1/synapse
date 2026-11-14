use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct FileFolder {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub color: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct FileRecord {
    pub id: String,
    pub name: String,
    pub file_type: String,
    pub file_size: i64,
    pub local_path: Option<String>,
    pub drive_file_id: Option<String>,
    pub has_drive_copy: i32,
    pub folder_id: Option<String>,
    pub mime_type: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct FilePageLink {
    pub file_id: String,
    pub page_id: String,
    pub created_at: Option<String>,
}
