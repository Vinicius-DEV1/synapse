import type { VideoItem, TrackItem } from '../../types';

export interface UploadOptions {
  videoFile: File;
  subtitleText: string | null;
  duration?: number;
  primaryAudioTrack?: string;
  extraAudioTracks?: string[];
  extraSubtitleTracks?: string[];
  masterKey?: CryptoKey;
  collectionId?: string;
  collectionName?: string;
  webQuality: 'original' | 'remux' | '1080p' | '720p' | '480p' | '360p';
  conversionPreset?: string;
  onProgress?: (percent: number) => void;
  onPhaseChange?: (phase: string) => void;
  signal?: AbortSignal;
}

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

export type DesktopVideoApi = NonNullable<typeof window.api.video> & {
  scanTracks?: (localPath: string) => Promise<{ streams?: Array<{ index: number | string; codec_type: string; tags?: { language?: string; title?: string } }> }>;
  onDownloadProgress?: (callback: (percent: number) => void) => () => void;
  getStreamPort?: () => Promise<number>;
  cancelConversion?: () => Promise<void>;
  generateWebVersion?: (
    sourcePath: string,
    destFilename: string,
    webQuality: string,
    conversionPreset: string,
    duration: number
  ) => Promise<{ web_path: string; web_size: number }>;
};

export { type VideoItem, type TrackItem };
