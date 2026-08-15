import type { UploadOptions } from '../../components/video-player/VideoUploadModal';
import type { VideoItem, TrackItem } from '../../types';

export interface UploadStats {
  originalSize?: number;
  webSize?: number;
  durationMs: number;
  webQuality: string;
}

export interface YouTubeDownloadOptions {
  url: string;
  quality: string;
  filename: string;
  youtubeInfo?: any; 
  collectionId?: string;
  collectionName?: string;
  selectedSubs?: string[];
  onProgress?: (percent: number) => void;
}

export { type UploadOptions, type VideoItem, type TrackItem };
