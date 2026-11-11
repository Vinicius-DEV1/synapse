import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getOrCreateAppFolder,
  getOrCreatePhotosFolder,
  getOrCreateLofiFolder,
  APP_FOLDER_NAME,
} from './drive-folders';

describe('drive-folders service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns existing app folder id if found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        files: [{ id: 'existing_app_folder_123', name: APP_FOLDER_NAME }],
      }),
    } as Response);

    const folderId = await getOrCreateAppFolder('mock_access_token');
    expect(folderId).toBe('existing_app_folder_123');
  });

  it('creates app folder if not found', async () => {
    // 1st fetch: query returns empty
    // 2nd fetch: POST creates folder
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new_created_folder_456' }),
      } as Response);

    const folderId = await getOrCreateAppFolder('mock_access_token');
    expect(folderId).toBe('new_created_folder_456');
  });

  it('creates or gets photos and lofi subfolders under parent folder', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [{ id: 'photos_folder_id' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [{ id: 'lofi_folder_id' }] }),
      } as Response);

    const photosId = await getOrCreatePhotosFolder('token', 'parent_123');
    expect(photosId).toBe('photos_folder_id');

    const lofiId = await getOrCreateLofiFolder('token', 'parent_123');
    expect(lofiId).toBe('lofi_folder_id');
  });
});
