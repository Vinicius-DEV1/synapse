use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct TrashItem {
    pub id: String,
    pub title: String,
    pub item_type: String,
    pub deleted_at: String,
}
