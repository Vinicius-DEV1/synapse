//! Domain models for notes, pages, hierarchy, history revisions, and web link metadata.

use serde::{Deserialize, Serialize};

/// Represents a page or note in the notebook.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageRecord {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub content: String,
    pub icon: String,
    pub sort_order: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
    pub cover_image: Option<String>,
    pub description: Option<String>,
    pub password_salt: Option<String>,
    pub crdt_state: Option<String>,
    pub encrypted_content: Option<String>,
    pub is_pinned: i32,
    pub pinned_order: f64,
    pub is_locked: i32,
}

/// Lightweight page metadata record excluding heavy content, encrypted_content, and crdt_state blobs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageMetaRecord {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub icon: String,
    pub sort_order: f64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
    pub cover_image: Option<String>,
    pub description: Option<String>,
    pub is_pinned: i32,
    pub pinned_order: f64,
    pub is_locked: i32,
}

/// Enriched page node for hierarchical navigation trees.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageNode {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub icon: String,
    pub sort_order: i32,
    pub is_pinned: i32,
    pub pinned_order: f64,
    pub updated_at: Option<String>,
    pub depth: i32,
    pub has_children: bool,
    pub children_count: usize,
}

/// Represents a historical revision of a page.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageRevision {
    pub id: String,
    pub page_id: String,
    pub content: String,
    pub encrypted_content: Option<String>,
    pub created_at: Option<String>,
}

/// Cached metadata for external web links embedded in pages.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkMetadata {
    pub url: String,
    pub title: Option<String>,
    pub channel: Option<String>,
    pub duration: Option<f64>,
    #[serde(alias = "is_playlist")]
    pub is_playlist: Option<bool>,
    #[serde(alias = "playlist_count")]
    pub playlist_count: Option<i32>,
    #[serde(alias = "upload_date")]
    pub upload_date: Option<String>,
    #[serde(alias = "image_url")]
    pub image_url: Option<String>,
}
