export interface LinkPreviewAttrs {
  url: string;
  title: string | null;
  channel: string | null;
  uploadDate: string | null;
  notes: string;
  duration: number | null;
  width: number;
  isLoading: boolean;
  isPlaylist: boolean;
  playlistCount?: number | null;
  showNotes: boolean;
  watched?: boolean;
  watching?: boolean;
  color?: string;
  scrapId?: string | null;
  scrapStatus?: 'idle' | 'capturing' | 'ready' | 'sync_pending' | 'error' | null;
  scrapLocalPath?: string | null;
  scrapDriveFileId?: string | null;
  scrapFileSize?: number | null;
  scrapCreatedAt?: string | null;
}

export interface LinkMetadata {
  title?: string | null;
  channel?: string | null;
  duration?: number | null;
  isPlaylist?: boolean;
  playlistCount?: number | null;
  uploadDate?: string | null;
}

