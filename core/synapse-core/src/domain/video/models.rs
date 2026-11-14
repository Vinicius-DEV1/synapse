//! Domain models for videos, collections/folders, and vocabulary.

use serde::{Deserialize, Serialize};

/// Represents a video item in the catalog.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoRecord {
    pub id: String,
    pub title: String,
    pub original_name: String,
    pub duration: Option<f64>,
    pub file_path: Option<String>,
    pub progress: Option<f64>,
    pub is_local: Option<i32>,
    pub collection_id: Option<String>,
    pub collection_name: Option<String>,
    pub drive_file_id: Option<String>,
    pub drive_web_file_id: Option<String>,
    pub drive_subtitle_id: Option<String>,
    pub local_subtitle_path: Option<String>,
    pub subtitles_json: Option<String>,
    pub audio_tracks_json: Option<String>,
    pub youtube_url: Option<String>,
    pub youtube_description: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

/// Represents a configured video folder or collection.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VideoFolder {
    pub id: String,
    pub name: String,
}

/// Represents a vocabulary word saved during video study.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoWord {
    pub id: String,
    pub video_id: String,
    pub word: String,
    pub context: Option<String>,
    pub timestamp: f64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}
