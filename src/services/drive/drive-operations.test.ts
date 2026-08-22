import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  uploadToDrive,
  downloadFromDrive,
  listFiles,
  deleteFromDrive,
} from './drive-operations';
import * as driveFolders from './drive-folders';

describe('drive-operations service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists files with pagination handling', async () => {
    // 1st page: 2 files + nextPageToken
    // 2nd page: 1 file + no token
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ id: 'f1', name: 'File 1' }, { id: 'f2', name: 'File 2' }],
          nextPageToken: 'token_page_2',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ id: 'f3', name: 'File 3' }],
        }),
      } as Response);

    const files = await listFiles('mock_token', 'folder_123');
    expect(files).toHaveLength(3);
    expect(files.map((f) => f.id)).toEqual(['f1', 'f2', 'f3']);
  });

  it('deletes file from Drive and ignores 404 (already deleted)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'File not found',
    } as Response);

    // Should not throw on 404
    await expect(deleteFromDrive('token', 'f_non_existent')).resolves.toBeUndefined();
  });

  it('uploads file using XMLHttpRequest and resolves fileId on success', async () => {
    vi.spyOn(driveFolders, 'getOrCreateAppFolder').mockResolvedValue('app_root_123');

    // Mock fetch for metadata creation
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'new_drive_file_id' }),
    } as Response);

    class MockUploadXHR {
      status = 200;
      upload = { onprogress: null as any };
      onload: any = null;
      onerror: any = null;
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn(function (this: any) {
        this.status = 200;
        this.onload?.();
      });
    }

    (global as any).XMLHttpRequest = MockUploadXHR;

    const fileId = await uploadToDrive('token', 'test.enc', new ArrayBuffer(8), 'root');
    expect(fileId).toBe('new_drive_file_id');
  });

  it('downloads file using XMLHttpRequest and returns ArrayBuffer', async () => {
    const mockBuffer = new ArrayBuffer(16);

    class MockDownloadXHR {
      status = 200;
      response = mockBuffer;
      responseType = '';
      onload: any = null;
      onerror: any = null;
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn(function (this: any) {
        this.status = 200;
        this.onload?.();
      });
    }

    (global as any).XMLHttpRequest = MockDownloadXHR;

    const buffer = await downloadFromDrive('token', 'download_file_id');
    expect(buffer).toBe(mockBuffer);
  });
});
