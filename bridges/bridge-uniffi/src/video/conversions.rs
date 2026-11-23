use super::models::{VideoCatalogRecord, VideoFolderRecord};
use synapse_core::domain::video::{VideoFolder, VideoRecord};

impl From<VideoRecord> for VideoCatalogRecord {
    fn from(value: VideoRecord) -> Self {
        Self {
            id: value.id,
            title: value.title,
            original_name: value.original_name,
            duration: value.duration,
            file_path: value.file_path,
            progress: value.progress,
            is_local: value.is_local,
            collection_id: value.collection_id,
            collection_name: value.collection_name,
            drive_file_id: value.drive_file_id,
            drive_web_file_id: value.drive_web_file_id,
            drive_subtitle_id: value.drive_subtitle_id,
            local_subtitle_path: value.local_subtitle_path,
            subtitles_json: value.subtitles_json,
            audio_tracks_json: value.audio_tracks_json,
            youtube_url: value.youtube_url,
            youtube_description: value.youtube_description,
            created_at: value.created_at,
            updated_at: value.updated_at,
            deleted_at: value.deleted_at,
        }
    }
}

impl From<VideoFolder> for VideoFolderRecord {
    fn from(value: VideoFolder) -> Self {
        Self {
            id: value.id,
            name: value.name,
        }
    }
}
