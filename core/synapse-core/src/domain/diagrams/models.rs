//! Whiteboard diagrams domain models.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct DiagramMeta {
    pub id: String,
    pub title: String,
    pub icon: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct DiagramRecord {
    pub id: String,
    pub title: String,
    pub icon: String,
    pub content: String,
    pub encrypted_content: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}
