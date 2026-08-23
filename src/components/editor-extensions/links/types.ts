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
  showNotes: boolean;
  watched?: boolean;
  color?: string;
}

export interface LinkMetadata {
  title?: string | null;
  channel?: string | null;
  duration?: number | null;
  isPlaylist?: boolean;
  uploadDate?: string | null;
}
