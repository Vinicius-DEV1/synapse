use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct VaultGroup {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub position: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct VaultItem {
    pub id: String,
    pub group_id: Option<String>,
    pub label: String,
    pub username: Option<String>,
    pub email: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub custom_fields: Option<String>,
    pub is_favorite: bool,
    pub login_type: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct VaultPasswordHistoryEntry {
    pub id: String,
    pub item_id: String,
    pub password: String,
    pub changed_at: String,
    pub deleted_at: Option<String>,
}
