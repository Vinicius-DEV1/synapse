export interface DriveToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  expires_at?: number;
}

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  mimeType?: string;
}

export interface DriveStorageUsage {
  total: number;
  modules: {
    library: { size: number; files: DriveFile[] };
    photos: { size: number; files: DriveFile[] };
    videos: { size: number; files: DriveFile[] };
    lofi: { size: number; files: DriveFile[] };
    others: { size: number; files: DriveFile[] };
  };
}
