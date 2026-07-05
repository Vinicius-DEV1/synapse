// ============ VIDEO PLAYER TYPES ============

export interface TrackItem {
  id: string; // FFmpeg map index, e.g., '0:s:0' or '0:a:1'
  label: string; // e.g., 'Portuguese', 'English'
  drive_id?: string; // Google Drive file ID if synced
  local_path?: string; // Local extracted file path
}

export interface VideoItem {
  id: string;
  title: string;
  original_name: string;
  duration?: number;
  file_path?: string;          // Local path if downloaded
  drive_file_id?: string;      // Google Drive file ID
  drive_subtitle_id?: string;  // Google Drive subtitle file ID (Legacy/Default)
  local_subtitle_path?: string;// Local subtitle path (Legacy/Default)
  subtitles_json?: string;     // Serialized TrackItem[]
  audio_tracks_json?: string;  // Serialized TrackItem[]
  is_local: boolean;
  progress: number;            // Current playback progress in seconds
  collection_id?: string;      // Used for grouping playlist videos
  collection_name?: string;    // Name of the playlist folder
  youtube_url?: string;        // Original YouTube URL
  youtube_description?: string;// YouTube video description
  created_at: string;
  updated_at: string;
}

export interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isFullscreen: boolean;
}
