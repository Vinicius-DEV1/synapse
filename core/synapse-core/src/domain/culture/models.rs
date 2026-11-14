use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct CultureItem {
    pub id: String,
    pub title: String,
    #[serde(rename = "type", alias = "item_type", default)]
    pub item_type: String,
    pub synopsis: Option<String>,
    pub cover_image: Option<String>,
    pub access_link: Option<String>,
    pub progress: i32,
    pub total_progress: i32,
    pub total_episodes: i32,
    pub is_goal: bool,
    pub goal_note: Option<String>,
    pub api_id: Option<String>,
    pub api_source: Option<String>,
    pub status: Option<String>,
    pub last_sync_at: Option<String>,
    pub volumes: Option<i32>,
    pub chapters: Option<i32>,
    pub episodes_count: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(default)]
pub struct CultureEpisode {
    pub id: String,
    pub item_id: String,
    pub episode_number: i32,
    pub season_number: Option<i32>,
    pub episode_in_season: Option<i32>,
    pub title: String,
    pub synopsis: Option<String>,
    pub is_watched: bool,
    pub watched_at: Option<String>,
    pub aired_at: Option<String>,
    pub updated_at: Option<String>,
}
