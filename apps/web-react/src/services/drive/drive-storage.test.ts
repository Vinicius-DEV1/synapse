import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDriveStorageUsage } from './drive-storage';
import * as driveAuth from './drive-auth';
import * as driveFolders from './drive-folders';
import * as driveOps from './drive-operations';

describe('drive-storage service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when no valid access token is present', async () => {
    vi.spyOn(driveAuth, 'getValidAccessToken').mockResolvedValue(null);
    const usage = await getDriveStorageUsage();
    expect(usage).toBeNull();
  });

  it('categorizes storage size by module accurately', async () => {
    vi.spyOn(driveAuth, 'getValidAccessToken').mockResolvedValue('valid_token');
    vi.spyOn(driveFolders, 'getOrCreateAppFolder').mockResolvedValue('app_root');
    vi.spyOn(driveFolders, 'getOrCreatePhotosFolder').mockResolvedValue('photos_folder');
    vi.spyOn(driveFolders, 'getOrCreateLofiFolder').mockResolvedValue('lofi_folder');

    const mockMainFiles = [
      { id: '1', name: 'Caderno_book1.enc', size: '1000', mimeType: 'application/octet-stream' },
      { id: '2', name: 'lecture.mp4', size: '5000', mimeType: 'video/mp4' },
      { id: '3', name: 'notes_backup.json', size: '200', mimeType: 'application/json' },
    ];

    const mockPhotoFiles = [
      { id: '4', name: 'photo1.jpg', size: '3000', mimeType: 'image/jpeg' },
    ];

    const mockLofiFiles = [
      { id: '5', name: 'rain.mp3', size: '2000', mimeType: 'audio/mp3' },
    ];

    vi.spyOn(driveOps, 'listFiles').mockImplementation(async (_token, folderId) => {
      if (folderId === 'app_root') return mockMainFiles;
      if (folderId === 'photos_folder') return mockPhotoFiles;
      if (folderId === 'lofi_folder') return mockLofiFiles;
      return [];
    });

    const usage = await getDriveStorageUsage();
    expect(usage).not.toBeNull();
    expect(usage!.modules.library.size).toBe(1000);
    expect(usage!.modules.videos.size).toBe(5000);
    expect(usage!.modules.photos.size).toBe(3000);
    expect(usage!.modules.lofi.size).toBe(2000);
    expect(usage!.modules.others.size).toBe(200);
    expect(usage!.total).toBe(11200);
  });
});
