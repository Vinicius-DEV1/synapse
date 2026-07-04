// ============ VIDEO PLAYER TYPES ============

export interface VideoItem {
  id: string;
  title: string;
  original_name: string;
  duration?: number;
  file_path?: string;          // Local path if downloaded
  drive_file_id?: string;      // Google Drive file ID
  drive_subtitle_id?: string;  // Google Drive subtitle file ID
  local_subtitle_path?: string;// Local subtitle path
  is_local: boolean;
  progress: number;            // Current playback progress in seconds
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
