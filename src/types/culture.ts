export type CultureType = 'anime' | 'filme' | 'série' | 'hq' | 'manga' | 'livro' | 'novel';

export interface CultureItem {
  id: string;
  title: string;
  type: CultureType;
  synopsis?: string;
  cover_image?: string;
  access_link?: string;
  progress: number;
  total_progress: number;
  is_goal: boolean | number;
  goal_note?: string;
  api_id?: string;
  api_source?: 'jikan' | 'itunes' | 'tvmaze' | 'books' | 'imdb' | 'anilist' | 'kitsu' | 'openlibrary';
  status?: string; // 'releasing', 'finished', etc.
  last_sync_at?: string;
  // Campos extras de metadados da API
  volumes?: number | null;
  chapters?: number | null;
  episodes_count?: number | null;
  trailer_url?: string;
  trailer_yt_id?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CultureEpisode {
  id: string;
  item_id: string;
  episode_number: number;
  season_number?: number;
  episode_in_season?: number;
  title: string;
  synopsis: string;
  is_watched: boolean | number;
  aired_at?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type EnrichedEpisode = CultureEpisode & {
  item_title: string;
  item_cover: string;
};
