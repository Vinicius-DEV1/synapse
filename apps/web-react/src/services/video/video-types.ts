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
  youtubeInfo?: {
    title?: string;
    duration?: number;
    description?: string;
    uploader?: string;
    thumbnail?: string;
    entries?: unknown[];
  } | null; 
  collectionId?: string;
  collectionName?: string;
  selectedSubs?: string[];
  onProgress?: (percent: number) => void;
}

export interface DesktopVideoApi {
  convertFileSrc?: (path: string) => string;
  downloadFromDrive?: (driveId: string, accessToken: string, destFilename: string) => Promise<string>;
  generateWebVersion?: (
    sourcePath: string,
    destFilename: string,
    webQuality: string,
    conversionPreset: string,
    duration: number
  ) => Promise<{ web_path: string; web_size: number }>;
  cancelConversion?: () => Promise<void>;
  onDownloadProgress?: (callback: (percent: number) => void) => () => void;
  getLocalPath: (filename: string) => Promise<string | null>;
  getStorageStats?: (filename: string, audioTracks?: string[], subtitleTracks?: string[]) => Promise<{
    original_path: string | null;
    original_size: number | null;
    web_path: string | null;
    web_size: number | null;
    audio_sizes: Record<string, number>;
    subtitle_sizes: Record<string, number>;
    total_local_size: number;
  }>;
  showInFolder?: (path: string) => Promise<boolean>;
  readLocalFile?: (path: string) => Promise<Uint8Array>;
  uploadFileToDrive?: (localPath: string, driveFilename: string, folderId: string, accessToken: string) => Promise<unknown>;
  deleteLocal: (filename: string) => Promise<unknown>;
  scanTracks?: (localPath: string) => Promise<{
    error?: string;
    streams?: Array<{
      index?: number | string;
      codec_type: string;
      codec_name?: string;
      codec_tag_string?: string;
      duration?: string | number;
      disposition?: { forced?: number; default?: number; [key: string]: number | undefined };
      tags?: { language?: string; LANGUAGE?: string; title?: string; TITLE?: string; [key: string]: string | undefined };
    }>;
    format?: { duration?: string | number };
  }>;
  extractSubtitles: (localPath: string, trackIndex?: string) => Promise<string | null>;
  extractAudio?: (localPath: string, trackIndex: string) => Promise<string>;
  remuxDefaultTrack?: (sourcePath: string, filename: string, trackIndex: string) => Promise<unknown>;
  convertToMp4?: (sourcePath: string, filename: string) => Promise<unknown>;
  getStreamPort?: () => Promise<number>;
  saveLocal: (filename: string, buffer: ArrayBuffer) => Promise<string>;
  copyLocal: (sourcePath: string, filename: string) => Promise<string>;
  processUpload?: (
    sourcePath: string,
    filename: string,
    webQuality: string,
    conversionPreset: string,
    duration?: number,
    primaryAudioTrack?: string
  ) => Promise<{
    original_path: string;
    web_path: string | null;
    original_size?: number;
    web_size?: number;
  }>;
  openFileDialog?: () => Promise<{ path: string; name: string; type: string } | null>;
  openFolderDialog?: () => Promise<string | null>;
}

export { type VideoItem, type TrackItem };

