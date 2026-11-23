use super::models::{CultureEpisodeRecord, CultureItemRecord};
use synapse_core::domain::culture::{CultureEpisode, CultureItem};

impl From<CultureItem> for CultureItemRecord {
    fn from(value: CultureItem) -> Self {
        Self {
            id: value.id,
            title: value.title,
            item_type: value.item_type,
            synopsis: value.synopsis,
            cover_image: value.cover_image,
            access_link: value.access_link,
            progress: value.progress,
            total_progress: value.total_progress,
            total_episodes: value.total_episodes,
            is_goal: value.is_goal,
            goal_note: value.goal_note,
            api_id: value.api_id,
            api_source: value.api_source,
            status: value.status,
            last_sync_at: value.last_sync_at,
            volumes: value.volumes,
            chapters: value.chapters,
            episodes_count: value.episodes_count,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }
}

impl From<CultureItemRecord> for CultureItem {
    fn from(value: CultureItemRecord) -> Self {
        Self {
            id: value.id,
            title: value.title,
            item_type: value.item_type,
            synopsis: value.synopsis,
            cover_image: value.cover_image,
            access_link: value.access_link,
            progress: value.progress,
            total_progress: value.total_progress,
            total_episodes: value.total_episodes,
            is_goal: value.is_goal,
            goal_note: value.goal_note,
            api_id: value.api_id,
            api_source: value.api_source,
            status: value.status,
            last_sync_at: value.last_sync_at,
            volumes: value.volumes,
            chapters: value.chapters,
            episodes_count: value.episodes_count,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }
}

impl From<CultureEpisode> for CultureEpisodeRecord {
    fn from(value: CultureEpisode) -> Self {
        Self {
            id: value.id,
            item_id: value.item_id,
            episode_number: value.episode_number,
            season_number: value.season_number,
            episode_in_season: value.episode_in_season,
            title: value.title,
            synopsis: value.synopsis,
            is_watched: value.is_watched,
            watched_at: value.watched_at,
            aired_at: value.aired_at,
            updated_at: value.updated_at,
        }
    }
}
