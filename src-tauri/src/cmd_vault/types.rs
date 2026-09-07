use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct VaultGroup {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub position: i32,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct VaultItem {
    pub id: String,
    pub group_id: String,
    pub label: String,
    pub username: Option<String>,
    pub email: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub custom_fields: Option<String>,
    pub is_favorite: i32,
    pub password_changed_at: Option<String>,
    pub password_strength: i32,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct VaultPasswordHistoryEntry {
    pub id: String,
    pub item_id: String,
    pub password: String,
    pub changed_at: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(default)]
pub struct GroupOrderUpdate {
    pub id: String,
    pub position: i32,
}

pub use crate::vault_security::PasswordGenOptions;
