#[derive(uniffi::Record, Clone)]
pub struct VideoCatalogRecord {
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

#[derive(uniffi::Record, Clone)]
pub struct VideoFolderRecord {
    pub id: String,
    pub name: String,
}
